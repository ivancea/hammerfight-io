import { ELASTICITY, FRICTION_CONSTANT } from "./physics.constants";
import { add, clampMagnitude, magnitude, multiply, Vector, withMagnitude } from "./vector";

type EntityWithPosition = {
  position: Vector;
};

type EntityWithVelocity = {
  velocity: Vector;
};

type CircleCollider = EntityWithPosition &
  EntityWithVelocity & {
    radius: number;
    weight: number;
  };

export function moveWithAcceleration(
  entity: EntityWithPosition & EntityWithVelocity,
  acceleration: Vector,
  maxSpeed: number,
  elapsedTime: number,
) {
  const newPosition = add(
    entity.position,
    multiply(entity.velocity, elapsedTime),
    multiply(acceleration, 0.5 * elapsedTime * elapsedTime),
  );
  const newVelocity = clampMagnitude(
    add(entity.velocity, multiply(acceleration, elapsedTime)),
    maxSpeed,
  );

  entity.position = newPosition;
  entity.velocity = newVelocity;
}

export function handleCirclesCollision(
  collider1: CircleCollider,
  collider2: CircleCollider,
  elapsedTime: number,
): [number, number] {
  return handleRawCirclesCollision(
    collider1,
    collider1.radius,
    collider1.weight,
    collider2,
    collider2.radius,
    collider2.weight,
    elapsedTime,
  );
}

export function handleRawCirclesCollision(
  entity1: EntityWithPosition & EntityWithVelocity,
  radius1: number,
  weight1: number,
  entity2: EntityWithPosition & EntityWithVelocity,
  radius2: number,
  weight2: number,
  elapsedTime: number,
): [number, number] {
  const separationVector = {
    x: entity2.position.x - entity1.position.x,
    y: entity2.position.y - entity1.position.y,
  };

  const distance = magnitude(separationVector);
  const minDistance = radius1 + radius2;

  if (distance > minDistance) {
    return [0, 0];
  }

  const collider2PushVector = multiply(withMagnitude(separationVector, minDistance - distance), 2);
  const collider1PushVector = multiply(collider2PushVector, -1);

  entity1.position = add(entity1.position, collider1PushVector);
  entity2.position = add(entity2.position, collider2PushVector);

  const totalWeight = weight1 + weight2;

  const collider1WeightRatio = weight1 / totalWeight;
  const collider2WeightRatio = weight2 / totalWeight;

  entity1.velocity = add(
    entity1.velocity,
    multiply(collider1PushVector, (ELASTICITY * collider2WeightRatio) / elapsedTime),
  );
  entity2.velocity = add(
    entity2.velocity,
    multiply(collider2PushVector, (ELASTICITY * collider1WeightRatio) / elapsedTime),
  );

  const force = minDistance - distance;
  return [force * collider2WeightRatio, force * collider1WeightRatio];
}

export function handleCircleCollisionWithLimits(
  collider: CircleCollider,
  width: number,
  height: number,
  elapsedTime: number,
) {
  const pushVector = { x: 0, y: 0 };

  if (collider.position.x - collider.radius < 0) {
    pushVector.x = collider.radius - collider.position.x;
  } else if (collider.position.x + collider.radius > width) {
    pushVector.x = width - collider.position.x - collider.radius;
  }

  if (collider.position.y - collider.radius < 0) {
    pushVector.y = collider.radius - collider.position.y;
  } else if (collider.position.y + collider.radius > height) {
    pushVector.y = height - collider.position.y - collider.radius;
  }

  collider.position = add(collider.position, pushVector);
  collider.velocity = add(collider.velocity, multiply(pushVector, ELASTICITY / elapsedTime));
}

export function applyFriction(entity: EntityWithVelocity, elapsedTime: number) {
  entity.velocity = multiply(entity.velocity, Math.pow(FRICTION_CONSTANT, elapsedTime));
}
