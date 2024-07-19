import { assert } from "../../common/errors";
import {
  divide,
  magnitude,
  multiply,
  Vector,
  withMagnitude,
} from "../../common/vector";
import { Context, getContext, getCurrentPlayer } from "../context";
import { getScreenSize } from "../graphics";
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
  const recalculateAcceleration = (
    mouseMovement: Vector,
    updateAcceleration: (newAcceleration: Vector) => void,
  ) => {
    const screenSize = getScreenSize();

    const baseSize = Math.min(screenSize.x, screenSize.y) * 0.05;

    const magnitudePercent = magnitude(mouseMovement) / baseSize;

    const maxPlayerAcceleration = getContext().room.maxPlayerAcceleration;

    const acceleration = withMagnitude(
      multiply(mouseMovement, magnitudePercent),
      maxPlayerAcceleration,
    );

    updateAcceleration(acceleration);
  };

  // Setup

  let lastManualAccelerationChange = 0;

  const onMouseMove = (event: MouseEvent) => {
    const mouseMovement = {
      x: event.movementX,
      y: event.movementY,
    };

    recalculateAcceleration(mouseMovement, updateAcceleration);
    lastManualAccelerationChange = Date.now();
  };

  element.addEventListener("mousemove", onMouseMove);
  element.addEventListener("click", () => {
    element.requestPointerLock();
  });
  element.requestPointerLock();

  const interval = setInterval(() => {
    assert(context === getContext(), "Context changed");

    if (lastManualAccelerationChange < Date.now() - 100) {
      updateAcceleration(divide(getCurrentPlayer().acceleration, 2));
    }
  }, 20);

  return {
    terminate() {
      clearInterval(interval);
      element.removeEventListener("mousemove", onMouseMove);
    },
  };
}
