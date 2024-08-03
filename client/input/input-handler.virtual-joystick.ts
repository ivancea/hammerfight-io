import isMobile from "is-mobile";
import nipplejs from "nipplejs";
import { assert } from "../../common/errors";
import { interpolateMagnitude, Vector } from "../../common/vector";
import { Context } from "../context";
import { InputHandler } from "./input-handler.base";

/**
 * Input handler that creates a virtual joystick.
 */
export class VirtualJoystickInputHandler implements InputHandler {
  static id = "VirtualJoystick" as const;
  static getName = () => "Virtual Joystick";
  static isAvailable = () => isMobile();

  joystickManager: nipplejs.JoystickManager;

  constructor(
    private context: Context,
    private element: HTMLElement,
    private updateAcceleration: (newAcceleration: Vector) => void,
  ) {
    const container = element.parentElement;
    assert(container, "Joystick element must have a parent");

    this.joystickManager = nipplejs.create({
      zone: container,
      color: "green",
    });

    this.joystickManager.on("move", (event, data) => {
      this.updateMovement({ x: data.vector.x, y: -data.vector.y });
    });

    this.joystickManager.on("end", () => {
      this.updateMovement({ x: 0, y: 0 });
    });
  }

  updateMovement(vector: Vector) {
    const maxPlayerAcceleration = this.context.room.maxPlayerAcceleration;

    const acceleration = interpolateMagnitude(
      vector,
      0,
      1,
      0,
      maxPlayerAcceleration,
    );

    this.updateAcceleration(acceleration);
  }

  terminate() {
    this.joystickManager.destroy();
  }
}
