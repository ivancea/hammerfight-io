/* eslint-disable no-console */

import { BaseLogger, Extra, StatsRequest } from "./logger.base";

export class ConsoleLogger extends BaseLogger {
  info(message: string, extra?: Extra) {
    console.log(message);
  }

  warn(message: string, extra?: Extra) {
    console.warn(message);
  }

  error(message: string, extra?: Extra) {
    console.error(message);
  }

  stats(statsRequest: StatsRequest) {}

  destroy() {}
}
