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
  measureSpan(name: string, elapsedTime?: number): SpanMetrics;
};

type SpanMetrics = {
  name: string;
  end: () => void;
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
  const bufferLimit = 1000;

  const logsBuffer: Record<string, unknown>[] = [];
  const spansBuffer: Record<string, unknown>[] = [];

  await initializeElasticSearch(client, logsIndex, spansIndex);

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

  function addLog(level: "info" | "warn" | "error", message: string) {
    logsBuffer.push({
      hostname,
      module: LOGGER_MODULE,
      timestamp: Date.now(),
      level,
      message,
    });

    if (logsBuffer.length >= bufferLimit) {
      flush(logsIndex, logsBuffer);
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
      flush(spansIndex, spansBuffer);
    }
  }

  const interval = setInterval(() => {
    flush(logsIndex, logsBuffer);
    flush(spansIndex, spansBuffer);
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
      flush(logsIndex, logsBuffer);
      flush(spansIndex, spansBuffer);
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
  };
}

async function initializeElasticSearch(
  client: ESClient,
  logsIndex: string,
  spansIndex: string,
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
