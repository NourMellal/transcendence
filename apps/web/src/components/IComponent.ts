export interface IComponent<Props = any> {
  props: Props;
  render(container: HTMLElement): void;
  unrender(): void;
  setProps(next: Partial<Props>): void;
  getProps(): Props;
}

export interface ComponentElement extends HTMLElement {
  _component?: IComponent;
}

export default IComponent;
