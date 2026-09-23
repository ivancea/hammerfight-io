import { BaseLogger, Extra, InternalLogger, StatsRequest } from "./logger.base";

export class MultiLogger extends BaseLogger {
  constructor(private loggers: InternalLogger[]) {
    super();
  }

  info(message: string, extra?: Extra) {
    this.forEachLoggerSafe((logger) => {
      logger.info(message, extra);
    });
  }

  warn(message: string, extra?: Extra) {
    this.forEachLoggerSafe((logger) => {
      logger.warn(message, extra);
    });
  }

  error(message: string, extra?: Extra) {
    this.forEachLoggerSafe((logger) => {
      logger.error(message, extra);
    });
  }

  stats(statsRequest: StatsRequest) {
    this.forEachLoggerSafe((logger) => {
      logger.stats(statsRequest);
    });
  }

  destroy() {
    this.forEachLoggerSafe((logger) => {
      logger.destroy();
    });
  }

  private forEachLoggerSafe(callback: (logger: InternalLogger) => void) {
    this.loggers.forEach((logger) => {
      try {
        callback(logger);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error occurred in logger:", error);
      }
    });
  }
}
