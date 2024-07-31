export class StopWatch {
  lastHrTime: bigint;

  constructor() {
    this.lastHrTime = process.hrtime.bigint();
  }

  /**
   * Returns the time elapsed since initialization or the last call to `next`.
   * In milliseconds.
   */
  next() {
    const endHrTime = process.hrtime.bigint();
    const elapsedMillis = Number(endHrTime - this.lastHrTime) / 1_000_000;
    this.lastHrTime = endHrTime;
    return elapsedMillis;
  }
}
