import { ELASTICITY } from "./physics.constants";
import { add, clampMagnitude, magnitude, multiply, Vector } from "./vector";

type CircleCollider = {
  position: Vector;
  velocity: Vector;
  radius: number;
  weight: number;
};

export function handleCirclesCollision(
  collider1: CircleCollider,
  collider2: CircleCollider,
) {
  const separationVector = {
    x: collider2.position.x - collider1.position.x,
    y: collider2.position.y - collider1.position.y,
  };

  const distance = magnitude(separationVector);
  const minDistance = collider1.radius + collider2.radius;

  if (distance > minDistance) {
    return;
  }

  const collider2PushVector = multiply(
    clampMagnitude(separationVector, minDistance - distance),
    2,
  );
  const collider1PushVector = multiply(collider2PushVector, -1);

  collider1.position = add(collider1.position, collider1PushVector);
  collider2.position = add(collider2.position, collider2PushVector);

  const totalWeight = collider1.weight + collider2.weight;

  const collider1WeightRatio = collider1.weight / totalWeight;
  const collider2WeightRatio = collider2.weight / totalWeight;

  collider1.velocity = add(
    collider1.velocity,
    multiply(collider1PushVector, ELASTICITY * collider2WeightRatio),
  );
  collider2.velocity = add(
    collider2.velocity,
    multiply(collider2PushVector, ELASTICITY * collider1WeightRatio),
  );
}
