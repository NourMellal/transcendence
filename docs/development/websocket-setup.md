# WebSocket Setup Guide

This guide explains how to connect to the Socket.IO endpoint exposed by the API Gateway and how to bypass the gateway to hit the game-service directly during local troubleshooting.

## Connection Modes

### Through the API Gateway (recommended)
- **URL:** `http://localhost:3000`
- **Path:** `/api/games/ws/socket.io`
- **When to use:** Default for local dev, staging, and production; keeps the gateway's auth, rate limits, and path stripping in place.

### Direct to game-service (debugging only)
- **URL:** `http://localhost:3002`
- **Path:** `/socket.io`
- **When to use:** Narrow debugging of game-service WebSocket handlers when gateway configuration might be masking the issue.

## Environment Variable Combinations (frontend)
| Mode | `VITE_WS_GAME_URL` | `VITE_WS_GAME_PATH` | Notes |
| ---- | ------------------ | ------------------- | ----- |
| Gateway (default) | `http://localhost:3000` | `/api/games/ws/socket.io` | Matches the proxy defined in `docs/api/paths/games.yaml` and the SPA defaults. |
| Direct game-service | `http://localhost:3002` | `/socket.io` | Bypasses the gateway; keep REST calls pointing at the gateway to avoid mixed auth flows. |
| Remote gateway | `<https://gateway.example.com>` | `/api/games/ws/socket.io` | Use when testing against a deployed stack. |

> Tip: Set these variables in your `.env.local` inside `apps/web` or via `VITE_WS_GAME_URL=<...> VITE_WS_GAME_PATH=<...> pnpm dev:web`.

## Authentication
- The Socket.IO handshake requires a **JWT** passed as `?token=<jwt>` in the query string.
- Tokens are issued by the gateway's HTTP login flow; reuse the same token the SPA stores for REST calls.
- A missing or invalid token triggers an `error` event payload with a message such as `Unauthorized: missing token`.

## Troubleshooting Checklist
1. **Handshake fails immediately:**
   - Ensure the URL + path combination matches the mode you're using; the gateway path includes `/api/games/ws`.
   - Confirm the `token` query parameter is present and not expired.
2. **CORS/socket transport errors:**
   - In direct mode, verify the game-service allows your origin; the default server enables `cors: { origin: '*' }` for local dev.
3. **Joined but no game updates:**
   - Send a `join_game` event with the `gameId` from the REST lobby API before emitting `ready` or `paddle_move`.
   - Keep `deltaTime` small (e.g., `0.016`) to match the game loop cadence.
4. **Gateway proxy quirks:**
   - If the gateway rewrites paths incorrectly, test direct mode to isolate.
   - Check the gateway logs for 401/426 responses while connecting.

## Quick Testing Snippets

### Node one-liner
```bash
node -e "const { io } = require('socket.io-client'); const socket = io('http://localhost:3000', { path: '/api/games/ws/socket.io', query: { token: process.env.TOKEN } }); socket.on('connect', () => socket.emit('join_game', { gameId: process.env.GAME_ID })); socket.on('game_state', console.log); socket.on('error', console.error);"
```

### Minimal TypeScript client
```ts
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:3000', {
  path: '/api/games/ws/socket.io',
  query: { token: '<jwt>' },
});

socket.on('connect', () => {
  socket.emit('join_game', { gameId: '<uuid>' });
  socket.emit('ready', { gameId: '<uuid>' });
});

socket.on('game_state', (state) => console.log('tick', state));
socket.on('error', (err) => console.error('ws error', err));
```

## Related Docs
- Event-level contracts: [`docs/api/websocket-events.yaml`](../api/websocket-events.yaml)
- REST/WebSocket path reference: [`docs/api/paths/games.yaml`](../api/paths/games.yaml)
- Environment examples: root [`./.env.example`](../../.env.example) and service-specific [`./services/game-service/.env.example`](../../services/game-service/.env.example)
