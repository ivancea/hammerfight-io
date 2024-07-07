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

export function magnitude(v: Vector) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
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

export function clamp(
  vector: Vector,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
) {
  return {
    x: Math.min(maxX, Math.max(minX, vector.x)),
    y: Math.min(maxY, Math.max(minY, vector.y)),
  };
}