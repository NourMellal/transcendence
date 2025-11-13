import { Signal } from '../../core/Signal';

/**
 * Base Component class for creating vanilla TypeScript components
 * Enhanced with Signal-based reactive state management
 */

export abstract class Component {
  protected element: HTMLElement;
  protected mounted = false;
  private signalSubscriptions: (() => void)[] = [];

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
   * Create a new Signal with automatic cleanup on component unmount
   */
  protected createSignal<T>(initialValue: T): Signal<T> {
    const signal = new Signal(initialValue);
    
    // Auto-subscribe to trigger updates when this component's signal changes
    this.subscribeToSignal(signal);
    
    return signal;
  }

  /**
   * Subscribe to a Signal and automatically update component when value changes
   */
  protected subscribeToSignal<T>(
    signal: Signal<T>, 
    callback?: (value: T) => void
  ): void {
    const unsubscribe = signal.subscribe((value: T) => {
      if (callback) {
        callback(value);
      } else {
        // Default behavior: trigger update
        this.update();
      }
    });
    
    this.signalSubscriptions.push(unsubscribe);
  }

  /**
   * Create a reactive binding between a Signal and an element's property
   */
  protected bindSignalToElement<T>(
    signal: Signal<T>,
    element: HTMLElement,
    property: keyof HTMLElement,
    transform?: (value: T) => any
  ): void {
    const updateElement = (value: T) => {
      (element as any)[property] = transform ? transform(value) : value;
    };
    
    // Set initial value
    updateElement(signal.get());
    
    // Subscribe to changes
    this.subscribeToSignal(signal, updateElement);
  }

  /**
   * Create a reactive binding between a Signal and an element's text content
   */
  protected bindSignalToText<T>(
    signal: Signal<T>,
    element: HTMLElement,
    transform?: (value: T) => string
  ): void {
    this.bindSignalToElement(signal, element, 'textContent', 
      transform || ((value: T) => String(value)));
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
    
    // Store cleanup function
    if (!this.element.dataset.cleanupFunctions) {
      this.element.dataset.cleanupFunctions = '[]';
    }
    
    const cleanupFunctions = JSON.parse(this.element.dataset.cleanupFunctions);
    cleanupFunctions.push(() => element.removeEventListener(type, listener));
    this.element.dataset.cleanupFunctions = JSON.stringify(cleanupFunctions);
  }

  /**
   * Cleanup method for event listeners, Signal subscriptions, etc.
   */
  protected cleanup(): void {
    // Cleanup Signal subscriptions
    this.signalSubscriptions.forEach(unsubscribe => unsubscribe());
    this.signalSubscriptions = [];
    
    // Cleanup event listeners
    if (this.element.dataset.cleanupFunctions) {
      const cleanupFunctions = JSON.parse(this.element.dataset.cleanupFunctions);
      cleanupFunctions.forEach((fn: () => void) => fn());
      delete this.element.dataset.cleanupFunctions;
    }
  }
}