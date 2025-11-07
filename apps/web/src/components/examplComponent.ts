export interface ExamplComponentProps {
	message?: string;
}

import type { IComponent } from './IComponent';

export class ExamplComponent implements IComponent<ExamplComponentProps> {
	props: ExamplComponentProps;
	private el: HTMLElement | null = null;

	constructor(props: ExamplComponentProps = {}) {
		this.props = props;
	}

	render(container: HTMLElement) {
		const root = document.createElement('div');
		root.className = 'exampl-component';
		root.textContent = this.props.message || 'Example component';
		container.appendChild(root);
		this.el = root;
	}

	unrender() {
		if (this.el && this.el.parentElement) this.el.parentElement.removeChild(this.el);
		this.el = null;
	}

	setProps(next: Partial<ExamplComponentProps>) {
		this.props = { ...this.props, ...next };
		if (this.el) this.el.textContent = this.props.message || 'Example component';
	}

	getProps() {
		return this.props;
	}
}

export default ExamplComponent;
