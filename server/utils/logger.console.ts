/* eslint-disable no-console */

import { BaseLogger, InternalLogger, StatsRequest } from "./logger.base";

export class ConsoleLogger extends BaseLogger {
  constructor(private otherLogger?: InternalLogger) {
    super();
  }

  info(message: string) {
    console.log(message);
    this.otherLogger?.info(message);
  }

  warn(message: string) {
    console.warn(message);
    this.otherLogger?.warn(message);
  }

  error(message: string) {
    console.error(message);
    this.otherLogger?.error(message);
  }

  stats(statsRequest: StatsRequest) {
    this.otherLogger?.stats(statsRequest);
  }

  destroy() {
    this.otherLogger?.destroy();
  }
}
