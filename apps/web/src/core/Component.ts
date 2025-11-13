export default abstract class Component<Props = {}, State = {}> {
  protected element: HTMLElement | null = null;
  protected state: State;
  protected props: Props;
  protected subscriptions: (() => void)[] = [];

  constructor(props: Props) {
    this.props = props;
    this.state = this.getInitialState();
  }
  abstract getInitialState(): State;
  // render may return a string, an HTMLElement, or an array mixing strings, elements and Components
  abstract render(): string | HTMLElement | Array<string | HTMLElement | Component<any, any>>;

  onMount?(): void;
  onUpdate?(prevProps: Props, prevState: State): void;
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

    const wrapper = document.createElement('div');

    const appendString = (html: string) => {
      const template = document.createElement('template');
      template.innerHTML = html;
      wrapper.appendChild(template.content.cloneNode(true));
    };

    if (typeof content === 'string') {
      appendString(content);
      return wrapper;
    }

    // content is an array
    for (const item of content) {
      if (typeof item === 'string') {
        appendString(item);
      } else if (item instanceof HTMLElement) {
        wrapper.appendChild(item);
      } else if (item instanceof Component) {
        // ensure child is not currently mounted elsewhere
        if (item.element) item.unmount();
        const placeholder = document.createElement('div');
        wrapper.appendChild(placeholder);
        // mount child into placeholder
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
