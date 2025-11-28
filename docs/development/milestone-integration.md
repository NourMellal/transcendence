# Milestone: Frontend to API Gateway to Game/User Integration

Scope: ship an end-to-end path that uses the API gateway and Vault-backed services for auth, friendship, and game play (HTTP + WS). Keep local arcade mode intact; add online flows via gateway.

## Current State Snapshot
- Backend: game-service HTTP + Socket.IO ready; handles `user-deleted` and tournament events; exposed through gateway proxies.
- Gateway: HTTP routes wired; WS proxy for `/api/games/ws` exists (prefix stripped, needs correct client path).
- Frontend: HttpClient with refresh/2FA, GameLobby UI, local-only canvas play, WebSocket client factory (unused in UI), user/friend features UI partially present but not fully wired.
- Docs: split OpenAPI files present; some endpoints not aligned with actual payloads; Vault configs exist per service.
- Gap: user-service currently not emitting the `user-deleted` event that game-service already consumes.

## Proposed Issues (assignable to 4 owners)
1) **Online game flow (frontend + gateway)**  
   - Wire lobby/game pages to `GameService` via `httpClient` through gateway (`/api/games`).  
   - Use new WS defaults (`VITE_WS_GAME_URL`, `VITE_WS_GAME_PATH=/api/games/ws/socket.io`) to join/ready/send inputs; render remote state in canvas.  
   - Error/loading/timeout states handled; fallback mock behind a dev flag only.

2) **Auth + profile integration (frontend)**  
   - Hook login/register to `/api/auth/*` with HttpClient refresh; persist tokens in `appState`.  
   - Fetch `/api/users/me` on app load/dashboard; show profile and friendship status (read-only is fine this sprint).  
   - Add logout path that clears tokens and redirects via HttpClient logout.

3) **User-service to game-service events (backend)**  
   - Emit `user-deleted` (and basic status changes if available) from user-service to the event bus; document contract.  
   - Add integration test that game-service receives and cancels active games for deleted users.  
   - Update infra/env to ensure gateway has credentials for the broker if needed.

4) **API spec + Vault/env alignment (cross-team)**  
   - Update `docs/api/paths/games.yaml` and related schemas to match current gateway/game-service payloads (include WS path note).  
   - Add README snippet for `VITE_WS_GAME_URL`/`VITE_WS_GAME_PATH` defaults and gateway WS usage.  
   - Verify Vault secrets/templates for api-gateway/game-service include internal API key + URLs referenced in docs.

## Acceptance Markers for the Milestone
- A logged-in user can create/join a game through the gateway and see it in the lobby.  
- WS connection established via `/api/games/ws/socket.io` with token query; game state events reach the canvas.  
- Deleting a user triggers cleanup in game-service (test proves it).  
- Docs and env defaults reflect the above; no "magic" localhost ports left undocumented.
