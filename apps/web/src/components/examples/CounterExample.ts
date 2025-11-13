import { Component } from '../base/Component';
import { Signal } from '../../core/Signal';

/**
 * Example component demonstrating Signal-based reactive state management
 */
export class CounterExample extends Component {
  private count: Signal<number>;
  private countDisplay: HTMLElement;
  private incrementBtn: HTMLElement;
  private decrementBtn: HTMLElement;

  constructor() {
    super('div', 'counter-example');
    
    // Create reactive state
    this.count = this.createSignal(0);
    
    // Create UI elements
    this.countDisplay = this.createElement('h2', 'count-display');
    this.incrementBtn = this.createElement('button', 'btn btn-primary', '+');
    this.decrementBtn = this.createElement('button', 'btn btn-secondary', '-');
    
    // Bind Signal to display element
    this.bindSignalToText(this.count, this.countDisplay, (count) => `Count: ${count}`);
    
    // Add event listeners
    this.addEventListener(this.incrementBtn, 'click', () => {
      this.count.set(this.count.get() + 1);
    });
    
    this.addEventListener(this.decrementBtn, 'click', () => {
      this.count.set(this.count.get() - 1);
    });
  }

  protected render(): void {
    // Clear existing content
    this.element.innerHTML = '';
    
    // Build UI
    this.element.appendChild(this.createElement('h1', '', 'Counter Example'));
    this.element.appendChild(this.countDisplay);
    
    const buttonContainer = this.createElement('div', 'button-container');
    buttonContainer.appendChild(this.decrementBtn);
    buttonContainer.appendChild(this.incrementBtn);
    
    this.element.appendChild(buttonContainer);
    
    // Add some basic styles
    this.element.style.cssText = `
      padding: 20px;
      text-align: center;
      border: 1px solid #ccc;
      border-radius: 8px;
      max-width: 300px;
      margin: 20px auto;
    `;
    
    buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-top: 10px;
    `;
    
    this.incrementBtn.style.cssText = `
      padding: 8px 16px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
    
    this.decrementBtn.style.cssText = `
      padding: 8px 16px;
      background: #6c757d;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    `;
  }
}