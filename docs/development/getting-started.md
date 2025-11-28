# Getting Started (Under 10 Minutes)

This quickstart walks a new contributor from clone to a running gateway, game-service, and web client fast. It links to env examples and the WebSocket guide for deeper context.

## 1) Clone and toolchain
```bash
# Ensure pnpm is available
corepack enable

# Clone and enter the repo
git clone https://github.com/NourMellal/transcendence.git
cd transcendence
```

## 2) Install dependencies
```bash
pnpm install
```
> Tip: pnpm is already vendored via `corepack`; no manual install is needed.

## 3) Prepare env files
Copy the provided examples so services boot without hunting for secrets:
```bash
cp .env.example .env
cp services/game-service/.env.example services/game-service/.env
```
See the full examples in [root `.env.example`](../../.env.example) and [game-service `.env.example`](../../services/game-service/.env.example) before changing anything.

## 4) Start required infra (RabbitMQ, Redis, Vault)
```bash
pnpm docker:up
```
This uses `docker-compose.yml` to start all supporting containers in detached mode.

## 5) Launch gateway + game-service + web (three terminals)
```bash
# Terminal 1 - API Gateway
pnpm dev:gateway

# Terminal 2 - Game Service
pnpm dev:game

# Terminal 3 - Web client
pnpm dev:web
```
Navigate to `http://localhost:4173` (Vite dev server) and log in/register via the gateway at `http://localhost:3000`.

## 6) Connect to WebSockets
The SPA uses Socket.IO to reach the game loop. The defaults already point at the gateway proxy (`VITE_WS_GAME_URL=http://localhost:3000`, `VITE_WS_GAME_PATH=/api/games/ws/socket.io`). If you need to override them, follow the [WebSocket Setup Guide](./websocket-setup.md).

## 7) Run the full stack later
When you have more time or need other services:
```bash
pnpm dev:all
```
This spawns user, chat, tournament, gateway, and web concurrently.

## Troubleshooting
- Containers not starting? Run `pnpm docker:logs` to view the compose output.
- WebSocket 401 or handshake errors? Double-check your JWT token in the query string per the [WebSocket events reference](../api/websocket-events.yaml).
- Need a clean slate? Stop services with `Ctrl+C` in each terminal and bring down infra via `pnpm docker:down`.
