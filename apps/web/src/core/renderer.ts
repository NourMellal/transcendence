export type AnyComponent = { render: () => any; unmount?: () => void; attachEventListeners?: () => void; onMount?: () => void; };

export function isComponent(v: unknown): v is AnyComponent {
  return !!v && typeof (v as AnyComponent).render === 'function';
}

/**
 * Render a mixed array of strings | Component into a DOM container.
 * If `owner` is provided, mounted child components are recorded on owner._mountedChildren.
 */
export function renderInto(container: HTMLElement, items: Array<string | AnyComponent | unknown>, owner?: AnyComponent) {
  for (const item of items) {
    if (typeof item === 'string') {
      const tpl = document.createElement('template');
      tpl.innerHTML = item.trim();
      container.appendChild(tpl.content.cloneNode(true));
      continue;
    }

    if (isComponent(item)) {
      mountComponent(item, container);
      // record child on owner so unmount can walk subtree
      if (owner) {
        (owner as any)._mountedChildren ||= [];
        (owner as any)._mountedChildren.push(item);
      }
      continue;
    }

    // fallback: text node for numbers/booleans/etc.
    container.appendChild(document.createTextNode(String(item)));
  }
}

/**
 * Mount a component instance into parent. Creates a stable root element and stores it on the instance.
 */
export function mountComponent(component: AnyComponent, parent: HTMLElement) {
  const root = document.createElement('div');
  root.setAttribute('data-component', component.constructor?.name ?? 'component');
  parent.appendChild(root);

  (component as any)._root = root;
  (component as any)._mountedChildren = [];

  let out: any[] = [];
  try {
    out = component.render() ?? [];
  } catch (err) {
    console.error('component render error', err);
    root.textContent = 'Component render error';
    return;
  }

  renderInto(root, Array.isArray(out) ? out : [out], component);

  try {
    component.attachEventListeners?.();
    component.onMount?.();
  } catch (err) {
    console.error('component mount hook error', err);
  }
}

/**
 * Unmount a component: recursively unmount children, call component.unmount, then remove the root from DOM.
 */
export function unmountComponent(component: AnyComponent) {
  // unmount mounted children first
  const children: AnyComponent[] = (component as any)._mountedChildren ?? [];
  for (const ch of children) {
    try {
      unmountComponent(ch);
    } catch (err) {
      console.error('child unmount error', err);
    }
  }

  try {
    component.unmount?.();
  } catch (err) {
    console.error('component unmount error', err);
  }

  const root: HTMLElement | undefined = (component as any)._root;
  if (root && root.parentNode) root.parentNode.removeChild(root);

  // cleanup internal references
  delete (component as any)._root;
  delete (component as any)._mountedChildren;
}

/**
 * Rerender a component: unmount previously mounted children (but keep this root in DOM),
 * clear root content and render fresh output.
 */
export function rerenderComponent(component: AnyComponent) {
  const root: HTMLElement | undefined = (component as any)._root;
  if (!root) return;

  // unmount previously mounted children (but keep this root in DOM)
  const prevChildren: AnyComponent[] = (component as any)._mountedChildren ?? [];
  for (const ch of prevChildren) {
    try { unmountComponent(ch); } catch (err) { console.error('child unmount error', err); }
  }
  (component as any)._mountedChildren = [];

  // clear root content and render fresh output
  root.innerHTML = '';
  let out: any[] = [];
  try {
    out = component.render() ?? [];
  } catch (err) {
    console.error('component render error', err);
    root.textContent = 'Component render error';
    return;
  }
  renderInto(root, Array.isArray(out) ? out : [out], component);

  try {
    component.attachEventListeners?.();
    component.onMount?.();
  } catch (err) {
    console.error('component mount hook error', err);
  }
}