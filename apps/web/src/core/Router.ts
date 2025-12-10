import Component from "./Component";
import { Route, ComponentConstructor } from "./types";
import { viewSignal } from "./utils";
import { appState } from "../state";

// Routes that should redirect authenticated users to dashboard
const GUEST_ONLY_ROUTES = ['/auth/login', '/auth/signup'];

// Routes that require authentication (redirect to login if not authenticated)
const PROTECTED_ROUTES = ['/dashboard', '/profile', '/game', '/chat', '/friends'];

export default class Router {
   private _routes: Route[];
   private _location: string;
  // listeners registered via onRoute(...)
  private _routeListeners: Array<(component: Component, params: Record<string,string>) => void> = [];

   constructor(routes: Route[]) {
      this._routes = routes;
      this._location = "";
   }
  
  /**
   * Register a callback called whenever a route is rendered.
   * Returns an unsubscribe function.
   */
  onRoute(cb: (component: Component, params: Record<string,string>) => void): () => void {
    this._routeListeners.push(cb);
    return () => { this._routeListeners = this._routeListeners.filter(l => l !== cb); };
  }
  private _notifyRoute(component: Component, params: Record<string,string>) {
    for (const l of this._routeListeners) {
      try { l(component, params); } catch (err) { console.error('route listener error', err); }
    }
  }

  /**
   * Check auth guards before navigating.
   * Returns true if navigation should proceed, false if redirected.
   */
  private checkAuthGuards(path: string): boolean {
    const isAuthenticated = appState.auth.get().isAuthenticated;
    
    // Redirect logged-in users away from guest-only pages (login/signup)
    if (GUEST_ONLY_ROUTES.some(route => path.startsWith(route))) {
      if (isAuthenticated) {
        // Use setTimeout to avoid navigation during navigation
        setTimeout(() => this.navigate('/dashboard'), 0);
        return false;
      }
    }
    
    // Redirect unauthenticated users away from protected pages
    if (PROTECTED_ROUTES.some(route => path.startsWith(route))) {
      if (!isAuthenticated) {
        setTimeout(() => this.navigate('/auth/login'), 0);
        return false;
      }
    }
    
    return true;
  }

navigate(path: string): void  { 
     if (!path) return;
     if (path === this._location) return;
     
     // Check auth guards before proceeding
     if (!this.checkAuthGuards(path)) {
       return;
     }
     
     history.pushState(null, '', path); 
     this.handleNavigation(path);
  };
  start(): void  
   {    
      this._location =  window.location.pathname;
      window.addEventListener('popstate', this.onPopState.bind(this));
      
      // Check auth guards on initial load
      if (!this.checkAuthGuards(this._location)) {
        return;
      }
      
      this.handleNavigation(this._location);
   };

  destroy(): void {
     try {
       window.removeEventListener('popstate', this.onPopState.bind(this));
     } catch (e) {}
  }

   private onPopState(): void {
      const path = window.location.pathname;
      if (path === this._location) return;
      
      // Check auth guards on browser back/forward
      if (!this.checkAuthGuards(path)) {
        return;
      }
      
      this.handleNavigation(path);
   };  

/**
 * 
 * @param path 
 * @returns 
**/
private match(path: string): Route | null {
    const normalize = (p: string) => {
        if (!p) return '/';
        const cleaned = p.replace(/\/+$/, '');
        return cleaned === '' ? '/' : cleaned;
    };

    const target = normalize(path);

    const toRegex = (routePath: string): RegExp => {
        // Normalize route
        const rp = normalize(routePath);

        // Escape regex specials
        let pattern = rp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Restore wildcard
        pattern = pattern.replace(/\\\*/g, '.*');

        // Replace params
        pattern = pattern.replace(/:([A-Za-z0-9_]+)/g, '[^/]+');

        // Full match
        return new RegExp(`^${pattern}/?$`);
    };

    for (const route of this._routes) {
        const regex = toRegex(route.path);

        if (regex.test(target)) {
            return route;
        }
    }
    return null;
}
private handleNavigation(path: string): void {    
   const route = this.match(path);
   if (!route) {
      console.warn(`No route matched for path: ${path}`);
      return;
   }
   const params = this.extractParams(route, path);
   let compInstance: Component<{}, {}> | null = null;
   try {
      if (!route.component) {
         console.error('No component defined for route:', path);
         return;
      }
      if (typeof route.component === 'function') {
         const Ctor = route.component as ComponentConstructor;
         const mergedProps = { ...(route.props || {}), ...(params as any) };
         compInstance = new Ctor(mergedProps);
      } else {
         compInstance = route.component as Component<{}, {}>;
      }
   } catch (err) {
      console.error('Error creating route component for', path, err);
      return;
   }
   try {
      (compInstance as any).params = params;
   } catch (e) {}

   this._location = path;
  this.render(compInstance);
  // ...and notify any onRoute subscribers (pass params from instance)
  try { this._notifyRoute(compInstance, (compInstance as any).params ?? {}); } catch (e) {}
}

private render(componentInstance: Component<{}, {}>): void {
   if (!componentInstance) return;    
   try {  
      viewSignal.set(componentInstance as any);  
   } catch (err) {
      console.error('Router render error:', err);
   }
}

private extractParams(route: Route, path: string): Record<string, string> {
   const normalize = (p: string) => {
      if (!p) return '/';
      const cleaned = p.replace(/\/+$/, '');
      return cleaned === '' ? '/' : cleaned;
   };

   const routePath = normalize(route.path);
   const target = normalize(path);

   const routeSegs = routePath.split('/').filter(Boolean);
   const pathSegs = target.split('/').filter(Boolean);

   const params: Record<string, string> = {};

   for (let i = 0; i < routeSegs.length; i++) {
      const r = routeSegs[i];
      if (r === '*') {
         const rest = pathSegs.slice(i).join('/');
         params['*'] = rest === '' ? '' : decodeURIComponent(rest);
         break;
      }

      const p = pathSegs[i];
      if (!p) continue; 

      if (r.startsWith(':')) {
         const name = r.slice(1);
         try {
            params[name] = decodeURIComponent(p);
         } catch {
            params[name] = p;
         }
      }
   }

   return params;
}
}
