export type Vector = {
  x: number;
  y: number;
};

export function add(vector: Vector, ...vectors: Vector[]) {
  return {
    x: vector.x + vectors.map((v) => v.x).reduce((a, b) => a + b, 0),
    y: vector.y + vectors.map((v) => v.y).reduce((a, b) => a + b, 0),
  };
}

export function subtract(v1: Vector, v2: Vector) {
  return {
    x: v1.x - v2.x,
    y: v1.y - v2.y,
  };
}

export function multiply(v: Vector, scalar: number) {
  return {
    x: v.x * scalar,
    y: v.y * scalar,
  };
}

export function divide(v: Vector, scalar: number) {
  return {
    x: v.x / scalar,
    y: v.y / scalar,
  };
}

export function invert(v: Vector) {
  return {
    x: -v.x,
    y: -v.y,
  };
}

export function magnitude(v: Vector) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function withMagnitude(vector: Vector, newMagnitude: number) {
  const vectorMagnitude = magnitude(vector);

  if (vectorMagnitude === 0) {
    return { x: newMagnitude, y: 0 };
  }

  return {
    x: (vector.x / vectorMagnitude) * newMagnitude,
    y: (vector.y / vectorMagnitude) * newMagnitude,
  };
}

export function interpolateMagnitude(
  vector: Vector,
  minSourceMagnitude: number,
  maxSourceMagnitude: number,
  minTargetMagnitude: number,
  maxTargetMagnitude: number,
) {
  const vectorMagnitude = magnitude(vector);

  if (vectorMagnitude >= maxSourceMagnitude) {
    return withMagnitude(vector, maxTargetMagnitude);
  }
  if (vectorMagnitude <= minSourceMagnitude) {
    return withMagnitude(vector, minTargetMagnitude);
  }

  const sourceMagnitudeRange = maxSourceMagnitude - minSourceMagnitude;
  const targetMagnitudeRange = maxTargetMagnitude - minTargetMagnitude;
  const magnitudePercent = (vectorMagnitude - minSourceMagnitude) / sourceMagnitudeRange;

  return withMagnitude(vector, minTargetMagnitude + targetMagnitudeRange * magnitudePercent);
}

export function clampMagnitude(vector: Vector, maxMagnitude: number) {
  const vectorMagnitude = magnitude(vector);

  if (vectorMagnitude <= maxMagnitude) {
    return vector;
  }

  return {
    x: (vector.x / vectorMagnitude) * maxMagnitude,
    y: (vector.y / vectorMagnitude) * maxMagnitude,
  };
}

export function clamp(vector: Vector, minX: number, maxX: number, minY: number, maxY: number) {
  return {
    x: Math.min(maxX, Math.max(minX, vector.x)),
    y: Math.min(maxY, Math.max(minY, vector.y)),
  };
}

/**
 * Rotates a vector by a given angle.
 *
 * @param vector The vector to rotate
 * @param angle The angle, in radians, to rotate. Positive for clockwise, negative for counter-clockwise
 * @returns The rotated vector
 */
export function rotate(vector: Vector, angle: number) {
  return {
    x: vector.x * Math.cos(angle) - vector.y * Math.sin(angle),
    y: vector.x * Math.sin(angle) + vector.y * Math.cos(angle),
  };
}
