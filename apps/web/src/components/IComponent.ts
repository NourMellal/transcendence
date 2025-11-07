export interface IComponent<Props = any> {
  props: Props;
  render(container: HTMLElement): void;
  unrender?(): void;
  setProps?(next: Partial<Props>): void;
  getProps?(): Props;
}

export default IComponent;
