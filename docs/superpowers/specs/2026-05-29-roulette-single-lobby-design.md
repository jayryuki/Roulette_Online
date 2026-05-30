# Roulette Single-Lobby Auto-Join Design

## Problem

Current roulette requires manual room creation and room-code sharing. When a second player joins, a duplicate-name bug appears. The UX is needlessly complex for a casual drop-in game like roulette.

## Solution

Replace the room-creation flow with server-managed auto-table assignment. Players enter their name and click "Play" — the server places them at an available table or creates a new one.

## User Flow

1. Player visits roulette URL → lobby page
2. Enters name (auto-filled from localStorage if previously saved)
3. Clicks "Play" → `POST /api/roulette/join { displayName }`
4. Server finds a roulette room with open slots, or creates one
5. Server returns `{ roomId }`
6. Frontend joins via `colyseusClient.joinById(roomId, { displayName })`
7. Redirects to `/game` (no roomCode in URL)

Solo mode is unchanged: click "Solo" → `/solo`.

## Name Change

- In the player sidebar, an edit icon next to your name
- Click → inline text field → type new name → press Enter or blur
- Sends `change-name` message to the room with `{ displayName }`
- Server validates (non-empty, max 20 chars) and updates `player.displayName`
- New name saved to localStorage

## Server Changes

### `index.ts` — new endpoint

```
POST /api/roulette/join
Body: { displayName: string }
Response: { roomId: string }
```

Logic:
1. Query all existing roulette rooms via `matchMaker`
2. Find one with `clients.length < maxClients`
3. If none found, create a new room via `matchMaker.createRoom('roulette', { roomCode: 'auto' })`
4. Return the room's `roomId`

### `RouletteRoom.ts` — simplified

- Remove `roomCode` from state (set to `'auto'` or omit)
- Remove `hostPlayerId` / `isHost` logic — no host, no kick
- Remove `update-settings` message handler — settings are fixed defaults
- Add `onMessage('change-name')` handler:
  - Validate: non-empty, max 20 chars, trim whitespace
  - Update `player.displayName`
- Remove `kick-player` message handler
- Keep `maxClients = 8`
- Keep all betting/spinning/settlement logic unchanged

### `RouletteGameState.ts` — schema changes

- `roomCode` can be empty string or `'auto'` (kept for schema compatibility but not displayed)
- `hostPlayerId` kept as empty string (schema compat) but not used
- Remove `isHost` from `PlayerSchema`

## Frontend Changes

### `App.tsx`

- Change route from `/game/:roomCode` to `/game`
- Keep `/solo` route unchanged

### `Lobby.tsx`

- Remove: Create Room button, Join by Code input, Active Rooms list
- Keep: Name input, Solo button, ThemeToggle
- Add: "Play" button that calls `autoJoin()`
- Name input auto-fills from `localStorage.getItem('roulette_displayName')`
- On name change, save to localStorage

### `Game.tsx`

- Remove room code display from top bar
- Remove Settings panel (no host settings)
- Remove `roomCode` param from route — get state from room, not URL
- Add name-edit UI in sidebar (edit icon → inline field → send `change-name`)

### `useRouletteRoom.ts`

- Add `autoJoin(displayName)` method:
  1. `POST /api/roulette/join { displayName }`
  2. `colyseusClient.joinById(roomId, { displayName })`
  3. Set up listeners, return room
- Remove `joinRoom(roomCode, displayName)` — replaced by `autoJoin`
- Remove `createRoom()` — server handles room creation

### `PlayerSidebar.tsx`

- Add edit icon next to current player's name
- Clicking opens inline text input
- On submit: send `change-name` message, save to localStorage

### `SettingsPanel.tsx`

- Remove entirely (no host, no settings)

## What Stays the Same

- Solo mode (`/solo`, `useRouletteSolo`) — completely unchanged
- All betting grid, chip tray, wheel, drag-and-drop logic
- Spin, settlement, chat, swap-color, repeat-bet, clear-bets
- Colyseus WebSocket connection (production uses `window.location.host`, dev uses `localhost:2500`)
- 8-player cap per table, auto-create new tables when full
