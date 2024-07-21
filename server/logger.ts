/* eslint-disable no-console */
import { Client as ESClient } from "@elastic/elasticsearch";
import os from "os";
import { env } from "./env";

type Logger = {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
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
  const index = `${indexNamespace}_logs`;

  const logsBuffer: Record<string, unknown>[] = [];

  await initializeElasticSearch(client, index);

  function flushLogs() {
    if (logsBuffer.length === 0) {
      return;
    }

    client
      .bulk({
        operations: logsBuffer.flatMap((log) => [
          { index: { _index: index } },
          log,
        ]),
      })
      .catch((error) => {
        console.error("Error sending logs to ElasticSearch", error);
      });

    logsBuffer.length = 0;
  }

  function addLog(level: string, message: string) {
    logsBuffer.push({
      hostname,
      timestamp: Date.now(),
      level,
      message,
    });

    if (logsBuffer.length >= 100) {
      flushLogs();
    }
  }

  const interval = setInterval(() => {
    flushLogs();
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
      clearInterval(interval);
    },
  };
}

async function initializeElasticSearch(client: ESClient, index: string) {
  const properties = {
    hostname: {
      type: "keyword",
    },
    level: {
      type: "keyword",
    },
    message: {
      type: "text",
    },
    timestamp: {
      type: "date",
    },
  } as const;

  if (await client.indices.exists({ index })) {
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
