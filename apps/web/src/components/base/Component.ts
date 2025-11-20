/**
 * Base Component class for creating vanilla TypeScript components
 */

export abstract class Component {
  protected element: HTMLElement;
  protected mounted = false;
  private cleanupCallbacks: Array<() => void> = [];

  constructor(tagName = 'div', className?: string) {
    this.element = document.createElement(tagName);
    if (className) {
      this.element.className = className;
    }
  }

  /**
   * Get the DOM element
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * Mount component to parent element
   */
  mount(parent: HTMLElement): void {
    if (!this.mounted) {
      this.render();
      this.mounted = true;
    }
    parent.appendChild(this.element);
  }

  /**
   * Unmount component from DOM
   */
  unmount(): void {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.mounted = false;
    this.cleanup();
  }

  /**
   * Update component state and re-render
   */
  update(): void {
    if (this.mounted) {
      this.render();
    }
  }

  /**
   * Abstract render method to be implemented by subclasses
   */
  protected abstract render(): void;

  /**
   * Helper method to create elements with classes
   */
  protected createElement(tagName: string, className?: string, textContent?: string): HTMLElement {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (textContent) {
      element.textContent = textContent;
    }
    return element;
  }

  /**
   * Helper method to add event listeners that are automatically cleaned up
   */
  protected addEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any
  ): void {
    element.addEventListener(type, listener);
    this.registerCleanup(() => element.removeEventListener(type, listener));
  }

  /**
   * Track cleanup callbacks for subscriptions or observers
   */
  protected registerCleanup(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  /**
   * Cleanup method for event listeners, etc.
   */
  protected cleanup(): void {
    this.cleanupCallbacks.forEach((fn) => fn());
    this.cleanupCallbacks = [];
  }
}