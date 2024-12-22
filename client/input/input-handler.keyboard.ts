import isMobile from "is-mobile";
import { Vector, withMagnitude } from "../../common/vector";
import { Context } from "../context";
import { InputHandler } from "./input-handler.base";

/**
 * Input handler that listens for key pressings.
 *
 * Acceleration will always have a maxAcceleration magnitude, in the direction of the keys pressed.
 */
export class KeyboardInputHandler implements InputHandler {
  static id = "Keyboard" as const;
  static getName = () => "Keyboard";
  static isAvailable = () => !isMobile();

  upKeyPressed = false;
  downKeyPressed = false;
  leftKeyPressed = false;
  rightKeyPressed = false;

  constructor(
    private context: Context,
    private element: HTMLElement,
    private updateAcceleration: (newAcceleration: Vector) => void,
  ) {
    window.addEventListener("keydown", this.onKeyEvent);
    window.addEventListener("keyup", this.onKeyEvent);
  }

  recalculateAcceleration() {
    const xAcc = (this.rightKeyPressed ? 1 : 0) - (this.leftKeyPressed ? 1 : 0);
    const yAcc = (this.downKeyPressed ? 1 : 0) - (this.upKeyPressed ? 1 : 0);

    if (xAcc === 0 && yAcc === 0) {
      this.updateAcceleration({ x: 0, y: 0 });
      return;
    }

    const acceleration = withMagnitude(
      {
        x: xAcc,
        y: yAcc,
      },
      this.context.room.maxPlayerAcceleration,
    );

    this.updateAcceleration(acceleration);
  }

  /**
   * Key event handler. Handles both "keydown" and "keyup" events.
   *
   * It's an arrow function to allow removing it later, while keeping the "this" context.
   */
  onKeyEvent = (event: KeyboardEvent) => {
    const newValue = event.type === "keydown";

    const lowercasedKey = event.key.toLowerCase();

    if (event.key === "ArrowUp" || lowercasedKey === "w") {
      this.upKeyPressed = newValue;
    } else if (event.key === "ArrowDown" || lowercasedKey === "s") {
      this.downKeyPressed = newValue;
    } else if (event.key === "ArrowLeft" || lowercasedKey === "a") {
      this.leftKeyPressed = newValue;
    } else if (event.key === "ArrowRight" || lowercasedKey === "d") {
      this.rightKeyPressed = newValue;
    }

    this.recalculateAcceleration();
  };

  terminate() {
    window.removeEventListener("keydown", this.onKeyEvent);
    window.removeEventListener("keyup", this.onKeyEvent);
  }
}
