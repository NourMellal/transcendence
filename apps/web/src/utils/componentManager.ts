import type { IComponent } from '../components/IComponent';

/**
 * Manager class for handling multiple component instances
 * Provides lifecycle management and batch operations
 */
export class ComponentManager {
	private components: Set<IComponent> = new Set();
	private container: HTMLElement | null = null;

	/**
	 * Set the default container for components
	 */
	setContainer(container: HTMLElement): void {
		this.container = container;
	}

	/**
	 * Add a component to the manager
	 */
	add(component: IComponent): void {
		this.components.add(component);
	}

	/**
	 * Remove a component from the manager and unrender it
	 */
	remove(component: IComponent): void {
		component.unrender();
		this.components.delete(component);
	}

	/**
	 * Render a specific component
	 */
	renderComponent(component: IComponent, container?: HTMLElement): void {
		const targetContainer = container || this.container;
		if (!targetContainer) {
			throw new Error('No container specified. Set a default container or provide one.');
		}
		component.render(targetContainer);
	}

	/**
	 * Render all managed components
	 */
	renderAll(container?: HTMLElement): void {
		const targetContainer = container || this.container;
		if (!targetContainer) {
			throw new Error('No container specified. Set a default container or provide one.');
		}

		this.components.forEach(component => {
			component.render(targetContainer);
		});
	}

	/**
	 * Unrender all components and clear the manager
	 */
	unrenderAll(): void {
		this.components.forEach(component => {
			component.unrender();
		});
		this.components.clear();
	}

	/**
	 * Update props for a specific component
	 */
	updateProps<Props>(component: IComponent<Props>, props: Partial<Props>): void {
		if (this.components.has(component)) {
			component.setProps(props);
		}
	}

	/**
	 * Get the number of managed components
	 */
	getCount(): number {
		return this.components.size;
	}

	/**
	 * Get all managed components
	 */
	getComponents(): IComponent[] {
		return Array.from(this.components);
	}

	/**
	 * Check if a component is managed
	 */
	has(component: IComponent): boolean {
		return this.components.has(component);
	}

	/**
	 * Find components by a predicate function
	 */
	findComponents<Props>(predicate: (component: IComponent<Props>) => boolean): IComponent<Props>[] {
		return Array.from(this.components).filter(predicate) as IComponent<Props>[];
	}
}

export default ComponentManager;
