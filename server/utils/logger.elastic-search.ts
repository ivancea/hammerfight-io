/* eslint-disable no-console */
import { Client as ESClient } from "@elastic/elasticsearch";
import {
  MappingProperty,
  PropertyName,
} from "@elastic/elasticsearch/lib/api/types";
import os from "os";
import { BaseLogger, InternalLogger, LOGGER_MODULE } from "./logger.base";

export class ElasticSearchLogger extends BaseLogger {
  readonly bufferLimit = 1000;
  readonly hostname: string;

  readonly logsBuffer: Record<string, unknown>[] = [];
  readonly statsBuffer: Record<string, unknown>[] = [];

  autoStatsBuffer: Record<string, number[]> = {};

  readonly interval: NodeJS.Timeout;

  constructor(
    private client: ESClient,
    private logsIndex: string,
    private statsIndex: string,
  ) {
    super();

    this.hostname = os.hostname();

    this.interval = setInterval(() => {
      this.flushLogs();
      this.flushAutoStats();
      this.flushStats();
    }, 5000);
  }

  static async create(
    cloudId: string,
    apiKey: string,
    indexNamespace: string,
  ): Promise<InternalLogger> {
    const client = new ESClient({
      cloud: {
        id: cloudId,
      },
      auth: {
        apiKey,
      },
    });
    const logsIndex = `${indexNamespace}_logs`;
    const statsIndex = `${indexNamespace}_stats`;

    await initializeElasticSearch(client, logsIndex, statsIndex);

    return new ElasticSearchLogger(client, logsIndex, statsIndex);
  }

  info(message: string) {
    this.addLog("info", message);
  }

  warn(message: string) {
    this.addLog("warn", message);
  }

  error(message: string) {
    this.addLog("error", message);
  }

  stats(name: string, value: number) {
    const existingAutoStats = this.autoStatsBuffer[name];

    if (!existingAutoStats) {
      this.autoStatsBuffer[name] = [value];
      return;
    }

    existingAutoStats.push(value);

    if (existingAutoStats.length >= 500) {
      const stats = statsFrom(existingAutoStats);
      this.addStats(name, stats.avg, stats.max, stats.min, stats.count);
      delete this.autoStatsBuffer[name];
    }
  }

  destroy() {
    this.flushLogs();
    this.flushStats();
    clearInterval(this.interval);
  }

  private flush(index: string, buffer: Record<string, unknown>[]) {
    if (buffer.length === 0) {
      return;
    }

    this.client
      .bulk({
        operations: buffer.flatMap((log) => [
          { index: { _index: index } },
          log,
        ]),
      })
      .catch((error: unknown) => {
        console.error(
          `Error sending logs to ElasticSearch index ${index}`,
          error,
        );
      });

    buffer.length = 0;
  }

  private flushLogs() {
    this.flush(this.logsIndex, this.logsBuffer);
  }

  private flushAutoStats() {
    for (const [name, values] of Object.entries(this.autoStatsBuffer)) {
      if (values.length > 0) {
        const stats = statsFrom(values);
        this.addStats(name, stats.avg, stats.max, stats.min, stats.count);
      }
    }

    this.autoStatsBuffer = {};
  }

  private flushStats() {
    this.flush(this.statsIndex, this.statsBuffer);
  }

  private addLog(level: "info" | "warn" | "error", message: string) {
    this.logsBuffer.push({
      hostname: this.hostname,
      module: LOGGER_MODULE,
      timestamp: Date.now(),
      level,
      message,
    });

    if (this.logsBuffer.length >= this.bufferLimit) {
      this.flushLogs();
    }
  }

  private addStats(
    name: string,
    avg: number,
    max: number,
    min: number,
    count: number,
  ) {
    this.statsBuffer.push({
      hostname: this.hostname,
      module: LOGGER_MODULE,
      timestamp: Date.now(),
      name,
      avg,
      max,
      min,
      count,
    });

    if (this.statsBuffer.length >= this.bufferLimit) {
      this.flushStats();
    }
  }
}

function statsFrom(values: number[]) {
  const sum = values.reduce((a, b) => a + b, 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = sum / values.length;

  return { avg, max, min, count: values.length };
}

async function initializeElasticSearch(
  client: ESClient,
  logsIndex: string,
  statsIndex: string,
) {
  const commonProperties = {
    hostname: {
      type: "keyword",
    },
    module: {
      type: "keyword",
    },
    timestamp: {
      type: "date",
    },
  } as const;

  await createOrUpdateIndex(client, logsIndex, {
    ...commonProperties,
    level: {
      type: "keyword",
    },
    message: {
      type: "text",
    },
  });

  await createOrUpdateIndex(client, statsIndex, {
    ...commonProperties,
    name: {
      type: "keyword",
    },
    avg: {
      type: "double",
    },
    max: {
      type: "double",
    },
    min: {
      type: "double",
    },
    count: {
      type: "integer",
    },
  });
}

async function createOrUpdateIndex(
  client: ESClient,
  index: string,
  properties: Record<PropertyName, MappingProperty>,
) {
  if (await client.indices.exists({ index: index })) {
    console.log(`Updating mappings for ElasticSearch "${index}" index`);
    await client.indices.putMapping({
      index,
      properties,
    });
  } else {
    console.log(`Creating ElasticSearch "${index}" index`);
    await client.indices.create({
      index,
      body: {
        mappings: {
          properties,
        },
      },
    });
  }
}
