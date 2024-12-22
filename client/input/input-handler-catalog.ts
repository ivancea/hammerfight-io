import { assert } from "../../common/errors";
import { Vector } from "../../common/vector";
import { Context } from "../context";
import { KeyboardInputHandler } from "./input-handler.keyboard";

const inputHandlers = [KeyboardInputHandler] as const;

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
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const inputHandler = availableInputHandlers.find((handler) => handler.id === inputHandlerId);
  assert(inputHandler, `Unknown input handler or not available: ${inputHandlerId}`);

  return new inputHandler(context, htmlElement, updateAcceleration);
}
