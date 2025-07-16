import { Vector } from "./vector";

// Define our own EntityWithPosition to avoid import issues
type EntityWithPosition = {
  position: Vector;
};

/**
 * Extension for objects with angular velocity instead of linear velocity
 */
export type EntityWithAngularVelocity = {
  angularSpeed: number;
};

/**
 * Rectangle collider for objects that use angular speed instead of vector velocity
 */
export type AngularRectangleCollider = EntityWithPosition &
  EntityWithAngularVelocity & {
    width: number;
    length: number;
    rotation: number;
    weight: number;
    type?: string;
  };

/**
 * Apply angular friction to slow down rotation
 */
export function applyAngularFriction(
  entity: EntityWithAngularVelocity,
  frictionFactor: number,
  elapsedTime: number,
) {
  entity.angularSpeed *= Math.pow(frictionFactor, elapsedTime);
}

/**
 * Adapts a rectangular collider with angular speed to be used with physics functions expecting vector velocity
 */
export function adaptAngularRectangleToPhysics<T extends AngularRectangleCollider>(
  collider: T,
): T & { velocity: Vector } {
  // Create a temporary velocity vector for physics calculations
  const adjustedCollider = { ...collider };

  // For sword weapons, position should be at the center of the sword
  if (collider.type === "sword") {
    // Adjust the position to be at the midpoint of the sword
    const halfLength = collider.length / 2;
    adjustedCollider.position = {
      x: collider.position.x + Math.cos(collider.rotation) * halfLength,
      y: collider.position.y + Math.sin(collider.rotation) * halfLength,
    };
  }

  return {
    ...adjustedCollider,
    velocity: {
      x: Math.cos(collider.rotation) * collider.angularSpeed * 10,
      y: Math.sin(collider.rotation) * collider.angularSpeed * 10,
    },
  };
}
