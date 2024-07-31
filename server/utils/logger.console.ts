/* eslint-disable no-console */

import { BaseLogger, InternalLogger } from "./logger.base";

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

  stats(name: string, value: number) {
    this.otherLogger?.stats(name, value);
  }

  destroy() {
    this.otherLogger?.destroy();
  }
}
