# Transcendence Web App

Frontend SPA for Transcendence following clean architecture principles with Mock Service Worker (MSW) integration.

## Features

- ✅ Service-oriented architecture with clean boundaries
- ✅ HttpClient wrapper for centralized API communication
- ✅ Dedicated service classes (AuthService, UserService)
- ✅ Frontend DTOs/models separate from backend
- ✅ Mock API for development without backend dependency
- ✅ TypeScript type safety matching OpenAPI spec
- ✅ Interactive test interface

## Service Layer

### HttpClient

Centralized HTTP client with automatic authorization and error handling:

```typescript
import { HttpClient } from './services/api/HttpClient';

const httpClient = new HttpClient({ baseURL: 'http://localhost:3000' });

// GET, POST, PATCH, PUT, DELETE methods
const user = await httpClient.get<User>('/users/me');
const response = await httpClient.post('/auth/login', credentials);
```

### AuthService

Authentication operations:

```typescript
import { AuthService } from './services/auth/AuthService';

const authService = new AuthService(httpClient);

await authService.signup({ username, email, password });
const { user } = await authService.login({ email, password });
const currentUser = await authService.getStatus();
await authService.logout();
```

### UserService

User profile operations:

```typescript
import { UserService } from './services/api/UserService';

const userService = new UserService(httpClient);

const profile = await userService.getProfile();
await userService.updateProfile({ username: 'new_name' });
```

## Mock API Endpoints

The following endpoints are mocked using MSW and return data matching the OpenAPI specification:

### Auth Endpoints

- `POST /auth/signup` - Register a new user
  - Returns: `User` object with status 201
- `POST /auth/login` - Login with email and password
  - Returns: `LoginResponse` with user and message
- `GET /auth/status` - Get current authentication status
  - Returns: `User` object if authenticated, 401 if not
````markdown
# Transcendence Web App — Developer Guide

This document is focused on developer onboarding: framework primitives, project structure, how the renderer and router work, and a step-by-step (101) to create a Page.

## Quick start

Install dependencies and run the web dev server:

```bash
pnpm install
pnpm --filter web run dev
```

Open `http://localhost:5173` (or the URL printed by the dev server).

## Where to look

- `apps/web/src/core` — framework primitives (`Component`, `signal`, `Router`, `utils`)
- `apps/web/src/services` — `HttpClient` and service classes (AuthService, UserService)
- `apps/web/src/modules` — feature modules (pages, components, routes)
- `apps/web/src/state` — app-wide signals and actions

## Core concepts

- Component: class-based UI unit. Implement `getInitialState()` and `render()`.
- Signal: tiny observable used for global state and reactivity.
- Router: SPA router that instantiates page components and publishes the active view via `viewSignal`.
- Root: the app shell that subscribes to `viewSignal` and mounts the current page into `#app-view`.

## Renderer and lifecycle (practical)

1. `render()` may return strings, `HTMLElement`, or an array mixing strings and Component instances.
2. The renderer mounts Component instances into a stable root element created per-instance and stores it on the instance (e.g. `_root`).
3. On mount the renderer calls `attachEventListeners()` and `onMount()`.
4. On route change or replacement the renderer calls `unmount()` on the previous component (try/catch), recursively unmounts its children, then removes the root from DOM.

This lifecycle ensures event listeners and subscriptions are cleaned up and prevents leaks.

## HttpClient (summary)

`src/services/api/HttpClient.ts` is a small fetch wrapper exposing `get`, `post`, `put`, `patch`, and `delete`. It throws `ApiError` for non-OK responses and accepts an optional `Signal<string|null>` token to keep the Authorization header reactive.

## How to create a Page (101)

1) Create the Page class

Create `apps/web/src/modules/<feature>/Pages/MyPage/MyPage.ts`:

```ts
import Component from '../../../../core/Component';

type Props = {};
type State = { count: number };

export default class MyPage extends Component<Props, State> {
  constructor(props: Props = {}) { super(props); }
  getInitialState(): State { return { count: 0 }; }

  render() {
    return [
      `<div class="my-page">`,
      `<h1>My Page</h1>`,
      new MyChildComponent(),
      `</div>`
    ];
  }

  protected attachEventListeners(): void {
    // use this.element to query and attach DOM listeners
  }

  onMount(): void {
    // optional setup
  }

  onUnmount(): void {
    // cleanup timers, subscriptions, etc.
  }
}
```

2) Add components

Create child components in the `components/` folder and export them from `index.ts` in the feature.

3) Register route

Add your route in `apps/web/src/modules/<feature>/Router/router.ts`:

```ts
export const routes = [
  { path: '/my-page', component: MyPage, props: {} },
];
export default routes;
```

4) Use services & state

- Import `httpClient` from `src/services/api/client` to call your backend.
- Use `Signal` from `src/state` for shared state; call `signal.set(...)` to update and `signal.get()` to read.

5) Ensure cleanup

- Implement `onUnmount()` to remove subscriptions and event listeners to avoid leaks.

## Recommended development workflow

- Create a small Page and route, start the dev server, and visit the path.
- Use browser devtools to inspect `#app-view` and ensure only one page root is mounted at a time.
- Add unit tests for components that rely on external subscriptions to assert cleanup is called on `unmount()`.

## Optional next improvements

- Add a scaffold script (node script) to generate Page + component + route files.
- Add automatic linting/formatting and tests for renderer behavior.

````
