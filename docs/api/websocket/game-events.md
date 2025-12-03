# Game WebSocket events

Connect to the game Socket.IO gateway at `/api/games/ws/socket.io` with the query parameter `token=<JWT>`. The gateway forwards the connection to the game service and injects internal headers; clients only need to provide the JWT.

## Client → Server events

| Event | Payload | Description |
| --- | --- | --- |
| `join_game` | `{ "gameId": "<uuid>" }` | Join the specified game room so updates are scoped to that match. |
| `ready` | `{ "gameId"?: "<uuid>" }` | Mark the authenticated player ready; if `gameId` is omitted the active room is used. |
| `paddle_move` | `{ "gameId"?: "<uuid>", "direction"?: "up"\|"down", "deltaTime"?: number, "y"?: number }` | Move the paddle either by direction or by providing a delta `y` displacement. |

## Server → Client events

| Event | Payload | Description |
| --- | --- | --- |
| `game_state` | `{ "gameId": "<uuid>", "ball": { "x": number, "y": number, "vx": number, "vy": number }, "paddles": { "left": { "y": number }, "right": { "y": number } }, "score": { "player1": number, "player2": number }, "status"?: "WAITING"\|"IN_PROGRESS"\|"FINISHED"\|"CANCELLED" }` | Streaming game state updates for the active room. |
| `game_start` | `{ "gameId": "<uuid>" }` | All required players are ready and the match has begun. |
| `player_joined` | `{ "playerId": "<uuid>" }` | A new player joined the room. |
| `player_left` | `{ "playerId": "<uuid>" }` | A player disconnected or left the room. |
| `error` | `{ "message": string }` | Request was rejected (e.g., missing gameId or invalid input). |

## Authentication

Provide the JWT as `token` in the query string when opening the Socket.IO connection. The gateway validates the token and forwards the authenticated user context to the game service.
