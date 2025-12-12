# Frontend (React-like) — Documentation

This document explains the small React-like front-end system used in `apps/web`.
It describes the component model, lifecycle, routing, signals (reactive primitives), how to add pages and components, and how to run the dev environment.

## Overview

The frontend uses a lightweight component system inspired by React. Key pieces:
- `Component` base class: small lifecycle and rendering contract.
- `Router`: minimal SPA router that maps paths to page components and publishes the current page via a signal.
- `Signal`: tiny observable used for decoupled state updates across the shell and pages.
- Root component: application shell which mounts the current page into an element inside the shell.

This pattern avoids React and keeps a small dependency surface while offering familiar concepts.

## Contract — Component

A `Component<Props, State>` is the building block. Key responsibilities:
- Provide `getInitialState(): State`.
- Implement `render()` which returns one of:
  - `HTMLElement` — a concrete node to mount.
  - `string` — an HTML string. If the string parses to a single top-level element it is mounted directly (no wrapper). Multiple top-level nodes are wrapped.
  - `Array<string | HTMLElement | Component>` — a set of nodes/components to mount in order. If the array has a single top-level item that yields one element, that element is used directly.
- Lifecycle hooks (optional): `onMount()`, `onUpdate(prevProps, prevState)`, `onUnmount()`.
- `attachEventListeners()` — protected method that should register DOM event listeners. Use `this.element` to query within the component.

Important behavior implemented in `Component`:
- When mounting, the component's `render()` output is normalized to an HTMLElement by `buildContent()`.
- If the result is a single element, that element is used directly (no extra wrapper div), per the team preference to avoid extra DOM wrappers.
- If multiple nodes are returned, a small wrapper element is created to contain them.
- `mount(container)` appends the content to the given container and sets `this.element` to the root element the component owns.
- `update(newProps)` re-renders and replaces the previous root element in the DOM (preserving lifecycle hooks and subscriptions).
- `unmount()` removes subscriptions, invokes `onUnmount`, and clears `this.element`.

Edge cases & notes:
- If you want to return multiple sibling root nodes without a wrapper, we can implement marker-based mounting (comment nodes) but that is more involved. Currently multiple nodes get wrapped — preferred for simplicity.
- Keep event attachment inside `attachEventListeners()` so `update()` can re-attach when necessary.

## Router

The `Router` is an SPA router that:
- Accepts an array of route definitions (path, component constructor or instance) and optional metadata.
- Listens to `popstate` and `navigate()` calls to update the active route.
- Instantiates component constructors (if a constructor provided) and publishes the active page component via a `Signal` (commonly called `viewSignal`).

Usage pattern:
- Feature modules export their `routes` arrays.
- `main.ts` aggregates all routes, constructs a `Router(routes)`, and starts it.
- The root/shell subscribes to `viewSignal` and mounts the active page into a designated container element.

## Signal

`Signal<T>` is a tiny observable:
- `set(value: T)` updates and notifies subscribers.
- `get()` returns the current value.
- `subscribe(cb)` returns an unsubscribe function.

Signals are used for decoupling (e.g., `viewSignal` for current page, global state signals for auth). Keep signals small and focused.

## Root / Mounting

The Root component (application shell) provides a stable DOM container (e.g., `<main id="app-view"></main>`). It subscribes to `viewSignal` and when a new component instance is set:
- Calls `unmount()` on the previous page component instance (if present) so it can cleanup.
- Mounts the new page component into the shell's target element.

This ensures only one page is mounted at a time and page lifecycle is respected.

## How to add a page or component

1. Create a component class that extends `Component<Props, State>`.
2. Implement `getInitialState()` and `render()`.
3. Use `attachEventListeners()` to wire DOM events.
4. Export the component (either class or an already-instantiated instance) and add a route in the feature's `routes` array:

```ts
// example route
{
  path: '/auth/login',
  component: LoginPage // can be a constructor or an instance
}
```

5. Rebuild / restart dev server; or if dev server hot-reloads, it should pick up the change.

## Dev commands

From the repository root (monorepo):
- Install: `pnpm install`
- Start web dev server: `pnpm run dev:web` (or `pnpm -w -r -F web run dev` depending on workspace config)

If your environment uses Tailwind or PostCSS, ensure the required dev dependencies are installed. This project also supports loading Tailwind via CDN if preferred.

## Testing & Typecheck

- Typecheck: `pnpm -w -r -F web -C tsc --noEmit` or `pnpm -w -r tsc -p tsconfig.json` depending on workspace scripts. (Adjust per workspace setup.)

## Common mistakes & troubleshooting

- Missing mount point: Ensure `index.html` or the shell contains the element the root expects (e.g., `#app-view`). Without it nothing will render.
- PostCSS/tailwind plugin missing: If dev server fails with `Cannot find module 'tailwindcss'`, either install the plugin or remove it from `postcss.config.cjs` and use CDN styles instead.
- Unmount lifecycle: Always implement `onUnmount` when you create long-lived subscriptions (timers, signals) so pages clean up when the route changes.

## Where to look in the code

- `apps/web/src/core/Component.ts` — Component base class.
- `apps/web/src/core/Router.ts` — Router implementation.
- `apps/web/src/core/signal.ts` — Signal implementation.
- `apps/web/src/core/root.ts` — Root shell and mount logic.
- `apps/web/src/main.ts` — App bootstrap and route aggregation.
- Modules: `apps/web/src/modules/*/Router` and `Pages` directories — feature routes and pages.

## Contributing tips for other devs

- Prefer small, single-responsibility components.
- Keep `render()` results deterministic and avoid returning many unrelated sibling nodes unless necessary.
- Put styles in the feature folder and prefer utility classes when present (Tailwind via CDN or local integration).
- When adding routes, export them from the feature module and add to the aggregated routes in `main.ts`.

---

If you'd like, I can also:
- Add a short `apps/web/README.md` linking to this doc and showing the exact commands to run locally.
- Create a small example page that demonstrates composing child components (login page with left/right panels) using the `Component` API.
- Remove the untracked/garbage files — I have a list ready; I will only delete after you confirm which of the candidates to remove.
