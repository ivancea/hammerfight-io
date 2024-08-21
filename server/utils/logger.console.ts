/* eslint-disable no-console */

import { BaseLogger, Extra, InternalLogger, StatsRequest } from "./logger.base";

export class ConsoleLogger extends BaseLogger {
  constructor(private otherLogger?: InternalLogger) {
    super();
  }

  info(message: string, extra?: Extra) {
    console.log(message);
    this.otherLogger?.info(message, extra);
  }

  warn(message: string, extra?: Extra) {
    console.warn(message);
    this.otherLogger?.warn(message, extra);
  }

  error(message: string, extra?: Extra) {
    console.error(message);
    this.otherLogger?.error(message, extra);
  }

  stats(statsRequest: StatsRequest) {
    this.otherLogger?.stats(statsRequest);
  }

  destroy() {
    this.otherLogger?.destroy();
  }
}
