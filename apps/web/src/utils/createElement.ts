export type ElementProps = {
	className?: string;
	style?: Partial<CSSStyleDeclaration>;
	[key: string]: any;
};

export type ElementChild = string | HTMLElement | null | undefined;

/**
 * JSX-like helper function to create DOM elements
 * @param tag - HTML tag name
 * @param props - Element properties and attributes
 * @param children - Child elements or text content
 * @returns 
 */
export function h(
	tag: string,
	props: ElementProps = {},
	...children: ElementChild[]
): HTMLElement {
	const el = document.createElement(tag);
	
	Object.entries(props).forEach(([key, value]) => {
		if (key === 'className') {
			el.className = value;
		} else if (key === 'style' && typeof value === 'object') {
			Object.assign(el.style, value);
		} else if (key.startsWith('on') && typeof value === 'function') {
			const eventType = key.slice(2).toLowerCase();
			el.addEventListener(eventType, value);
		} else if (value !== null && value !== undefined) {
			el.setAttribute(key, String(value));
		}
	});
	
	children.forEach(child => {
		if (child === null || child === undefined) return;
		if (typeof child === 'string') {
			el.appendChild(document.createTextNode(child));
		} else {
			el.appendChild(child);
		}
	});
	
	return el;
}

export default h;
