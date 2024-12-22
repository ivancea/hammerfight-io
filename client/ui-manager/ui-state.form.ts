import { capitalize } from "lodash-es";
import { assert } from "../../common/errors";
import { WEAPON_TYPES, WeaponType } from "../../common/types/weapon";
import {
  availableInputHandlers,
  InputHandlerId,
} from "../input/input-handler-catalog";
import { STORAGE } from "../storage";
import { BaseUiState } from "./ui-state";
import { GameUiState } from "./ui-state.game";

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

        STORAGE.set(STORAGE.KEYS.UI_STATE__USERNAME, username);
        STORAGE.set(STORAGE.KEYS.UI_STATE__INPUT_HANDLER_ID, inputHandlerId);
        STORAGE.set(STORAGE.KEYS.UI_STATE__WEAPON, weapon);
        STORAGE.set(STORAGE.KEYS.UI_STATE__BOTS, bots.toString());
        STORAGE.set(STORAGE.KEYS.UI_STATE__DEBUG_MODE, debugMode.toString());

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

    // Set values
    this.usernameInput.value =
      STORAGE.get(STORAGE.KEYS.UI_STATE__USERNAME) ?? "";
    this.inputModeInput.value =
      STORAGE.get(STORAGE.KEYS.UI_STATE__INPUT_HANDLER_ID) ?? "";
    this.weaponInput.value = STORAGE.get(STORAGE.KEYS.UI_STATE__WEAPON) ?? "";
    this.botsInput.checked =
      STORAGE.get(STORAGE.KEYS.UI_STATE__BOTS) !== "false";
    this.debugModeInput.checked =
      STORAGE.get(STORAGE.KEYS.UI_STATE__DEBUG_MODE) === "true";
  }

  doExit() {}
}
