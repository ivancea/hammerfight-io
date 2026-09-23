/* eslint-disable no-console */
import { env } from "../env";
import { InternalLogger, Logger } from "./logger.base";
import { ConsoleLogger } from "./logger.console";
import { ElasticSearchLogger } from "./logger.elastic-search";
import { MultiLogger } from "./logger.multi";

let logger: InternalLogger = new ConsoleLogger();

export function getLogger(): Logger {
  return logger;
}

export async function initializeLogger() {
  logger.destroy();

  const loggers = [new ConsoleLogger()];

  if (env.ELASTIC_CLOUD_ID && env.ELASTIC_CLOUD_API_KEY && env.ELASTIC_CLOUD_INDEX_NAMESPACE) {
    console.log("Using ElasticSearch logger");
    loggers.push(
      await ElasticSearchLogger.create(
        env.ELASTIC_CLOUD_ID,
        env.ELASTIC_CLOUD_API_KEY,
        env.ELASTIC_CLOUD_INDEX_NAMESPACE,
        env.ELASTIC_CREATE_INDICES,
      ),
    );
  }

  logger = new MultiLogger(loggers);
}
