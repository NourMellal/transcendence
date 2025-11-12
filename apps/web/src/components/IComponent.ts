
export default interface IComponent<P = unknown, S = unknown, R = unknown> {
  name: string;

  parent?: IComponent<any, any, any> | null;

  children?: IComponent<any, any, any>[];

  props?: P;
  state?: S;

  setState?(partial: Partial<S> | ((prev: S | undefined) => Partial<S>)): void;

  add?(component: IComponent<any, any, any>): void;
  remove?(component: IComponent<any, any, any>): void;
  getChild?(index: number): IComponent<any, any, any> | undefined;

  render(): R;

  mount?(): void;
  unmount?(): void;

  traverse?(cb: (component: IComponent<any, any, any>) => void): void;
}