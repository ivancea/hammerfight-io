import { joinRoom } from "./socket-io";
import "./styles/index.scss";

function main() {
  document
    .getElementById("room-selection-form-submit")
    ?.addEventListener("click", (event) => {
      event.preventDefault();

      const username = (document.getElementById("username") as HTMLInputElement)
        .value;
      const inputMode = (
        document.getElementById("input-mode") as HTMLSelectElement
      ).value;
      const debugMode = (
        document.getElementById("debug-mode") as HTMLInputElement
      ).checked;

      joinRoom(username, inputMode, debugMode);
    });
}

main();
