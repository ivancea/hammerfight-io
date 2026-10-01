/* eslint-disable no-console */
import { env } from "../env";
import { InternalLogger, Logger } from "./logger.base";
import { ConsoleLogger } from "./logger.console";
import { ElasticSearchCloudLogger } from "./logger.elastic-search.cloud";
import { ElasticSearchServerlessLogger } from "./logger.elastic-search.serverless";
import { MultiLogger } from "./logger.multi";

let logger: InternalLogger = new ConsoleLogger();
let loggerGeneration = 0;
const retryTimers = new Set<NodeJS.Timeout>();
const retryIntervalMs = 5 * 60_000;

export function getLogger(): Logger {
  return logger;
}

export function initializeLogger() {
  const generation = ++loggerGeneration;
  for (const timer of retryTimers) {
    clearTimeout(timer);
  }
  retryTimers.clear();
  logger.destroy();

  const loggers: InternalLogger[] = [new ConsoleLogger()];
  logger = new MultiLogger(loggers);

  async function addLogger(name: string, create: () => Promise<InternalLogger>) {
    try {
      const newLogger = await create();
      if (generation !== loggerGeneration) {
        newLogger.destroy();
        return;
      }

      loggers.push(newLogger);
      console.log(`Using ${name} logger`);
    } catch (error) {
      if (generation !== loggerGeneration) {
        return;
      }

      console.error(
        `Failed to initialize ${name} logger; retrying in 5 minutes:`,
        error instanceof Error ? error.message : String(error),
      );
      const timer = setTimeout(() => {
        retryTimers.delete(timer);
        void addLogger(name, create);
      }, retryIntervalMs);
      timer.unref();
      retryTimers.add(timer);
    }
  }

  const cloudId = env.ELASTIC_CLOUD_ID;
  const cloudApiKey = env.ELASTIC_CLOUD_API_KEY;
  const cloudIndexNamespace = env.ELASTIC_CLOUD_INDEX_NAMESPACE;
  if (cloudId && cloudApiKey && cloudIndexNamespace) {
    void addLogger("ElasticSearch Cloud", () =>
      ElasticSearchCloudLogger.create(
        cloudId,
        cloudApiKey,
        cloudIndexNamespace,
        env.ELASTIC_CREATE_INDICES,
      ),
    );
  }

  const serverlessId = env.ELASTIC_SERVERLESS_ID;
  const serverlessApiKey = env.ELASTIC_SERVERLESS_API_KEY;
  const serverlessIndexNamespace = env.ELASTIC_SERVERLESS_INDEX_NAMESPACE;
  if (serverlessId && serverlessApiKey && serverlessIndexNamespace) {
    void addLogger("ElasticSearch Serverless", () =>
      ElasticSearchServerlessLogger.create(
        serverlessId,
        serverlessApiKey,
        serverlessIndexNamespace,
        env.ELASTIC_CREATE_INDICES,
      ),
    );
  }
}
