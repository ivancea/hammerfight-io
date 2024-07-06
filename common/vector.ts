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

export function clampMagnitude(vector: Vector, maxMagnitude: number) {
  return {
    x: Math.min(Math.abs(vector.x), maxMagnitude) * Math.sign(vector.x),
    y: Math.min(Math.abs(vector.y), maxMagnitude) * Math.sign(vector.y),
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
