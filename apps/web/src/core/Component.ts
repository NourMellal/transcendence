/**
 * Base Component class for the frontend framework.
 * All UI components should extend this abstract class.
 */
export default abstract class Component<P = {}, S = {}> {
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
    this.state = { ...(this.state as object), ...(part as object) } as S;
    if (!this.element || !this.element.parentElement) return;

    const parent = this.element.parentElement;
    const raw = this.render();
    const content = this.buildContent(raw);

    parent.replaceChild(content, this.element);
    this.element = content;
    this.attachEventListeners();
  }

  onMount?(): void;
  onUpdate?(prevProps: P, prevState: S): void;
  onUnmount?(): void;

  abstract render(): string | HTMLElement | Array<string | HTMLElement | Component<any, any>>;

  /**
   * Normalize render() output into a single HTMLElement root.
   * - HTMLElement returned: used as-is
   * - string returned: parsed into nodes and wrapped in a div
   * - array returned: each item can be string|HTMLElement|Component; Components are mounted into placeholders
   */
  protected buildContent(content: string | HTMLElement | Array<string | HTMLElement | Component<any, any>>): HTMLElement {
    if (content instanceof HTMLElement) return content;

    const appendStringToContainer = (html: string, container: HTMLElement) => {
      const template = document.createElement('template');
      template.innerHTML = html;
      container.appendChild(template.content.cloneNode(true));
    };

    if (typeof content === 'string') {
      const temp = document.createElement('template');
      temp.innerHTML = content.trim();
      if (temp.content.childElementCount === 1) {
        return temp.content.firstElementChild as HTMLElement;
      }
      const wrapper = document.createElement('div');
      wrapper.appendChild(temp.content.cloneNode(true));
      return wrapper;
    }

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
    for (const item of content as Array<string | HTMLElement | Component<any, any>>) {
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

  mount(container?: HTMLElement | string | Component<unknown, unknown>): HTMLElement {
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

  update(newProps: Partial<P>) {
    const prevProps = this.props;
    const prevState = this.state;

    this.props = { ...this.props, ...newProps };

    if (!this.element) return;

    if (this.shouldUpdate(newProps as P, this.state)) {
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
    this.subscriptions.forEach((unsub) => unsub());
    this.onUnmount?.();
    if (this.element) {
      this.element.innerHTML = '';
      this.element = null;
    }
  }

  protected shouldUpdate(_newProps: P, _newState: S): boolean {
    return true;
  }

  protected abstract attachEventListeners(): void;
}
