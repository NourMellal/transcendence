import { Component } from '../components/base/Component';

export interface Route {
  path: string;
  component: () => Component;
  guard?: () => boolean;
  title?: string;
}

export class Router {
  private routes: Route[] = [];
  private container: HTMLElement;
  private currentComponent: Component | null = null;
  private notFoundPath?: string;

  constructor(container: HTMLElement) {
    this.container = container;
    window.addEventListener('popstate', () => {
      this.resolve(window.location.pathname);
    });
  }

  addRoute(route: Route): Router {
    this.routes.push(route);
    return this;
  }

  setNotFound(path: string): Router {
    this.notFoundPath = path;
    return this;
  }

  start(): void {
    this.resolve(window.location.pathname);
  }

  navigate(path: string): void {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    this.resolve(path);
  }

  private resolve(path: string): void {
    const route = this.routes.find((r) => r.path === path);
    if (!route) {
      if (this.notFoundPath && path !== this.notFoundPath) {
        this.navigate(this.notFoundPath);
      }
      return;
    }

    if (route.guard && !route.guard()) {
      return;
    }

    this.swapComponent(route);

    if (route.title) {
      document.title = route.title;
    }
  }

  private swapComponent(route: Route): void {
    if (this.currentComponent) {
      this.currentComponent.unmount();
      this.currentComponent = null;
    }

    this.container.innerHTML = '';
    const component = route.component();
    component.mount(this.container);
    this.currentComponent = component;
  }
}



