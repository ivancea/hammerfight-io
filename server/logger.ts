/* eslint-disable no-console */
import { Client as ESClient } from "@elastic/elasticsearch";
import {
  MappingProperty,
  PropertyName,
} from "@elastic/elasticsearch/lib/api/types";
import os from "os";
import { env } from "./env";

const LOGGER_MODULE = "server";

type Logger = {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  /**
   * Measures a span of time, and logs it when it ends.
   */
  measureSpan(name: string, elapsedTime?: number): SpanMetrics;
  /**
   * Accumulates metrics, and flushes them as metrics: Average, max, min, count...
   *
   * The returned object should be reused.
   */
  stats(name: string, entriesPerFlush: number): StatsMetrics;
};

type SpanMetrics = {
  name: string;
  end: () => void;
};

type StatsMetrics = {
  name: string;
  add(value: number): void;
};

type InternalLogger = Logger & {
  destroy(): void;
};

let logger: InternalLogger = makeConsoleLogger();

export function getLogger(): Logger {
  return logger;
}

export async function initializeLogger() {
  logger.destroy();

  let newLogger: InternalLogger | undefined;

  if (
    env.ELASTIC_CLOUD_ID &&
    env.ELASTIC_API_KEY &&
    env.ELASTIC_INDEX_NAMESPACE
  ) {
    console.log("Using ElasticSearch logger");
    newLogger = await makeElasticSearchLogger(
      env.ELASTIC_CLOUD_ID,
      env.ELASTIC_API_KEY,
      env.ELASTIC_INDEX_NAMESPACE,
    );
  }

  logger = makeConsoleLogger(newLogger);
}

function makeConsoleLogger(otherLogger?: InternalLogger): InternalLogger {
  return {
    info(message: string) {
      console.log(message);
      otherLogger?.info(message);
    },
    warn(message: string) {
      console.warn(message);
      otherLogger?.warn(message);
    },
    error(message: string) {
      console.error(message);
      otherLogger?.error(message);
    },
    destroy() {
      otherLogger?.destroy();
    },
    measureSpan(name: string, elapsedTime?: number) {
      return (
        otherLogger?.measureSpan(name, elapsedTime) ?? {
          name,
          end() {
            // No-op for console logger
          },
        }
      );
    },
    stats(name: string, entriesPerFlush: number) {
      return (
        otherLogger?.stats(name, entriesPerFlush) ?? {
          name,
          add() {
            // No-op for console logger
          },
        }
      );
    },
  };
}

async function makeElasticSearchLogger(
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
  const hostname = os.hostname();
  const logsIndex = `${indexNamespace}_logs`;
  const spansIndex = `${indexNamespace}_spans`;
  const statsIndex = `${indexNamespace}_stats`;
  const bufferLimit = 1000;

  const logsBuffer: Record<string, unknown>[] = [];
  const spansBuffer: Record<string, unknown>[] = [];
  const statsBuffer: Record<string, unknown>[] = [];

  await initializeElasticSearch(client, logsIndex, spansIndex, statsIndex);

  function flush(index: string, buffer: Record<string, unknown>[]) {
    if (buffer.length === 0) {
      return;
    }

    client
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

  function flushLogs() {
    flush(logsIndex, logsBuffer);
  }

  function flushSpans() {
    // Spans add too many records. Ignoring them for now
    // flush(spansIndex, spansBuffer);
  }

  function flushStats() {
    flush(statsIndex, statsBuffer);
  }

  function addLog(level: "info" | "warn" | "error", message: string) {
    logsBuffer.push({
      hostname,
      module: LOGGER_MODULE,
      timestamp: Date.now(),
      level,
      message,
    });

    if (logsBuffer.length >= bufferLimit) {
      flushLogs();
    }
  }

  function addSpan(name: string, startTime: number, endTime: number) {
    spansBuffer.push({
      hostname,
      module: LOGGER_MODULE,
      timestamp: Date.now(),
      name,
      startTime,
      endTime,
      elapsedTimeMillis: endTime - startTime,
    });

    if (spansBuffer.length >= bufferLimit) {
      flushSpans();
    }
  }

  function addStats(
    name: string,
    avg: number,
    max: number,
    min: number,
    count: number,
  ) {
    statsBuffer.push({
      hostname,
      module: LOGGER_MODULE,
      timestamp: Date.now(),
      name,
      avg,
      max,
      min,
      count,
    });

    if (statsBuffer.length >= bufferLimit) {
      flushStats();
    }
  }

  const interval = setInterval(() => {
    flushLogs();
    flushSpans();
    flushStats();
  }, 5000);

  return {
    info(message: string) {
      addLog("info", message);
    },
    warn(message: string) {
      addLog("warn", message);
    },
    error(message: string) {
      addLog("error", message);
    },
    destroy() {
      flushLogs();
      flushSpans();
      flushStats();
      clearInterval(interval);
    },
    measureSpan(name: string, elapsedTime?: number) {
      const currentTime = Date.now();

      if (elapsedTime) {
        addSpan(name, currentTime - elapsedTime, currentTime);

        return {
          name,
          end() {},
        };
      }

      let closed = false;

      return {
        name,
        end() {
          if (closed) {
            throw new Error("Span already closed");
          }
          closed = true;
          addSpan(name, currentTime, Date.now());
        },
      };
    },
    stats(name: string, entriesPerFlush: number) {
      const metrics: number[] = [];
      return {
        name,
        add(value: number) {
          metrics.push(value);

          if (metrics.length >= entriesPerFlush) {
            const sum = metrics.reduce((a, b) => a + b, 0);
            const max = Math.max(...metrics);
            const min = Math.min(...metrics);
            addStats(name, sum / metrics.length, max, min, metrics.length);
            metrics.length = 0;
          }
        },
      };
    },
  };
}

async function initializeElasticSearch(
  client: ESClient,
  logsIndex: string,
  spansIndex: string,
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

  await createOrUpdateIndex(client, spansIndex, {
    ...commonProperties,
    name: {
      type: "keyword",
    },
    startTime: {
      type: "date",
    },
    endTime: {
      type: "date",
    },
    elapsedTimeMillis: {
      type: "long",
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
