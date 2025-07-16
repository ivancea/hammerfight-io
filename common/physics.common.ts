import { ELASTICITY, FRICTION_CONSTANT } from "./physics.constants";
import { add, clampMagnitude, magnitude, multiply, Vector, withMagnitude } from "./vector";

type EntityWithPosition = {
  position: Vector;
};

type EntityWithVelocity = {
  velocity: Vector;
};

export type CircleCollider = EntityWithPosition &
  EntityWithVelocity & {
    radius: number;
    weight: number;
  };

export type RectangleCollider = EntityWithPosition &
  EntityWithVelocity & {
    width: number;
    length: number;
    rotation: number;
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

/**
 * Helper function to rotate a point around origin
 */
function rotatePoint(point: Vector, angle: number): Vector {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

/**
 * Gets the corners of a rectangle based on its center position, dimensions, and rotation
 * Returns an array of 4 vectors representing the corners
 */
function getRectangleCorners(rect: RectangleCollider): [Vector, Vector, Vector, Vector] {
  const halfWidth = rect.width / 2;
  const halfLength = rect.length / 2;

  // Create corner points (unrotated)
  const corners = [
    { x: -halfLength, y: -halfWidth },
    { x: halfLength, y: -halfWidth },
    { x: halfLength, y: halfWidth },
    { x: -halfLength, y: halfWidth },
  ];

  // Rotate corners and translate to rectangle position
  return corners.map((corner) => {
    const rotated = rotatePoint(corner, rect.rotation);
    return {
      x: rotated.x + rect.position.x,
      y: rotated.y + rect.position.y,
    };
  }) as [Vector, Vector, Vector, Vector];
}

/**
 * Projects a shape onto an axis
 * @returns [min, max] projection values
 */
function projectShapeOntoAxis(points: Vector[], axis: Vector): [number, number] {
  let min = Number.MAX_VALUE;
  let max = -Number.MAX_VALUE;

  for (const point of points) {
    // Dot product gives the projection of the point onto the axis
    const projection = point.x * axis.x + point.y * axis.y;
    min = Math.min(min, projection);
    max = Math.max(max, projection);
  }

  return [min, max];
}

/**
 * Checks for collision between a circle and a rectangle
 * Uses the Separating Axis Theorem (SAT)
 */
export function handleCircleRectangleCollision(
  circle: CircleCollider,
  rectangle: RectangleCollider,
  elapsedTime: number,
): [number, number] {
  // Get the rectangle corners
  const rectCorners = getRectangleCorners(rectangle);
  // Get the rectangle's local axes (normal to each edge)
  const axes = [
    // Edge 1 axis
    {
      x: rectCorners[1].y - rectCorners[0].y,
      y: -(rectCorners[1].x - rectCorners[0].x),
    },
    // Edge 2 axis
    {
      x: rectCorners[2].y - rectCorners[1].y,
      y: -(rectCorners[2].x - rectCorners[1].x),
    },
  ];

  // Normalize the axes
  for (const axis of axes) {
    const axisLength = magnitude(axis);
    axis.x /= axisLength;
    axis.y /= axisLength;
  }
  // Add axis from circle to closest point on rectangle (needed for circle collision)
  const closestPoint = findClosestPointOnRectangle(circle.position, rectangle);
  const circleToClosestAxis = {
    x: closestPoint.x - circle.position.x,
    y: closestPoint.y - circle.position.y,
  };

  if (magnitude(circleToClosestAxis) > 0) {
    const axisLength = magnitude(circleToClosestAxis);
    axes.push({
      x: circleToClosestAxis.x / axisLength,
      y: circleToClosestAxis.y / axisLength,
    });
  }
  // Check for overlap on each axis
  let minOverlap = Number.MAX_VALUE;
  let smallestAxis = { x: 0, y: 0 };

  for (const axis of axes) {
    // Project rectangle onto axis
    const [rectMin, rectMax] = projectShapeOntoAxis(rectCorners, axis);

    // Project circle onto axis
    const circleCenter = circle.position.x * axis.x + circle.position.y * axis.y;
    const [circleMin, circleMax] = [circleCenter - circle.radius, circleCenter + circle.radius];

    // Test for overlap
    const overlap = Math.min(rectMax, circleMax) - Math.max(rectMin, circleMin);
    if (overlap < 0) {
      // No collision detected (separating axis found)
      return [0, 0];
    }

    // Keep track of smallest overlap
    if (overlap < minOverlap) {
      minOverlap = overlap;
      smallestAxis = axis;
    }
  }
  // If we get here, there is a collision! Calculate the push vectors
  // Determine the direction to push the circle away from the rectangle
  let pushDirection: Vector;

  // Check if the circle center is inside the rectangle
  if (isPointInRectangle(circle.position, rectangle)) {
    // Circle center is inside the rectangle, use the smallest axis
    pushDirection = smallestAxis;
  } else {
    // Circle center is outside the rectangle, push away from the closest point
    pushDirection = {
      x: circle.position.x - closestPoint.x,
      y: circle.position.y - closestPoint.y,
    };

    const pushLength = magnitude(pushDirection);
    if (pushLength > 0) {
      pushDirection = {
        x: pushDirection.x / pushLength,
        y: pushDirection.y / pushLength,
      };
    } else {
      // Fallback in case of numerical issues
      pushDirection = smallestAxis;
    }
  }

  // Calculate push vectors for both objects
  const circlePushVector = multiply(pushDirection, minOverlap);
  const rectanglePushVector = multiply(pushDirection, -minOverlap);

  // Apply position changes
  const totalWeight = circle.weight + rectangle.weight;
  const circleWeightRatio = circle.weight / totalWeight;
  const rectangleWeightRatio = rectangle.weight / totalWeight;

  // Update positions
  circle.position = add(circle.position, multiply(circlePushVector, rectangleWeightRatio));
  rectangle.position = add(rectangle.position, multiply(rectanglePushVector, circleWeightRatio));

  // Update velocities (apply elasticity)
  circle.velocity = add(
    circle.velocity,
    multiply(circlePushVector, (ELASTICITY * rectangleWeightRatio) / elapsedTime),
  );

  rectangle.velocity = add(
    rectangle.velocity,
    multiply(rectanglePushVector, (ELASTICITY * circleWeightRatio) / elapsedTime),
  );

  const force = minOverlap;
  return [force * rectangleWeightRatio, force * circleWeightRatio];
}

/**
 * Finds the closest point on a rectangle to a given point
 */
function findClosestPointOnRectangle(point: Vector, rect: RectangleCollider): Vector {
  // Translate point into rectangle's local coordinate system
  const localPoint = {
    x: point.x - rect.position.x,
    y: point.y - rect.position.y,
  };

  // Rotate point to align with rectangle axes
  const rotatedPoint = rotatePoint(localPoint, -rect.rotation);

  // Clamp to rectangle bounds
  const halfLength = rect.length / 2;
  const halfWidth = rect.width / 2;
  const clampedPoint = {
    x: Math.max(-halfLength, Math.min(halfLength, rotatedPoint.x)),
    y: Math.max(-halfWidth, Math.min(halfWidth, rotatedPoint.y)),
  };

  // Rotate back and translate to world coordinates
  const rotatedClamped = rotatePoint(clampedPoint, rect.rotation);
  return {
    x: rotatedClamped.x + rect.position.x,
    y: rotatedClamped.y + rect.position.y,
  };
}

/**
 * Checks if a point is inside a rectangle
 */
function isPointInRectangle(point: Vector, rect: RectangleCollider): boolean {
  // Translate point into rectangle's local coordinate system
  const localPoint = {
    x: point.x - rect.position.x,
    y: point.y - rect.position.y,
  };

  // Rotate point to align with rectangle axes
  const rotatedPoint = rotatePoint(localPoint, -rect.rotation);

  // Check if the point is within the rectangle bounds
  const halfLength = rect.length / 2;
  const halfWidth = rect.width / 2;

  return (
    rotatedPoint.x >= -halfLength &&
    rotatedPoint.x <= halfLength &&
    rotatedPoint.y >= -halfWidth &&
    rotatedPoint.y <= halfWidth
  );
}

/**
 * Handles collision between a rectangle and the room boundaries
 */
export function handleRectangleCollisionWithLimits(
  collider: RectangleCollider,
  width: number,
  height: number,
  elapsedTime: number,
) {
  const corners = getRectangleCorners(collider);
  const pushVector = { x: 0, y: 0 };

  // Check each corner against the boundaries
  for (const corner of corners) {
    // X boundaries
    if (corner.x < 0) {
      pushVector.x = Math.max(pushVector.x, -corner.x);
    } else if (corner.x > width) {
      pushVector.x = Math.min(pushVector.x, width - corner.x);
    }

    // Y boundaries
    if (corner.y < 0) {
      pushVector.y = Math.max(pushVector.y, -corner.y);
    } else if (corner.y > height) {
      pushVector.y = Math.min(pushVector.y, height - corner.y);
    }
  }

  // Apply the push vector if any boundary was crossed
  if (pushVector.x !== 0 || pushVector.y !== 0) {
    collider.position = add(collider.position, pushVector);
    collider.velocity = add(collider.velocity, multiply(pushVector, ELASTICITY / elapsedTime));
  }
}

export function applyFriction(entity: EntityWithVelocity, elapsedTime: number) {
  entity.velocity = multiply(entity.velocity, Math.pow(FRICTION_CONSTANT, elapsedTime));
}
