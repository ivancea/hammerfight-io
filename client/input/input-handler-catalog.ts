import { Vector } from "../../common/vector";
import { Context } from "../context";
import { makeAbsoluteMouseInput } from "./absolute-mouse-input";
import { makeGamepadInput } from "./gamepad-input";
import { makeRelativeMouseInput } from "./relative-mouse-input";

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
      return makeGamepadInput(context, updateAcceleration);

    case "RelativeMouse":
      return makeRelativeMouseInput(context, htmlElement, updateAcceleration);

    case "AbsoluteMouse":
    default:
      return makeAbsoluteMouseInput(context, htmlElement, updateAcceleration);
  }
}
