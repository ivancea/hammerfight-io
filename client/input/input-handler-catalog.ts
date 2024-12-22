import { assert } from "../../common/errors";
import { Vector } from "../../common/vector";
import { Context } from "../context";
import { AbsoluteMouseInputHandler } from "./input-handler.absolute-mouse";
import { GamepadInputHandler } from "./input-handler.gamepad";
import { KeyboardInputHandler } from "./input-handler.keyboard";
import { RelativeMouseInputHandler } from "./input-handler.relative-mouse";
import { VirtualJoystickInputHandler } from "./input-handler.virtual-joystick";

const inputHandlers = [
  RelativeMouseInputHandler,
  VirtualJoystickInputHandler,
  GamepadInputHandler,
  AbsoluteMouseInputHandler,
  KeyboardInputHandler,
] as const;

export const availableInputHandlers = inputHandlers.filter((inputHandler) =>
  inputHandler.isAvailable(),
);

export type InputHandlerId = (typeof inputHandlers)[number]["id"];

export function makeInputHandler(
  inputHandlerId: InputHandlerId,
  context: Context,
  htmlElement: HTMLElement,
  updateAcceleration: (newAcceleration: Vector) => void,
) {
  const inputHandler = availableInputHandlers.find((handler) => handler.id === inputHandlerId);
  assert(inputHandler, `Unknown input handler or not available: ${inputHandlerId}`);

  return new inputHandler(context, htmlElement, updateAcceleration);
}
