# Game Lobby Improvements - Action Plan

## Issues Found

### 1. **Players Can't Discover Games**
**Problem**: After someone creates a game, other players have no way to find/join it unless they manually copy the URL.

**Root Cause**: 
- No public game list/browser
- No "Join Random Game" option
- Only direct URL navigation works

**Solution**:
- Add `/game/browse` route showing available public games
- Add "Quick Play" button that auto-matches with random game
- Show game list with: owner, settings, player count, join button
- Filter by game mode (CLASSIC/TOURNAMENT)

---

### 2. **No Owner Control Over Game Start**
**Problem**: Game auto-starts when both players mark ready, but owner should control when game begins.

**Root Cause**:
- Backend auto-starts game when all players ready
- No "Start Game" button for owner
- No owner role distinction in lobby

**Solution**:
- Add `isOwner` field to distinguish game creator
- Show "Start Game" button only to owner
- Require owner to explicitly start after both ready
- Disable auto-start on backend or add owner confirmation step

---

### 3. **Missing Game Legality/Validation**
**Problem**: No synchronization checks, speed/settings might differ, no anti-cheat basics.

**Root Cause**:
- Frontend controls paddle speed locally
- No server authoritative validation
- Settings might not sync properly

**Solution**:
- Backend should be authoritative for ALL game physics
- Frontend only sends inputs, receives state
- Validate all moves server-side
- Lock settings once game starts
- Add timestamp validation for inputs

---

## Implementation Priority

### **Phase 1: Game Discovery** (High Priority)
1. Create `BrowseGamesPage` component
2. Add `GET /games/available` endpoint (backend)
3. Add "Browse Games" button on dashboard
4. Show join button for each available game

### **Phase 2: Owner Controls** (High Priority)
1. Add `isOwner` field to GameLobby state
2. Show "Start Game" button (owner only)
3. Change ready system: both ready → owner can start
4. Backend: require owner start signal

### **Phase 3: Game Validation** (Medium Priority)
1. Move paddle speed to server config
2. Server validates all positions
3. Add input timestamps
4. Lock settings on game start
5. Add disconnect handling

---

## API Changes Needed

### New Endpoints
```typescript
GET /games/available
- Returns list of public, waiting games
- Filters: gameMode, playerCount
- Response: Game[] with player info

POST /games/:id/start (owner only)
- Starts game after both players ready
- Validates owner permission
- Response: Game with status IN_PROGRESS
```

### Modified Behavior
```typescript
POST /games/:id/ready
- Sets player ready, but doesn't auto-start
- Notifies other players
- Waits for owner start signal
```

---

## Frontend Components to Add/Modify

### New: `BrowseGamesPage.ts`
```typescript
interface BrowseGamesState {
  games: GameStateOutput[];
  filter: 'ALL' | 'CLASSIC' | 'TOURNAMENT';
  isLoading: boolean;
}
```

### Modify: `GameLobby.ts`
```typescript
interface GameLobbyState {
  // ... existing fields
  isOwner: boolean; // NEW
  canStart: boolean; // NEW - both ready + owner
}

// Add start button
private async handleStart(): Promise<void> {
  if (!this.state.isOwner) return;
  await gameService.startGame(this.props.gameId);
}
```

### Modify: `DashboardPage.ts`
```typescript
// Add "Browse Games" button
// Add "Quick Play" button (auto-join random game)
```

---

## WebSocket Events to Add

```typescript
// Owner starts game
gameWS.send('start_game', { gameId: string });

// Server confirms start
gameWS.on('game_starting', { gameId: string, countdown: number });
```

---

## Backend Changes Summary

### Game Service
1. Add `ownerId` field to Game entity
2. Add `GET /games/available` endpoint
3. Add `POST /games/:id/start` endpoint (owner check)
4. Modify ready logic to not auto-start
5. Add server-authoritative physics validation

### WebSocket Handlers
1. Handle `start_game` event (owner only)
2. Emit `game_starting` with countdown
3. Validate all paddle positions server-side

---

## Testing Checklist

- [ ] Create game → appears in browse list
- [ ] Other player can join from browse
- [ ] Both ready → start button appears (owner only)
- [ ] Owner clicks start → game begins for both
- [ ] Non-owner can't start game
- [ ] Settings locked after start
- [ ] Server validates all movements
- [ ] Disconnect handling works correctly

---

## Estimated Effort

- **Game Discovery**: 4-6 hours
- **Owner Controls**: 2-3 hours  
- **Server Validation**: 6-8 hours
- **Total**: ~12-17 hours

---

## Notes

- Keep existing direct URL join for private games
- Consider adding game passwords for private matches
- Add spectator mode later (out of scope for MVP)
- Consider anti-cheat measures (input validation, state checksums)
