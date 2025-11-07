export type ComponentCtor = new (props?: any) => { render: (container: HTMLElement) => void; unrender?: () => void };

export class Router {
	outlet: HTMLElement;
	routes: Array<{ path: string; component: any }>;
	rootComponent?: ComponentCtor;
	/**
	 * @param outlet element where pages/components will be mounted
	 * @param rootComponent optional component constructor that can be used as the default/root component
	 */
	constructor(outlet: HTMLElement, rootComponent?: ComponentCtor) {
		this.outlet = outlet;
		this.routes = [];
		this.rootComponent = rootComponent;
	}

	addRoute(path: string, component: any) {
		this.routes.push({ path, component });
	}
}