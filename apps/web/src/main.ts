import Router from './core/Router';
import { mountRoot } from './core/utils';
import authRoutes from './modules/auth/Router/router';

function mountAll ()  
{  
  try {  
    const rootEl = document.querySelector('#root');
    if (rootEl) mountRoot(rootEl as HTMLElement);

    const appEl = document.querySelector('#app-view'); 
    if (appEl) {  
      const routes = [
        ...authRoutes,
      ];
      const router = new Router(routes);
      router.start();
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
