import { StopWatch } from "./stopwatch";

export const LOGGER_MODULE = "server";

export type StatsUnit = "milliseconds" | "count";

export type StatsRequest = {
  name: string;
  unit: StatsUnit;
  extra?: string;
  value: number;
};

export type Logger = {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  /**
   * Accumulates metrics, and flushes them as metrics: Average, max, min, count...
   *
   * It accumulates metrics with the same name, and flushes them automatically.
   */
  stats(statsRequest: StatsRequest): void;
  /**
   * Same as `stats`, but it measures the time it takes to execute the callback.
   */
  statsFunction<T>(
    statsRequest: Omit<StatsRequest, "value">,
    callback: () => T,
  ): T;
};

export type InternalLogger = Logger & {
  destroy(): void;
};

export abstract class BaseLogger implements Logger {
  abstract info(message: string): void;

  abstract warn(message: string): void;

  abstract error(message: string): void;

  abstract stats(statsRequest: StatsRequest): void;

  abstract destroy(): void;

  statsFunction<T>(
    statsRequest: Omit<StatsRequest, "value">,
    callback: () => T,
  ): T {
    const stopWatch = new StopWatch();
    const result = callback();
    this.stats({ ...statsRequest, value: stopWatch.next() });
    return result;
  }
}
