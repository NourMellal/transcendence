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

# Start dev server
cd apps/web
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Testing the Mock API

When you run `pnpm dev`, the application will start with MSW enabled. Open your browser to `http://localhost:5173` to see an interactive test interface where you can:

1. Test each endpoint individually
2. View request/response data
3. Verify that all endpoints work correctly

The mock API is configured to:
- Return proper status codes (200, 201, 204, 401)
- Match the `User` model structure from the OpenAPI spec
- Handle authentication state
- Support JSON and multipart form-data

## User Model

All mock responses match this TypeScript interface from the OpenAPI spec:

```typescript
interface User {
  id: string;           // UUID format
  username: string;
  email: string;
  avatar: string | null;
  is2FAEnabled: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'INGAME';
}
```

## Architecture

The frontend follows a **service-oriented architecture** ensuring clean separation between UI, API communication, and data models.

```
src/
├── main.ts                    # Application entry point
├── services/
│   ├── api/
│   │   ├── HttpClient.ts      # Generic HTTP client wrapper
│   │   ├── UserService.ts     # User-related API calls
│   │   └── ...                # Other service modules
│   └── auth/
│       └── AuthService.ts     # Authentication API calls
├── models/                    # Frontend data models (DTOs)
│   ├── User.ts                # User model interfaces
│   ├── Auth.ts                # Auth-related DTOs
│   └── index.ts               # Model exports
├── mocks/                     # MSW mock handlers
│   ├── browser.ts             # MSW worker setup
│   ├── handlers.ts            # Mock API handlers
│   └── data.ts                # Mock data
├── components/                # UI components (future)
├── pages/                     # Page controllers (future)
└── router/                    # Client-side routing (future)
```

### Realtime Game Modules

Realtime gameplay, chat, and presence features live under `src/modules`:

```
src/modules/
├── shared/
│   ├── services/WebSocketClient.ts     # Auth-aware WS client with reconnect, heartbeat, queueing
│   └── types/websocket.types.ts        # Message/DTO definitions (game state, chat, presence)
└── game/
    ├── services/GameRealtimeService.ts # High-level API for join/leave, chat, presence, paddle moves
    └── components/
        ├── GameScreen.ts               # Composed view for canvas + chat + presence
        ├── GameCanvas.ts               # Handles WS connection + state updates + keyboard inputs
        ├── GameChatPanel.ts            # Subscribes to chat events and emits new messages
        └── GamePresenceIndicator.ts    # Tracks live players/presence updates
```

To preview the realtime UI, navigate to `/game?gameId=<id>` while the dev server is running. The screen bootstraps the WebSocket connection, renders the canvas, and listens for chat/presence updates using the shared client.

> **Local mock:** set `VITE_WS_USE_MOCK=true` in `apps/web/.env` (or the shell) to swap the browser's connection for an in-memory `MockGameWebSocket`. This simulates auth, game state ticks, chat echoes, and presence updates so you can exercise the UI without the backend.

### Design Principles

**What Frontend SHOULD Know:**
- ✅ HTTP endpoints (e.g., `/api/users/me`)
- ✅ JSON request & response structures
- ✅ HTTP methods & status codes
- ✅ OpenAPI spec (DTOs/contracts)

**What Frontend SHOULD NOT Know:**
- ❌ Domain entities or value objects
- ❌ Use cases or business logic
- ❌ Repository, service, or database layers
- ❌ Any internal backend structure

The frontend acts as a **pure REST consumer**, communicating only through the API Gateway.

## Notes

- The mock API runs entirely in the browser using MSW service workers
- No backend server is required for frontend development
- State is maintained in memory and resets on page reload
- OAuth login flow (`/auth/42/login`) is intentionally not mocked as it's a redirect to external SSO

## Testing the WebSocket Client & Game Modules

Manual validation checklist (requires a running WS backend or mock server that understands the documented events):

1. Visit `/game?gameId=<some-id>` so the `GameScreen` mounts.
2. Ensure the console logs `[WS] Connecting…` followed by `Connected` and `Authenticating…`.
3. Simulate server responses for:
   - `game_state_update`: canvas should update ball/paddles/score instantly.
   - `game_chat_message`: messages appear in the chat panel with timestamps.
   - `presence_update`: entries show up in the presence list grouped by status.
4. Disconnect the backend temporarily; confirm auto-reconnect logs with exponential delays and queued paddle/chat messages flush after reconnection.
5. Call `gameWS.disconnect()` (or leave the page) to verify heartbeats stop and subscriptions are cleaned up.

For automated verification, you can pair the client with a lightweight mock WebSocket server (e.g., using `ws` + MSW or vitest) to assert event flow, message queueing, and heartbeat behavior before integrating against the real Game Service.

When `VITE_WS_USE_MOCK=true`, the bundled `MockGameWebSocket` already exercises most flows (join, state updates, chat echo, presence heartbeat) and logs `[WS Mock]` in the console so QA knows the fake server is in use.
