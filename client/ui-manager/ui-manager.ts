import { UiState } from "./ui-state";

/**
 * Entry point of the UI state machine.
 *
 * This function will run the UI, which works as a simple state machine,
 * going from one state to another, where each state represents a different screen of the UI.
 */
export async function runStateMachine(initialState: UiState) {
  let currentState = initialState;

  // Infinite loop with a safe limit of iterations
  for (let i = 0; i < 1_000_000; i++) {
    const newState = await currentState.enter();

    if (newState !== currentState) {
      await currentState.exit();
    }

    currentState = newState;
  }

  console.error("UI state machine exceeded maximum number of iterations");
}
