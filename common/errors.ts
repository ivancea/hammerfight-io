export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    console.error(message);

    throw new Error("Assertion error: " + message);
  }
}
