import { capitalize } from "lodash-es";
import { WEAPON_TYPES, WeaponType } from "../common/types/weapon";
import {
  availableInputHandlers,
  InputHandlerId,
} from "./input/input-handler-catalog";
import { joinRoom } from "./socket-io";
import "./styles/index.scss";

function main() {
  // Get controls
  const usernameInput = document.getElementById("username") as HTMLInputElement;
  const inputModeInput = document.getElementById(
    "input-mode",
  ) as HTMLSelectElement;
  const weaponInput = document.getElementById("weapon") as HTMLSelectElement;
  const botsInput = document.getElementById("bots") as HTMLInputElement;
  const debugModeInput = document.getElementById(
    "debug-mode",
  ) as HTMLInputElement;

  // Initialize controls
  inputModeInput.innerHTML = "";
  for (const inputHandler of availableInputHandlers) {
    const option = document.createElement("option");
    option.value = inputHandler.id;
    option.text = inputHandler.getName();
    inputModeInput.add(option);
  }
  weaponInput.innerHTML = "";
  for (const weaponType of WEAPON_TYPES) {
    const option = document.createElement("option");
    option.value = weaponType;
    option.text = capitalize(weaponType);
    weaponInput.add(option);
  }

  // On start
  document
    .getElementById("room-selection-form-submit")
    ?.addEventListener("click", (event) => {
      event.preventDefault();

      const username = usernameInput.value;
      const inputHandlerId = inputModeInput.value as InputHandlerId;
      const weapon = weaponInput.value as WeaponType;
      const bots = botsInput.checked;
      const debugMode = debugModeInput.checked;

      joinRoom(username, inputHandlerId, weapon, bots, debugMode);
    });
}

window.addEventListener("DOMContentLoaded", main);
