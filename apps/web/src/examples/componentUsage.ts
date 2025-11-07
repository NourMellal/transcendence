/**
 * Example usage of the component system
 * This file demonstrates how to use the JSX-like template function method
 */

import { 
	ExamplComponent, 
	ComponentManager, 
	ComponentFactory
} from '../components';

// Example 1: Basic component usage
export function basicUsage() {
	const container = document.getElementById('app')!;

	// Create a simple component
	const component = new ExamplComponent({ 
		message: 'Hello World!' 
	});

	// Render it
	component.render(container);

	// Update props later
	setTimeout(() => {
		component.setProps({ message: 'Updated message!' });
	}, 2000);

	return component;
}

// Example 2: Interactive component
export function interactiveUsage() {
	const container = document.getElementById('app')!;

	const component = new ExamplComponent({
		message: 'Click the button',
		onClick: () => {
			alert('Button was clicked!');
			component.setProps({ 
				message: 'Button clicked!', 
				disabled: true 
			});
		},
		disabled: false
	});

	component.render(container);
	return component;
}

// Example 3: Using ComponentManager
export function managerUsage() {
	const container = document.getElementById('app')!;
	const manager = new ComponentManager();

	// Set default container
	manager.setContainer(container);

	// Create multiple components
	const components = [
		new ExamplComponent({ message: 'Component 1' }),
		new ExamplComponent({ message: 'Component 2' }),
		new ExamplComponent({ 
			message: 'Interactive Component',
			onClick: () => console.log('Clicked!'),
			disabled: false
		})
	];

	// Add components to manager
	components.forEach(comp => manager.add(comp));

	// Render all components
	manager.renderAll();

	// Update a specific component
	setTimeout(() => {
		manager.updateProps(components[0], { message: 'Updated Component 1' });
	}, 3000);

	// Clean up all components after 10 seconds
	setTimeout(() => {
		manager.unrenderAll();
	}, 10000);

	return manager;
}

// Example 4: Using ComponentFactory
export function factoryUsage() {
	const container = document.getElementById('app')!;

	// Register components
	ComponentFactory.register('exampl', ExamplComponent);

	// Create components using factory
	const component1 = ComponentFactory.create('exampl', { 
		message: 'Factory created component' 
	});

	const component2 = ComponentFactory.create('exampl', { 
		message: 'Another factory component',
		onClick: () => console.log('Factory component clicked!'),
		disabled: false
	});

	// Render them
	if (component1) component1.render(container);
	if (component2) component2.render(container);

	return { component1, component2 };
}

// Example 5: Complete application setup
export class ExampleApp {
	private manager: ComponentManager;
	private container: HTMLElement;

	constructor(containerId: string) {
		this.container = document.getElementById(containerId)!;
		this.manager = new ComponentManager();
		this.manager.setContainer(this.container);
		
		// Register components
		ComponentFactory.register('exampl', ExamplComponent);
	}

	init() {
		// Create header component
		const header = new ExamplComponent({
			message: 'Welcome to Component System Demo'
		});

		// Create interactive components
		const interactiveComponent = new ExamplComponent({
			message: 'Click me for interaction',
			onClick: () => this.handleButtonClick(),
			disabled: false
		});

		// Add components to manager
		this.manager.add(header);
		this.manager.add(interactiveComponent);

		// Render all
		this.manager.renderAll();
	}

	private handleButtonClick() {
		// Create a new component dynamically
		const newComponent = ComponentFactory.create('exampl', {
			message: `Dynamic component created at ${new Date().toLocaleTimeString()}`
		});

		if (newComponent) {
			this.manager.add(newComponent);
			this.manager.renderComponent(newComponent);
		}
	}

	destroy() {
		this.manager.unrenderAll();
		ComponentFactory.clear();
	}
}

// Usage:
// const app = new ExampleApp('app');
// app.init();
