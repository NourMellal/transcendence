import approuter from './routes';
import { mountRoot } from './core/utils';
import  './styles/styles.scss'

function mountAll ()
{
  try {
    const rootEl = document.querySelector('#root');
    if (rootEl) mountRoot(rootEl as HTMLElement);

    const appEl = document.querySelector('#app-view');
    if (appEl) {
      approuter.start();
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
