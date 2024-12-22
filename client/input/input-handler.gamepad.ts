import { assert } from "../../common/errors";
import { interpolateMagnitude, Vector } from "../../common/vector";
import { Context, getContext } from "../context";
import { InputHandler } from "./input-handler.base";

/**
 * Input handler that uses the connected Gamepad axes.
 */
export class GamepadInputHandler implements InputHandler {
  static id = "Gamepad" as const;
  static getName = () => "Gamepad";
  static isAvailable = () => true;

  interval: NodeJS.Timeout;

  constructor(
    private context: Context,
    private element: HTMLElement,
    private updateAcceleration: (newAcceleration: Vector) => void,
  ) {
    window.addEventListener("gamepadconnected", this.onGamepadConnected);

    this.interval = setInterval(() => {
      assert(context === getContext(), "Context changed");

      this.updateMovement();
    }, 10);
  }

  updateMovement() {
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

    const maxPlayerAcceleration = this.context.room.maxPlayerAcceleration;

    const acceleration = interpolateMagnitude(movement, 0, Math.SQRT2, 0, maxPlayerAcceleration);

    this.updateAcceleration(acceleration);
  }

  /**
   * No-op handler for gamepadconnected events.
   *
   * It's an arrow function to allow removing it later, while keeping the "this" context.
   **/
  onGamepadConnected = () => {
    // No-op
  };

  terminate() {
    clearInterval(this.interval);
    window.removeEventListener("gamepadconnected", this.onGamepadConnected);
  }
}
