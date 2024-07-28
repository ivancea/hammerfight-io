import { assert } from "../../common/errors";
import { interpolateMagnitude, subtract, Vector } from "../../common/vector";
import { Context, getContext } from "../context";
import { getScreenPlayerPosition, getScreenSize } from "../graphics";
import { InputHandler } from "./input-handler";

/**
 * Input handler that tracks the position of the mouse within the game view.
 *
 * The farther the mouse is from the player, the higher the acceleration.
 */
export function makeAbsoluteMouseInput(
  context: Context,
  element: HTMLElement,
  updateAcceleration: (newAcceleration: Vector) => void,
): InputHandler {
  const recalculateAcceleration = (mousePosition: Vector) => {
    const screenSize = getScreenSize();
    const playerPosition = getScreenPlayerPosition();

    const delta = subtract(mousePosition, playerPosition);

    const baseSize = Math.min(screenSize.x, screenSize.y) * 0.1;

    const acceleration = interpolateMagnitude(
      delta,
      0,
      baseSize,
      0,
      getContext().room.maxPlayerAcceleration,
    );

    updateAcceleration(acceleration);
  };

  // Setup

  let lastMousePosition: Vector | undefined;

  const onMouseMove = (event: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const mousePosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    recalculateAcceleration(mousePosition);

    lastMousePosition = mousePosition;
  };

  element.addEventListener("mousemove", onMouseMove);

  const interval = setInterval(() => {
    assert(context === getContext(), "Context changed");

    if (lastMousePosition) {
      recalculateAcceleration(lastMousePosition);
    }
  }, 20);

  return {
    terminate() {
      clearInterval(interval);
      element.removeEventListener("mousemove", onMouseMove);
    },
  };
}
