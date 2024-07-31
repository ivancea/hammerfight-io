import { StopWatch } from "./stopwatch";

export const LOGGER_MODULE = "server";

export type Logger = {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  /**
   * Accumulates metrics, and flushes them as metrics: Average, max, min, count...
   *
   * It accumulates metrics with the same name, and flushes them automatically.
   */
  stats(name: string, value: number): void;
  /**
   * Same as `stats`, but it measures the time it takes to execute the callback.
   */
  statsFunction<T>(name: string, callback: () => T): T;
};

export type StatsMetrics = {
  name: string;
  add(value: number): void;
};

export type InternalLogger = Logger & {
  destroy(): void;
};

export abstract class BaseLogger implements Logger {
  abstract info(message: string): void;

  abstract warn(message: string): void;

  abstract error(message: string): void;

  abstract stats(name: string, value: number): void;

  abstract destroy(): void;

  statsFunction<T>(name: string, callback: () => T): T {
    const stopWatch = new StopWatch();
    const result = callback();
    this.stats(name, stopWatch.next());
    return result;
  }
}
