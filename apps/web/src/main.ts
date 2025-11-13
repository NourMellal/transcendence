import { mountRoot } from './root';

function mountAll() {
  try {
    const rootEl = document.querySelector('#root');
    if (rootEl) mountRoot(rootEl as HTMLElement);
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