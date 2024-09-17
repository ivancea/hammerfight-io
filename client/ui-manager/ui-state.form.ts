import { capitalize } from "lodash-es";
import { assert } from "../../common/errors";
import { WEAPON_TYPES, WeaponType } from "../../common/types/weapon";
import {
  availableInputHandlers,
  InputHandlerId,
} from "../input/input-handler-catalog";
import { BaseUiState } from "./ui-state";
import { GameUiState } from "./ui-state.game";

/**
 * Stores the last username entered by the user.
 *
 * This lets us pre-fill the username input field between games.
 */
let lastUsername = "";

export class FormUiState extends BaseUiState {
  usernameInput?: HTMLInputElement;
  inputModeInput?: HTMLSelectElement;
  weaponInput?: HTMLSelectElement;
  botsInput?: HTMLInputElement;
  debugModeInput?: HTMLInputElement;

  doEnter() {
    this.initializeForm();

    document
      .getElementById("room-selection-form-submit")
      ?.addEventListener("click", (event) => {
        event.preventDefault();

        assert(
          this.usernameInput &&
            this.inputModeInput &&
            this.weaponInput &&
            this.botsInput &&
            this.debugModeInput,
          "Inputs not initialized",
        );

        const username = this.usernameInput.value;
        const inputHandlerId = this.inputModeInput.value as InputHandlerId;
        const weapon = this.weaponInput.value as WeaponType;
        const bots = this.botsInput.checked;
        const debugMode = this.debugModeInput.checked;

        lastUsername = username;

        this.resolve(
          new GameUiState(username, inputHandlerId, weapon, bots, debugMode),
        );
      });
  }

  private initializeForm() {
    const formTemplate = this.getTemplate("form-template");
    const newForm = formTemplate.content.cloneNode(true);

    this.rootElement.appendChild(newForm);

    // Get controls
    this.usernameInput = document.getElementById(
      "username",
    ) as HTMLInputElement;
    this.inputModeInput = document.getElementById(
      "input-mode",
    ) as HTMLSelectElement;
    this.weaponInput = document.getElementById("weapon") as HTMLSelectElement;
    this.botsInput = document.getElementById("bots") as HTMLInputElement;
    this.debugModeInput = document.getElementById(
      "debug-mode",
    ) as HTMLInputElement;

    // Initialize controls
    this.usernameInput.value = lastUsername;
    this.inputModeInput.innerHTML = "";
    for (const inputHandler of availableInputHandlers) {
      const option = document.createElement("option");
      option.value = inputHandler.id;
      option.text = inputHandler.getName();
      this.inputModeInput.add(option);
    }
    this.weaponInput.innerHTML = "";
    for (const weaponType of WEAPON_TYPES) {
      const option = document.createElement("option");
      option.value = weaponType;
      option.text = capitalize(weaponType);
      this.weaponInput.add(option);
    }
  }

  doExit() {}
}
