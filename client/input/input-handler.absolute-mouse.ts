import isMobile from "is-mobile";
import { assert } from "../../common/errors";
import { interpolateMagnitude, subtract, Vector } from "../../common/vector";
import { Context, getContext } from "../context";
import { getScreenPlayerPosition, getScreenSize } from "../graphics";
import { InputHandler } from "./input-handler.base";

/**
 * Input handler that tracks the position of the mouse within the game view.
 *
 * The farther the mouse is from the player, the higher the acceleration.
 */
export class AbsoluteMouseInputHandler implements InputHandler {
  static id = "AbsoluteMouse" as const;
  static getName = () => "Mouse (Absolute)";
  static isAvailable = () => !isMobile();

  lastMousePosition: Vector | undefined;
  interval: NodeJS.Timeout;

  constructor(
    private context: Context,
    private element: HTMLElement,
    private updateAcceleration: (newAcceleration: Vector) => void,
  ) {
    element.addEventListener("mousemove", this.onMouseMove);

    this.interval = setInterval(() => {
      assert(context === getContext(), "Context changed");

      if (this.lastMousePosition) {
        this.recalculateAcceleration(this.lastMousePosition);
      }
    }, 20);
  }

  recalculateAcceleration(mousePosition: Vector) {
    const screenSize = getScreenSize();
    const playerPosition = getScreenPlayerPosition();

    const delta = subtract(mousePosition, playerPosition);

    const baseSize = Math.min(screenSize.x, screenSize.y) * 0.1;

    const acceleration = interpolateMagnitude(
      delta,
      0,
      baseSize,
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
    const rect = this.element.getBoundingClientRect();
    const mousePosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    this.recalculateAcceleration(mousePosition);

    this.lastMousePosition = mousePosition;
  };

  terminate() {
    clearInterval(this.interval);
    this.element.removeEventListener("mousemove", this.onMouseMove);
  }
}
