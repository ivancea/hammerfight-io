/* eslint-disable no-console */
import { Client as ESClient } from "@elastic/elasticsearch";
import {
  MappingProperty,
  MappingTypeMapping,
} from "@elastic/elasticsearch/lib/api/types";
import os from "os";
import {
  BaseLogger,
  Extra,
  InternalLogger,
  LOGGER_MODULE,
  StatsRequest,
} from "./logger.base";

export class ElasticSearchLogger extends BaseLogger {
  readonly bufferLimit = 1000;
  readonly hostname: string;

  readonly logsBuffer: Record<string, unknown>[] = [];
  readonly statsBuffer: Record<string, unknown>[] = [];

  autoStatsBuffer: Record<string, StatsRequest[]> = {};

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
      this.flushStats();
    }, 10_000);
  }

  static async create(
    cloudId: string,
    apiKey: string,
    indexNamespace: string,
    createIndices: boolean,
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

    if (createIndices) {
      await initializeElasticSearch(client, logsIndex, statsIndex);
    }

    return new ElasticSearchLogger(client, logsIndex, statsIndex);
  }

  info(message: string, extra?: Extra) {
    this.addLog("info", message, extra);
  }

  warn(message: string, extra?: Extra) {
    this.addLog("warn", message, extra);
  }

  error(message: string, extra?: Extra) {
    this.addLog("error", message, extra);
  }

  stats(statsRequest: StatsRequest) {
    const key = `${statsRequest.name}__${statsRequest.extra ? JSON.stringify(statsRequest.extra) : ""}--${statsRequest.unit}`;
    const existingAutoStats = this.autoStatsBuffer[key];

    if (!existingAutoStats) {
      this.autoStatsBuffer[key] = [statsRequest];
      return;
    }

    existingAutoStats.push(statsRequest);

    if (existingAutoStats.length >= 500) {
      const stats = statsFrom(existingAutoStats);
      this.addStats(statsRequest, stats);
      delete this.autoStatsBuffer[key];
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
      .then((response) => {
        if (response.errors) {
          console.error(
            `Error sending logs to ElasticSearch index ${index}`,
            response.items
              .filter((item) => item.index?.error)
              .map((item) => item.index?.error?.reason),
          );
        }
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

  private flushStats() {
    for (const requests of Object.values(this.autoStatsBuffer)) {
      const firstRequest = requests[0];
      if (firstRequest) {
        const stats = statsFrom(requests);
        this.addStats(firstRequest, stats);
      }
    }

    this.autoStatsBuffer = {};

    this.flush(this.statsIndex, this.statsBuffer);
  }

  private addLog(
    level: "info" | "warn" | "error",
    message: string,
    extra?: Extra,
  ) {
    this.logsBuffer.push({
      hostname: this.hostname,
      module: LOGGER_MODULE,
      timestamp: Date.now(),
      level,
      message,
      extra,
    });

    if (this.logsBuffer.length >= this.bufferLimit) {
      this.flushLogs();
    }
  }

  private addStats(statsRequest: StatsRequest, stats: Stats) {
    this.statsBuffer.push({
      hostname: this.hostname,
      module: LOGGER_MODULE,
      timestamp: Date.now(),
      name: statsRequest.name,
      unit: statsRequest.unit,
      extra: statsRequest.extra,
      sum: stats.sum,
      avg: stats.avg,
      max: stats.max,
      min: stats.min,
      count: stats.count,
    });

    if (this.statsBuffer.length >= this.bufferLimit) {
      this.flushStats();
    }
  }
}

type Stats = {
  sum: number;
  avg: number;
  max: number;
  min: number;
  count: number;
};

function statsFrom(requests: StatsRequest[]): Stats {
  const values = requests.map((r) => r.value);
  const sum = values.reduce((a, b) => a + b, 0);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const avg = sum / values.length;

  return { sum, avg, max, min, count: values.length };
}

async function initializeElasticSearch(
  client: ESClient,
  logsIndex: string,
  statsIndex: string,
) {
  const commonProperties: MappingTypeMapping["properties"] = {
    hostname: {
      type: "keyword",
    },
    module: {
      type: "keyword",
    },
    timestamp: {
      type: "date",
    },
  };

  const extraMapping: MappingProperty = {
    properties: {
      player_ip: {
        type: "ip",
      },
      player_id: {
        type: "keyword",
      },
      room_id: {
        type: "keyword",
      },
    },
  };

  await createOrUpdateIndex(client, logsIndex, {
    ...commonProperties,
    level: {
      type: "keyword",
    },
    message: {
      type: "text",
    },
    extra: extraMapping,
  });

  await createOrUpdateIndex(client, statsIndex, {
    ...commonProperties,
    name: {
      type: "keyword",
    },
    unit: {
      type: "keyword",
    },
    extra: extraMapping,
    sum: {
      type: "double",
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
  properties: MappingTypeMapping["properties"],
) {
  if (await client.indices.exists({ index: index })) {
    console.log(`Updating mappings for ElasticSearch "${index}" index`);
    await client.indices.putMapping({
      index,
      dynamic: "strict",
      properties,
    });
  } else {
    console.log(`Creating ElasticSearch "${index}" index`);
    await client.indices.create({
      index,
      body: {
        mappings: {
          dynamic: "strict",
          properties,
        },
      },
    });
  }
}
