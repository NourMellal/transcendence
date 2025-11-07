import type { IComponent } from '../components/IComponent';

export type ComponentConstructor<Props> = new (props: Props) => IComponent<Props>;

/**
 * Factory class for creating and managing component types
 * Allows registration and dynamic creation of components
 */
export class ComponentFactory {
	private static components = new Map<string, ComponentConstructor<any>>();

	/**
	 * Register a component class with a name
	 */
	static register<Props>(name: string, component: ComponentConstructor<Props>): void {
		this.components.set(name, component);
	}

	/**
	 * Create a component instance by name
	 */
	static create<Props>(name: string, props: Props): IComponent<Props> | null {
		const ComponentClass = this.components.get(name);
		return ComponentClass ? new ComponentClass(props) : null;
	}

	/**
	 * Get all registered component names
	 */
	static getRegistered(): string[] {
		return Array.from(this.components.keys());
	}

	/**
	 * Check if a component is registered
	 */
	static isRegistered(name: string): boolean {
		return this.components.has(name);
	}

	/**
	 * Unregister a component
	 */
	static unregister(name: string): boolean {
		return this.components.delete(name);
	}

	/**
	 * Clear all registered components
	 */
	static clear(): void {
		this.components.clear();
	}
}

export default ComponentFactory;
