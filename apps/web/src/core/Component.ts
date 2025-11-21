import { rerenderComponent } from './renderer';

export default class Component<P = {}, S = {}> {
  protected element: HTMLElement | null = null;
  protected state: S;
  protected props: P;
  protected subscriptions: (() => void)[] = [];

  constructor(props: P) {
    this.props = props;
    this.state = this.getInitialState();
  }
  abstract getInitialState(): S;

  setState(part: Partial<S>) {
    this.state = { ...(this.state as any), ...(part as any) } as S;
    // re-render this component in-place
    try { rerenderComponent(this as any); } catch (err) { console.error('rerender error', err); }
  }

  // render may return a string, an HTMLElement, or an array mixing strings, elements and Components
  abstract render(): string | HTMLElement | Array<string | HTMLElement | Component<any, any>>;

  onMount?(): void;
  onUpdate?(prevProps: P, prevState: S): void;
  onUnmount?(): void;

  /**
   * Normalize render() output into a single HTMLElement root.
   * - HTMLElement returned: used as-is
   * - string returned: parsed into nodes and wrapped in a div
   * - array returned: each item can be string|HTMLElement|Component; Components are mounted into placeholders
   */
  protected buildContent(content: string | HTMLElement | Array<string | HTMLElement | Component<any, any>>): HTMLElement {
    // If render returned an element, use it directly   
    if (content instanceof HTMLElement) return content;

    const appendStringToContainer = (html: string, container: HTMLElement) => {
      const template = document.createElement('template');
      template.innerHTML = html;
      container.appendChild(template.content.cloneNode(true));
    };

    // Helper: when a string or single-item array parses to exactly one top-level HTMLElement,
    // return that element directly to avoid adding an extra wrapper.
    if (typeof content === 'string') {
      const temp = document.createElement('template');
      temp.innerHTML = content;
      // if exactly one top-level element, return it (no extra wrapper)
      if (temp.content.childElementCount === 1) {
        return temp.content.firstElementChild as HTMLElement;
      }
      // otherwise fall back to wrapper
      const wrapper = document.createElement('div');
      wrapper.appendChild(temp.content.cloneNode(true));
      return wrapper;
    }

    // content is an array
    // if array has a single item and that item is string or element, try to return a single element
    if (Array.isArray(content) && content.length === 1) {
      const only = content[0];
      if (typeof only === 'string') {
        const temp = document.createElement('template');
        temp.innerHTML = only;
        if (temp.content.childElementCount === 1) {
          return temp.content.firstElementChild as HTMLElement;
        }
      } else if (only instanceof HTMLElement) {
        return only;
      }
    }

    const wrapper = document.createElement('div');
    for (const item of content) {
      if (typeof item === 'string') {
        appendStringToContainer(item, wrapper);
      } else if (item instanceof HTMLElement) {
        wrapper.appendChild(item);
      } else if (item instanceof Component) {
        if (item.element) item.unmount();
        const placeholder = document.createElement('div');
        wrapper.appendChild(placeholder);
        item.mount(placeholder);
      }
    }

    return wrapper;
  }

  mount(container?: HTMLElement | string | Component<any, any>): HTMLElement {
    let mountTarget: HTMLElement | null = null;

    if (container === undefined) {
      mountTarget = this.element;
      if (!mountTarget) throw new Error('No mount target provided and component not previously attached.');
    } else if (typeof container === 'string') {
      mountTarget = document.querySelector(container);
    } else if (container instanceof Component) {
      if (!container.element) throw new Error('Container component is not mounted.');
      mountTarget = container.element;
    } else {
      mountTarget = container;
    }
    if (!mountTarget) throw new Error('Mount target not found.');

    const raw = this.render();
    const content = this.buildContent(raw);

    mountTarget.appendChild(content);
    this.element = content;

    this.attachEventListeners();
    this.onMount?.();

    return this.element;
  }

  update(newProps: Partial<Props>) {
    const prevProps = this.props;
    const prevState = this.state;

    this.props = { ...this.props, ...newProps };

    if (!this.element) return;

    if (this.shouldUpdate(newProps as Props, this.state)) {
      const parent = this.element.parentElement;
      if (parent) {
        const raw = this.render();
        const content = this.buildContent(raw);

        parent.replaceChild(content, this.element);
        this.element = content;
      } else {
        this.mount(this.element);
      }

      this.attachEventListeners();
      this.onUpdate?.(prevProps, prevState);
    }
  }

  unmount() {
    this.subscriptions.forEach(unsub => unsub());
    this.onUnmount?.();
    if (this.element) {
      this.element.innerHTML = '';
      this.element = null;
    }
  }

  protected shouldUpdate(_newProps: Props, _newState: State): boolean {
    return true;
  }

  protected abstract attachEventListeners(): void;
}
