import Router from './core/Router';
import Signal from './core/signal';
import { mountRoot  } from './root';
function mountAll() {
  try {
    const rootEl = document.querySelector('#root');
    if (rootEl) mountRoot(rootEl as HTMLElement);

    const appEl = document.querySelector('#app');
    if (appEl) {
      const view = new Signal<HTMLElement | null>(null);

      view.subscribe(el => {
        (appEl as HTMLElement).innerHTML = '';
        if (el) (appEl as HTMLElement).appendChild(el);
      });
      // const router = new Router({
      //   routes: [
      //     { path: '/', element: Home },
      //     { path: '/about', element: About },
      //   ],
      //   render: (element) => view.set(element)
      // });
      // router.start();
    }
  } catch (err) {
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }
}
