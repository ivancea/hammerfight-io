export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    console.error(message);

    throw new Error("Assertion error: " + message);
  }
}

export function assertNotNull<T>(
  value: T,
  message: string,
): asserts value is NonNullable<T> {
  assert(value != null, message);
}
