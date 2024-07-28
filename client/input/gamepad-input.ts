import { assert } from "../../common/errors";
import { interpolateMagnitude, Vector } from "../../common/vector";
import { Context, getContext } from "../context";
import { InputHandler } from "./input-handler";

/**
 * Input handler that uses the connected Gamepad axes.
 */
export function makeGamepadInput(
  context: Context,
  updateAcceleration: (newAcceleration: Vector) => void,
): InputHandler {
  const updateMovement = () => {
    const gamepad = navigator.getGamepads().find((gamepad) => gamepad);

    if (!gamepad) {
      return;
    }

    const movement = gamepad.axes.reduce<Vector>(
      (acc, axis, index) => {
        return {
          x: acc.x + (index % 2 === 0 ? axis : 0),
          y: acc.y + (index % 2 === 1 ? axis : 0),
        };
      },
      { x: 0, y: 0 },
    );

    const maxPlayerAcceleration = getContext().room.maxPlayerAcceleration;

    const acceleration = interpolateMagnitude(
      movement,
      0,
      Math.SQRT2,
      0,
      maxPlayerAcceleration,
    );

    updateAcceleration(acceleration);
  };

  // Setup

  const onGamepadConnected = () => {
    // No-op
  };

  window.addEventListener("gamepadconnected", onGamepadConnected);

  const interval = setInterval(() => {
    assert(context === getContext(), "Context changed");

    updateMovement();
  }, 10);

  return {
    terminate() {
      clearInterval(interval);
      window.removeEventListener("gamepadconnected", onGamepadConnected);
    },
  };
}
