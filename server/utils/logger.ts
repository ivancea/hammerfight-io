/* eslint-disable no-console */
import { env } from "../env";
import { InternalLogger, Logger } from "./logger.base";
import { ConsoleLogger } from "./logger.console";
import { ElasticSearchLogger } from "./logger.elastic-search";

let logger: InternalLogger = new ConsoleLogger();

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
    newLogger = await ElasticSearchLogger.create(
      env.ELASTIC_CLOUD_ID,
      env.ELASTIC_API_KEY,
      env.ELASTIC_INDEX_NAMESPACE,
    );
  }

  logger = new ConsoleLogger(newLogger);
}
