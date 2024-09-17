import "./styles/index.scss";
import { runStateMachine } from "./ui-manager/ui-manager";
import { FormUiState } from "./ui-manager/ui-state.form";

function main() {
  runStateMachine(new FormUiState()).catch((error: unknown) => {
    console.error("Error running UI state machine", error);
  });
}

window.addEventListener("DOMContentLoaded", main);
