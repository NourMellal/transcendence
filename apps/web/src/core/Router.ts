

export type Route = {
  path: string;
  element: () => HTMLElement; 
};

export default  class Router {
  private _routes: Route[];
  private _location: string;
  private _renderCallback: (element: HTMLElement) => void;

  constructor(options: {
    routes: Route[];
    render: (element: HTMLElement) => void;
  })
   {  
      this._routes  =  options.routes  ;  
      this._renderCallback =    options.render ;     
      this._location = "" ;   
  };


  navigate(path: string): void  { 
     if (!path) return;
     if (path === this._location) return;
     history.pushState(null, '', path);
     this.handleNavigation(path);
  };
  start(): void  
   {  
      this._location =  window.location.pathname  ;    
      window.addEventListener('popstate', this.onPopState.bind(this));
      this.handleNavigation(this._location)  ;
   };

  destroy(): void {
     try {
       window.removeEventListener('popstate', this.onPopState.bind(this));
     } catch (e) {}
  }

   private onPopState(): void {
      const path = window.location.pathname;
      if (path === this._location) return;
      this.handleNavigation(path);
   };
/**
 * 
 * @param path 
 * @returns 
 */
private match(path: string): Route | null {
   const normalize = (p: string) => {
      if (!p) return '/';
      const cleaned = p.replace(/\/+$/, '');
      return cleaned === '' ? '/' : cleaned;
   };

   const target = normalize(path);

   for (const route of this._routes) {
      const routePath = normalize(route.path);

      if (routePath === target) return route;

      const routeSegs = routePath.split('/').filter(Boolean);
      const pathSegs = target.split('/').filter(Boolean);

      let matched = true;
      for (let i = 0; i < Math.max(routeSegs.length, pathSegs.length); i++) {
         const r = routeSegs[i];
         const p = pathSegs[i];

         if (r === '*') {
            matched = true;
            break;
         }

         if (r === undefined || p === undefined) {
            matched = false;
            break;
         }
         if (r.startsWith(':')) continue;
         if (r !== p) {
            matched = false;
            break;
         }
      }

      const endsWithWildcard = routeSegs.length > 0 && routeSegs[routeSegs.length - 1] === '*';
      if (matched && (routeSegs.length === pathSegs.length || endsWithWildcard)) {
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
   let element: HTMLElement;
   try {
      element = route.element();
   } catch (err) {
      console.error('Error creating route element for', path, err);
      return;
   }

   (element as any).params = params;

   this._location = path;
   this.render(element);
}

private render(element: HTMLElement): void {
   if (!element) return;
   try {
      this._renderCallback(element);
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