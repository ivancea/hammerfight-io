import { joinRoom } from "./socket-io";
import "./styles/index.scss";

function main() {
  document
    .getElementById("room-selection-form-submit")
    ?.addEventListener("click", (event) => {
      event.preventDefault();

      const username = (document.getElementById("username") as HTMLInputElement)
        .value;
      joinRoom(username);
    });
}

main();
