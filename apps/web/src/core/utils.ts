import Component from "./Component";
import RootComponent from "./root";   
import Signal  from "./signal" ;     
let _mountedRoot: RootComponent | null = null;

export const rootSignal = new Signal<RootComponent | null>(_mountedRoot);
// export a signal that carries the current route view element
export const viewSignal = new Signal<Component<{} ,  {}>  | null>(null);

export function mountRoot(container: string | HTMLElement = '#root') {   
  if (_mountedRoot) return _mountedRoot;
  const root = new RootComponent();
  root.mount(container );
  _mountedRoot = root;
  rootSignal.set(_mountedRoot);

  const unsubscribe = viewSignal.subscribe((el) => {  
    try {    
      console.log("test") ;   
      const rootEl =
        typeof container === 'string'
          ? document.querySelector(container) as HTMLElement
          : container as HTMLElement;
      if (!rootEl) return;
      const appView = rootEl.querySelector('#app-view') as HTMLElement | null;
      if (!appView) return;
      while (appView.firstChild) {
        const child = appView.firstChild as HTMLElement;
        const cleanup = (child as any)?._cleanup;
        if (typeof cleanup === 'function') {
          try { cleanup(); } catch (e) { /* ignore cleanup errors */ }
        }
        appView.removeChild(child);
      }
      if (el) {
        try {
          // Mount the component instance into the app view so it manages its own lifecycle
          el.mount(appView);  
        } catch (e) {
          // fallback: try to append render() output
          try {
            const rendered = el.render();
            if (rendered instanceof HTMLElement) appView.appendChild(rendered);
          } catch (er) {
            // swallow
          }
        }
      }
    } catch (e) {
    }
  });

  (root as any)._viewUnsubscribe = unsubscribe;

  return root;
}

try {
  if (typeof window !== 'undefined' && document) {
    const el = document.querySelector('#root');
    if (el) mountRoot(el as HTMLElement);
  }
} catch (e) {
}
