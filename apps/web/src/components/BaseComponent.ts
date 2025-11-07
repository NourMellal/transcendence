import type { IComponent, ComponentElement } from '../components/IComponent';


export abstract class BaseComponent<Props = any> implements IComponent<Props> {
	props: Props;
	protected el: ComponentElement | null = null;

	constructor(props: Props) {
		this.props = props;
	}

	abstract createElement(): HTMLElement;

	render(container: HTMLElement): void {
		this.el = this.createElement() as ComponentElement;
		this.el._component = this;
		container.appendChild(this.el);
	}

	unrender(): void {
		if (this.el && this.el.parentElement) {
			this.el.parentElement.removeChild(this.el);
		}
		this.el = null;
	}

	setProps(next: Partial<Props>): void {
		this.props = { ...this.props, ...next };
		if (this.el) {
			const newEl = this.createElement() as ComponentElement;
			newEl._component = this;
			this.el.parentElement?.replaceChild(newEl, this.el);
			this.el = newEl;
		}
	}

	getProps(): Props {
		return this.props;
	}

	protected onMount?(): void;

	protected onUnmount?(): void;
}

export default BaseComponent;
