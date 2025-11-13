import { Signal } from '../core/Signal';
import { Component } from '../components/base/Component';

/**
 * Route configuration interface
 */
export interface Route {
  path: string;
  component: new (...args: any[]) => Component;
  title?: string;
  guard?: () => boolean | Promise<boolean>;
}

/**
 * Current route state
 */
export interface RouteState {
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  title?: string;
}

/**
 * Hash-based SPA Router with Signal integration
 * Provides reactive routing for single-page applications
 */
export class Router {
  private routes: Route[] = [];
  private currentRoute = new Signal<RouteState>({
    path: '/',
    params: {},
    query: {}
  });
  private currentComponent: Component | null = null;
  private container: HTMLElement | null = null;
  private notFoundComponent: (new () => Component) | null = null;

  constructor(container?: HTMLElement) {
    this.container = container || null;
    this.init();
  }

  /**
   * Initialize the router
   */
  private init(): void {
    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      this.handleRouteChange();
    });

    // Handle initial route
    this.handleRouteChange();
  }

  /**
   * Register routes with the router
   */
  addRoute(route: Route): Router {
    this.routes.push(route);
    return this;
  }

  /**
   * Register multiple routes
   */
  addRoutes(routes: Route[]): Router {
    this.routes.push(...routes);
    return this;
  }

  /**
   * Set the 404 not found component
   */
  setNotFoundComponent(component: new () => Component): Router {
    this.notFoundComponent = component;
    return this;
  }

  /**
   * Set the container element for rendering components
   */
  setContainer(container: HTMLElement): Router {
    this.container = container;
    return this;
  }

  /**
   * Get the current route Signal for reactive subscriptions
   */
  getCurrentRoute(): Signal<RouteState> {
    return this.currentRoute;
  }

  /**
   * Navigate to a new route
   */
  navigate(path: string, replace: boolean = false): void {
    const hash = path.startsWith('#') ? path : `#${path}`;
    
    if (replace) {
      window.location.replace(window.location.pathname + window.location.search + hash);
    } else {
      window.location.hash = hash;
    }
  }

  /**
   * Go back in history
   */
  goBack(): void {
    window.history.back();
  }

  /**
   * Go forward in history
   */
  goForward(): void {
    window.history.forward();
  }

  /**
   * Replace current route without adding to history
   */
  replace(path: string): void {
    this.navigate(path, true);
  }

  /**
   * Handle route changes
   */
  private async handleRouteChange(): Promise<void> {
    const hash = window.location.hash.slice(1); // Remove #
    const path = hash || '/';
    
    // Parse path and query parameters
    const [pathPart, queryPart] = path.split('?');
    const query = this.parseQuery(queryPart || '');
    
    // Find matching route
    const matchedRoute = this.findMatchingRoute(pathPart);
    
    if (matchedRoute) {
      const { route, params } = matchedRoute;
      
      // Check route guard if present
      if (route.guard) {
        const canActivate = await route.guard();
        if (!canActivate) {
          // Guard failed, stay on current route or redirect
          return;
        }
      }
      
      // Update route state
      const routeState: RouteState = {
        path: pathPart,
        params,
        query,
        title: route.title
      };
      
      this.currentRoute.set(routeState);
      
      // Update document title if provided
      if (route.title) {
        document.title = route.title;
      }
      
      // Render the component
      await this.renderComponent(route.component);
      
    } else {
      // No matching route found
      this.handleNotFound(pathPart, query);
    }
  }

  /**
   * Find matching route with parameter extraction
   */
  private findMatchingRoute(path: string): { route: Route; params: Record<string, string> } | null {
    for (const route of this.routes) {
      const params = this.matchRoute(route.path, path);
      if (params !== null) {
        return { route, params };
      }
    }
    return null;
  }

  /**
   * Match a route pattern against a path and extract parameters
   */
  private matchRoute(pattern: string, path: string): Record<string, string> | null {
    // Convert route pattern to regex
    const paramNames: string[] = [];
    const regexPattern = pattern.replace(/:([^/]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });
    
    const regex = new RegExp(`^${regexPattern}$`);
    const match = path.match(regex);
    
    if (!match) {
      return null;
    }
    
    // Extract parameters
    const params: Record<string, string> = {};
    paramNames.forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1]);
    });
    
    return params;
  }

  /**
   * Parse query string into object
   */
  private parseQuery(query: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    if (!query) {
      return params;
    }
    
    query.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    });
    
    return params;
  }

  /**
   * Handle 404 not found
   */
  private handleNotFound(path: string, query: Record<string, string>): void {
    const routeState: RouteState = {
      path,
      params: {},
      query,
      title: '404 - Page Not Found'
    };
    
    this.currentRoute.set(routeState);
    document.title = '404 - Page Not Found';
    
    if (this.notFoundComponent) {
      this.renderComponent(this.notFoundComponent);
    } else {
      this.renderDefaultNotFound();
    }
  }

  /**
   * Render a component
   */
  private async renderComponent(ComponentClass: new (...args: any[]) => Component): Promise<void> {
    if (!this.container) {
      console.warn('Router: No container set for rendering components');
      return;
    }
    
    // Unmount current component
    if (this.currentComponent) {
      this.currentComponent.unmount();
      this.currentComponent = null;
    }
    
    // Clear container
    this.container.innerHTML = '';
    
    // Create and mount new component
    this.currentComponent = new ComponentClass();
    this.currentComponent.mount(this.container);
  }

  /**
   * Render default 404 page
   */
  private renderDefaultNotFound(): void {
    if (!this.container) {
      return;
    }
    
    this.container.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 50vh;
        text-align: center;
        padding: 40px;
        font-family: 'Inter', system-ui, sans-serif;
      ">
        <h1 style="font-size: 4rem; color: #dc3545; margin: 0;">404</h1>
        <h2 style="color: #333; margin: 16px 0;">Page Not Found</h2>
        <p style="color: #666; margin-bottom: 24px;">
          The page you're looking for doesn't exist.
        </p>
        <button 
          onclick="window.location.hash = '/'"
          style="
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            text-decoration: none;
            transition: background 0.2s ease;
          "
          onmouseover="this.style.background='#0056b3'"
          onmouseout="this.style.background='#007bff'"
        >
          Go Home
        </button>
      </div>
    `;
  }

  /**
   * Generate URL for a route with parameters
   */
  generateUrl(path: string, params?: Record<string, string>, query?: Record<string, string>): string {
    let url = path;
    
    // Replace parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url = url.replace(`:${key}`, encodeURIComponent(value));
      });
    }
    
    // Add query parameters
    if (query && Object.keys(query).length > 0) {
      const queryString = Object.entries(query)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      url += `?${queryString}`;
    }
    
    return `#${url}`;
  }

  /**
   * Subscribe to route changes
   */
  onRouteChange(callback: (route: RouteState) => void): () => void {
    return this.currentRoute.subscribe(callback);
  }
}