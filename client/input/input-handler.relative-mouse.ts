import { assert } from "../../common/errors";
import { interpolateMagnitude, magnitude, Vector } from "../../common/vector";
import { Context, getContext } from "../context";
import { InputHandler } from "./input-handler.base";

/**
 * Input handler that locks the mouse to the element, and tracks its movement.
 *
 * The acceleration with be calculated based on the mouse movement.
 */
export class RelativeMouseInputHandler implements InputHandler {
  /**
   * A simple "weighted moving average" to smooth out the mouse movement.
   *
   * Useful to avoid changing the direction after a minimal mouse movement or vibration.
   */
  accumulatedMovement: Vector = { x: 0, y: 0 };

  interval: NodeJS.Timeout;

  constructor(
    private context: Context,
    private element: HTMLElement,
    private updateAcceleration: (newAcceleration: Vector) => void,
  ) {
    element.addEventListener("mousemove", this.onMouseMove);
    element.addEventListener("click", () => {
      element.requestPointerLock();
    });
    element.requestPointerLock();

    this.interval = setInterval(() => {
      assert(context === getContext(), "Context changed");

      this.updateMovement({ x: 0, y: 0 });
    }, 50);
  }

  updateMovement(mouseMovement: Vector) {
    this.accumulatedMovement.x =
      mouseMovement.x + this.accumulatedMovement.x * 0.5;
    this.accumulatedMovement.y =
      mouseMovement.y + this.accumulatedMovement.y * 0.5;

    if (magnitude(this.accumulatedMovement) <= 1) {
      this.updateAcceleration(this.accumulatedMovement);
      return;
    }

    const sensitivity = 5;

    const acceleration = interpolateMagnitude(
      this.accumulatedMovement,
      0,
      sensitivity,
      0,
      this.context.room.maxPlayerAcceleration,
    );

    this.updateAcceleration(acceleration);
  }

  /**
   * Mouse move event handler.
   * It's an arrow function to allow removing it later, while keeping the "this" context.
   */
  onMouseMove = (event: MouseEvent) => {
    const mouseMovement = {
      x: event.movementX,
      y: event.movementY,
    };

    this.updateMovement(mouseMovement);
  };

  terminate() {
    clearInterval(this.interval);
    this.element.removeEventListener("mousemove", this.onMouseMove);
  }
}
