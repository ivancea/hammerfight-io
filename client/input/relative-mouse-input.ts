import { assert } from "../../common/errors";
import { interpolateMagnitude, magnitude, Vector } from "../../common/vector";
import { Context, getContext } from "../context";
import { InputHandler } from "./input-handler";

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
   * A simple "weighted moving average" to smooth out the mouse movement.
   *
   * Useful to avoid changing the direction after a minimal mouse movement or vibration.
   */
  const accumulatedMovement: Vector = { x: 0, y: 0 };

  const updateMovement = (mouseMovement: Vector) => {
    accumulatedMovement.x = mouseMovement.x + accumulatedMovement.x * 0.5;
    accumulatedMovement.y = mouseMovement.y + accumulatedMovement.y * 0.5;

    if (magnitude(accumulatedMovement) <= 1) {
      updateAcceleration(accumulatedMovement);
      return;
    }

    const sensitivity = 5;

    const acceleration = interpolateMagnitude(
      accumulatedMovement,
      0,
      sensitivity,
      0,
      getContext().room.maxPlayerAcceleration,
    );

    updateAcceleration(acceleration);
  };

  // Setup

  const onMouseMove = (event: MouseEvent) => {
    const mouseMovement = {
      x: event.movementX,
      y: event.movementY,
    };

    updateMovement(mouseMovement);
  };

  element.addEventListener("mousemove", onMouseMove);
  element.addEventListener("click", () => {
    element.requestPointerLock();
  });
  element.requestPointerLock();

  const interval = setInterval(() => {
    assert(context === getContext(), "Context changed");

    updateMovement({ x: 0, y: 0 });
  }, 50);

  return {
    terminate() {
      clearInterval(interval);
      element.removeEventListener("mousemove", onMouseMove);
    },
  };
}
