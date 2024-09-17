import { assert } from "../../common/errors";

export type UiState = {
  /**
   * Method called when the state begins its execution.
   */
  enter(): Promise<UiState>;

  /**
   * Method called when the state ends its execution, before transitioning to the next state.
   */
  exit(): Promise<void> | void;
};

/**
 * Base class for UI states, which simplifies the UiState `enter()` promise management.
 */
export abstract class BaseUiState implements UiState {
  /**
   * The root element to render the UI in.
   */
  protected readonly rootElement: HTMLElement;

  /**
   * Function to be called to transition to the next state.
   */
  protected resolve: (value: UiState) => void;

  public constructor() {
    // Just for type safety
    this.resolve = () => {};

    const rootElement = document.getElementById("game");
    assert(rootElement, "Root element not found");
    this.rootElement = rootElement;
  }

  async enter() {
    return new Promise<UiState>((resolve) => {
      this.resolve = resolve;

      this.doEnter();
    });
  }

  async exit() {
    await this.doExit();

    this.rootElement.innerHTML = "";
  }

  /**
   * Method called when the state begins its execution.
   *
   * This method must eventually call `this.resolve` to transition to the next state.
   *
   * It's just a shortcut of the `enter` method.
   */
  abstract doEnter(): void;

  /**
   * Method called when the state ends its execution, before transitioning to the next state.
   *
   * It's just a shortcut of the `exit` method.
   */
  abstract doExit(): Promise<void> | void;

  /**
   * Gets a template element, and asserts it exists and is, in fact, a template.
   */
  protected getTemplate(templateId: string): HTMLTemplateElement {
    const template = document.getElementById(templateId) as HTMLTemplateElement;
    assert(template, `Template "${templateId}" not found`);
    assert(
      Object.prototype.isPrototypeOf.call(
        HTMLTemplateElement.prototype,
        template,
      ),
      `Element "${templateId}" is not a template`,
    );

    return template;
  }
}
