import { assert } from "../../common/errors";
import { magnitude, Vector, withMagnitude } from "../../common/vector";
import { Context, getContext } from "../context";
import { InputHandler } from "./inputHandler";

/**
 * Input handler that locks the mouse to the element, and tracks its movement.
 *
 * The acceleration with be calculated based on the mouse movement.
 */
export function makeRelativeMouseInput(
  context: Context,
  element: HTMLElement,
  updateAcceleration: (newAcceleration: Vector) => void,
): InputHandler {
  /**
   *
   */
  const accumulatedMovement: Vector = { x: 0, y: 0 };

  const updateMovement = (
    mouseMovement: Vector,
    updateAcceleration: (newAcceleration: Vector) => void,
  ) => {
    accumulatedMovement.x = mouseMovement.x + accumulatedMovement.x * 0.5;
    accumulatedMovement.y = mouseMovement.y + accumulatedMovement.y * 0.5;

    if (magnitude(accumulatedMovement) <= 1) {
      updateAcceleration(accumulatedMovement);
      return;
    }

    const sensitivity = 5;

    const magnitudePercent = magnitude(accumulatedMovement) / sensitivity;

    const maxPlayerAcceleration = getContext().room.maxPlayerAcceleration;

    const acceleration = withMagnitude(
      accumulatedMovement,
      Math.min(maxPlayerAcceleration, maxPlayerAcceleration * magnitudePercent),
    );

    updateAcceleration(acceleration);
  };

  // Setup

  const onMouseMove = (event: MouseEvent) => {
    const mouseMovement = {
      x: event.movementX,
      y: event.movementY,
    };

    updateMovement(mouseMovement, updateAcceleration);
  };

  element.addEventListener("mousemove", onMouseMove);
  element.addEventListener("click", () => {
    element.requestPointerLock();
  });
  element.requestPointerLock();

  const interval = setInterval(() => {
    assert(context === getContext(), "Context changed");

    updateMovement({ x: 0, y: 0 }, updateAcceleration);
  }, 50);

  return {
    terminate() {
      clearInterval(interval);
      element.removeEventListener("mousemove", onMouseMove);
    },
  };
}
