import Component from "./Component";

export type ComponentConstructor = new (props?: any) => Component<{}, {}>;

export type Route = {
  path: string;
  // allow either a component instance or a component constructor
  component?: ComponentConstructor | Component<{}, {}>;
  props?: any;
};

