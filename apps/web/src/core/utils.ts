import Component from "./Component";
import RootComponent from "./root";   
import Signal  from "./signal" ;     
let _mountedRoot: RootComponent | null = null;

/**
 * `rootSignal` publishes the mounted `RootComponent` instance.
 * `viewSignal` publishes the currently active page `Component` instance.
 *
 * IMPORTANT: when the view changes we must call `unmount()` on the
 * previously mounted component so it can clean up subscriptions and event
 * listeners. The subscriber below tracks the current view and invokes
 * `unmount()` (with error handling) before mounting the next view.
 */
export const rootSignal = new Signal<RootComponent | null>(_mountedRoot);
export const viewSignal = new Signal<Component<{} ,  {}>  | null>(null);

export function mountRoot(container: string | HTMLElement = '#root') {   
  if (_mountedRoot) return _mountedRoot;
  const root = new RootComponent();
  root.mount(container );
  _mountedRoot = root;
  rootSignal.set(_mountedRoot);


  let _currentView: Component<{}, {}> | null = null;

  const unsubscribe = viewSignal.subscribe((el) => {  
    try {
      const rootEl =
        typeof container === 'string'
          ? document.querySelector(container) as HTMLElement
          : container as HTMLElement;
      if (!rootEl) return;
      const appView = rootEl.querySelector('#app-view') as HTMLElement | null;
      if (!appView) return;
x
      if (_currentView) {
        try {
          _currentView.unmount();
        } catch (err) {
          console.warn('Error during component unmount:', err);
        }
        _currentView = null;
      }

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
          el.mount(appView);
          _currentView = el;
        } catch (e) {
          try {
            const rendered = el.render();
            if (rendered instanceof HTMLElement) appView.appendChild(rendered);
          } catch (er) {
          }
        }
      }
    } catch (e) {
      console.error('viewSignal subscriber error:', e);
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
