import { Vector } from "../../common/vector";
import { Context } from "../context";
import { AbsoluteMouseInputHandler } from "./input-handler.absolute-mouse";
import { GamepadInputHandler } from "./input-handler.gamepad";
import { RelativeMouseInputHandler } from "./input-handler.relative-mouse";

export const availableInputHandlers = [
  {
    id: "AbsoluteMouse",
    name: "Mouse (Absolute)",
  },
  {
    id: "RelativeMouse",
    name: "Mouse (Relative)",
  },
  {
    id: "Gamepad",
    name: "Gamepad",
  },
] as const;

export type InputHandlerId = (typeof availableInputHandlers)[number]["id"];

export function makeInputHandler(
  inputHandlerId: InputHandlerId,
  context: Context,
  htmlElement: HTMLElement,
  updateAcceleration: (newAcceleration: Vector) => void,
) {
  switch (inputHandlerId) {
    case "Gamepad":
      return new GamepadInputHandler(context, updateAcceleration);

    case "RelativeMouse":
      return new RelativeMouseInputHandler(
        context,
        htmlElement,
        updateAcceleration,
      );

    case "AbsoluteMouse":
    default:
      return new AbsoluteMouseInputHandler(
        context,
        htmlElement,
        updateAcceleration,
      );
  }
}
