export interface ExamplComponentProps {
	message?: string;
	onClick?: () => void;
	disabled?: boolean;
}

import { BaseComponent } from './BaseComponent';
import { h } from '../utils/createElement';

export class ExamplComponent extends BaseComponent<ExamplComponentProps> {
	constructor(props: ExamplComponentProps = {}) {
		super(props);
	}

	createElement(): HTMLElement {
		return h('div',
			{ 
				className: 'exampl-component',
				style: { 
					padding: '16px',
					border: '1px solid #ddd',
					borderRadius: '8px',
					margin: '8px'
				}
			},
			h('span', {}, this.props.message || 'Example component'),
			this.props.onClick && h('button',
				{ 
					onClick: this.props.onClick,
					disabled: this.props.disabled,
					style: { 
						marginLeft: '8px',
						padding: '4px 8px',
						border: 'none',
						borderRadius: '4px',
						background: this.props.disabled ? '#ccc' : '#007bff',
						color: 'white',
						cursor: this.props.disabled ? 'not-allowed' : 'pointer'
					}
				},
				'Click me'
			)
		);
	}
}

export default ExamplComponent;
