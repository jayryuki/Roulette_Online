# Roulette Online — Design Spec

**Date:** 2026-05-21
**Status:** Approved

## Overview

Multiplayer American Roulette game. Players join a room, place color-coded chips on
a betting grid, and watch a 3D wheel spin to determine the outcome. The RouletteRoom
runs on the existing mahjong Colyseus server (port 2500) alongside Mahjong and
Blackjack. A standalone web client is served from its own subdomain.

## Architecture

```
mahjong repo (apps/server)                  Roulette_Online repo
+----------------------------------+        +------------------------------+
|  Colyseus Server :2500           |        | packages/                    |
|  +----------------------------+  |        |   roulette-game-core/        |
|  |  MahjongRoom               |  |        |     (pure game logic)        |
|  |  BlackjackRoom             |  |        |                              |
|  |  RouletteRoom (NEW)        |  |<-------| apps/web/                    |
|  +----------------------------+  |        |   (React + Vite + Three.js)  |
|                                  |        |   builds -> roulette-dist    |
|  Express routes:                 |        +------------------------------+
|   /api/rooms                     |
|   mahjong-dist/                  |
|   blackjack-dist/                |
|   roulette-dist/ (NEW)            |
+----------------------------------+
```

- The RouletteRoom imports `@roulette/game-core` for wheel layout, bet validation,
  and payout calculations.
- The web client builds to `roulette-dist/` and is served by the mahjong server's
  Express middleware based on host header.
- No separate Colyseus process — all three games share the same server.

## Files to Create / Modify

### Roulette_Online repo

| File | Action | Purpose |
|---|---|---|
| `packages/roulette-game-core/` | Create | Pure game logic — wheel, bets, payouts, FSM |
| `apps/web/` | Create | React + Vite + Tailwind + Three.js frontend |
| `pnpm-workspace.yaml` | Create | Workspace config |
| `package.json` | Create | Root package.json |
| `tsconfig.base.json` | Create | Shared TS config |

### mahjong repo

| File | Action | Purpose |
|---|---|---|
| `apps/server/src/rooms/RouletteRoom.ts` | Create | Colyseus Room handler |
| `apps/server/src/rooms/schema/RouletteGameState.ts` | Create | Synced Schema |
| `apps/server/src/index.ts` | Edit | Register room, add routes, serve dist |
| `apps/server/package.json` | Edit | Add `@roulette/game-core` workspace dep |

## Game Flow

```
LOBBY -> BETTING -> SPINNING -> SETTLEMENT -> ROUND_END -> (back to BETTING)
```

### LOBBY
- Players join, pick a seat (0-7). Auto-assigned next available if not chosen.
- Chip color auto-assigned from 8-color palette (first unclaimed index).
- Players can swap colors via `swap-color { targetIndex }` — rejected if taken.
- Released on leave.
- Toggle ready. Host clicks "Start Round" when all ready.

### BETTING
- All 8 players bet simultaneously. No turn order.
- Configurable timer (default 30s), shown as countdown.
- Players click cells on the betting grid, pick a denomination from the chip tray.
- Server validates: phase=BETTING, player has sufficient bankroll, bet within min/max.
- Chips appear on the grid color-coded per player. All clients see all chips.
- Players can remove their own chips before the timer expires.
- Timer expires or host clicks "Spin" -> transition to SPINNING.

### SPINNING
- Betting locked. Server generates winning number (crypto random, 0-37 where 37=00).
- Server broadcasts `spin-result { number }` to all clients.
- Clients animate 3D wheel (Three.js) to land on that pocket (3-5s deterministic animation).
- No new bets accepted.

### SETTLEMENT
- Server calculates payouts for each chip using a payout table.
- Winning bets: player receives bet * (payout + 1). Losing bets: chips cleared.
- Bankrolls updated. Results displayed — winning bets glow, losing chips fade.
- Hot/Cold numbers panel updates (last 20 spins, sorted by frequency).

### ROUND_END
- Results summary shown. Auto-transitions to BETTING after 10s (or host triggers).
- Players who went bankrupt ($0) can still sit at the table but can't bet.

## Mid-Game Join
Players can join during any phase. If joining during BETTING, they can place bets
immediately. If during SPINNING/SETTLEMENT, they observe and bet in the next round.

## American Roulette — Bet Types

| Bet Type | Description | Payout |
|---|---|---|
| Straight | Single number (0, 00, 1-36) | 35:1 |
| Split | Two adjacent numbers | 17:1 |
| Street | Row of 3 numbers | 11:1 |
| Corner | Block of 4 numbers | 8:1 |
| Five | 0-00-1-2-3 (only American) | 6:1 |
| Six Line | Two adjacent rows (6 numbers) | 5:1 |
| Dozen | 1st 12, 2nd 12, 3rd 12 | 2:1 |
| Column | Column of 12 numbers | 2:1 |
| Red/Black | Color | 1:1 |
| Even/Odd | Parity | 1:1 |
| Low/High | 1-18 / 19-36 | 1:1 |

## Chip Color Palette

8-player palette (distinct, colorblind-friendly):

| Index | Color | Hex |
|---|---|---|
| 0 | Red | #E53E3E |
| 1 | Blue | #3182CE |
| 2 | Green | #38A169 |
| 3 | Yellow | #D69E2E |
| 4 | Purple | #805AD5 |
| 5 | Orange | #DD6B20 |
| 6 | Cyan | #00B5D8 |
| 7 | Pink | #D53F8C |

Auto-assigned on join. Swappable via `swap-color` message if target is unclaimed.
Released on player leave.

## Hot/Cold Numbers

Track the last 20 winning numbers. Frontend renders a panel showing:
- **Hot numbers**: most frequent (red highlight)
- **Cold numbers**: least frequent (blue highlight)
- Simple frequency count, no complex weighting.

Stored in `GameState.lastResults` as `ArraySchema<string>` (JSON-encoded array).

## Table Settings

| Setting | Default | Configurable |
|---|---|---|
| Variant | American (0 + 00) | No |
| Min bet | $1 | Yes (host) |
| Max bet | $1000 | Yes (host) |
| Max players | 8 | Yes (host) |
| Bet timer | 30s | Yes (host, 10-120s) |
| Starting bankroll | $1000 | No |

## Colyseus Schema

```typescript
class ChipSchema extends Schema {
  playerId: string       // who placed it
  chipColor: uint8       // 0-7 palette index
  amount: uint32         // bet amount
  betType: string        // "straight_7", "red", "dozen_1", "split_1_2", etc.
}

class PlayerSchema extends Schema {
  playerId, displayName, seatIndex
  isConnected, isReady, isHost: boolean
  bankroll: uint32
  chipColor: uint8       // 0-7 palette index
  totalBetThisRound: uint32
}

class GameState extends Schema {
  phase: string          // LOBBY | BETTING | SPINNING | SETTLEMENT | ROUND_END
  status: string         // lobby | in-progress
  winningNumber: int8    // -1 until settled, then 0-37 (37=00)
  timerSeconds: uint8    // countdown during BETTING
  minBet, maxBet: uint32
  betTime: uint8         // configurable seconds
  maxPlayers: uint8      // configurable

  players: MapSchema<PlayerSchema>
  chips: ArraySchema<ChipSchema>
  lastResults: ArraySchema<string>  // JSON array of last 20 winning numbers
  chatMessages: ArraySchema<ChatMessageSchema>
  roundResult: string    // JSON settlement summary
}
```

## Server Messages

| Direction | Message | Data | When |
|---|---|---|---|
| Client -> Server | `choose-seat` | `{ seatIndex }` | Lobby |
| Client -> Server | `swap-color` | `{ targetIndex }` | Lobby |
| Client -> Server | `toggle-ready` | — | Lobby |
| Client -> Server | `start-round` | — | Host only, LOBBY or ROUND_END |
| Client -> Server | `place-bet` | `{ betType, amount }` | BETTING |
| Client -> Server | `remove-bet` | `{ chipIndex }` | BETTING |
| Client -> Server | `spin-now` | — | Host, BETTING (early spin) |
| Client -> Server | `chat` | `{ text }` | Any phase |
| Client -> Server | `update-settings` | `{ minBet?, maxBet?, maxPlayers?, betTime? }` | Host, LOBBY |
| Server -> Client | `place-your-bets` | `{ timerSeconds }` | BETTING starts |
| Server -> Client | `spin-result` | `{ number }` | SPINNING starts |
| Server -> Client | `round-result` | `{ winningNumber, results, bankrolls }` | SETTLEMENT |
| Server -> Client | `shuffling` | — | No-op (registered for compat) |

## Data Flow — Betting Example

1. Client clicks cell on betting grid, selects $25 chip from tray.
2. Client -> Server: `place-bet { betType: "straight_17", amount: 25 }`
3. Server validates phase=BETTING, player has >= $25 available, amount between min/max.
4. Server deducts $25 from internal bankroll, pushes `ChipSchema` to `state.chips`.
5. All clients see chip appear on grid in that player's color with "$25".
6. Player can send `remove-bet { chipIndex: 3 }` to undo.
7. When timer expires: server transitions to SPINNING, locks chip array.

## Data Flow — Settlement Example

1. Server generates random number 17 (crypto-based, uniform over 0-37).
2. Server -> All: `spin-result { number: 17 }`
3. Clients animate 3D wheel to pocket 17 over 3-5 seconds.
4. Server iterates `state.chips`, checks each bet against winning number:
   - `straight_17` -> hit, payout 35:1 -> player gets $25 * 36 = $900
   - `red` -> 17 is black -> miss, lose $10
   - `odd` -> 17 is odd -> hit, payout 1:1 -> player gets $50 * 2 = $100
5. Server updates all bankrolls, clears chip array, pushes result to `lastResults`.
6. Server -> All: `round-result { winningNumber: 17, results: [...], bankrolls: {...} }`
7. Transition to SETTLEMENT (5s display) -> ROUND_END (10s) -> BETTING.

## Frontend Layout

```
+--------------------------------------------------+
|  Header: room code, phase, timer countdown        |
+----------------------+---------------------------+
|                      |                           |
|   3D Wheel Canvas    |   Player Sidebar          |
|   (Three.js)         |   - bankrolls             |
|                      |   - chip colors           |
|                      |   - ready status           |
|                      |   - hot/cold numbers       |
|                      |   - chat                  |
+----------------------+---------------------------+
|                                                   |
|         Betting Grid (2D HTML/CSS)                |
|    +--------------------------------------+       |
|    |  0 │ 00 │ 1 │ 2 │ 3 │...│ 34│ 35│ 36│       |
|    |  ───┼────┼───┼───┼───┼───┼───┼───┼───│       |
|    |     1st 12    │  2nd 12   │  3rd 12   │       |
|    |  1-18 (EVEN)  │  RED      │  BLACK    │       |
|    |  ODD  19-36   │  BLACK    │  RED      │       |
|    +--------------------------------------+       |
|                                                   |
|   Chip Tray: $1  $5  $25  $100  $500              |
|   [Clear My Bets]  [Spin] (host only)             |
+--------------------------------------------------+
```

- **3D Wheel**: Three.js scene with American wheel mesh. Ball bounces deterministically
  to server-specified pocket. Rotates 3-5 full spins + offset to land on target.
- **Betting Grid**: HTML/CSS grid matching American layout. Clickable cells.
  Chips rendered as colored circles with denomination text. Only own chips
  are removable (others are read-only display).
- **Sidebar**: Bankroll list with chip color indicator, ready toggle, hot/cold
  panel, chat box.
- **Chip Tray**: Quick-select denomination buttons. Click a value, then click
  the grid to place. Selected chip is highlighted.
- **Mobile**: Responsive — stacks wheel on top, grid below, sidebar as bottom sheet.

## Race Conditions & Safety

Roulette is a simultaneous game (all players act at once during BETTING), so the
turn-based `isMyTurn` race condition from Blackjack does NOT apply. Key guards:

- **Bet validation is server-authoritative.** Client may optimistically show the chip
  but server rejects invalid bets (phase mismatch, insufficient funds, duplicate bet).
- **Timer enforcement.** When BETTING timer expires, server forces transition regardless
  of client state. Players who haven't bet simply sit out the round.
- **Phase gating.** Every message handler checks `this.state.phase` before acting.
- **Bankroll integrity.** Deducted on bet placement, credited on settlement.
  Internal `Map<string, InternalPlayer>` holds authoritative bankroll.

## Testing Strategy

- **game-core**: Pure unit tests for wheel layout, bet resolution, payout calculation.
  No Colyseus dependency — testable with plain Jest/Vitest.
- **RouletteRoom**: Integration tests with Colyseus test client. Create room, join
  players, place bets, verify settlement payouts match expected values.
- **Web client**: Playwright tests for betting grid interaction, chip placement,
  wheel animation triggers.

## Dependencies (server)

```json
{
  "@colyseus/core": "^0.16.0",
  "@colyseus/schema": "^3.0.0",
  "@colyseus/ws-transport": "^0.16.0",
  "@roulette/game-core": "workspace:*",
  "express": "^4.21.0"
}
```

## Dependencies (web client)

```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "colyseus.js": "^0.16.0",
  "three": "^0.170.0",
  "@react-three/fiber": "^9.0.0",
  "@react-three/drei": "^9.0.0",
  "tailwindcss": "^4.0.0",
  "vite": "^6.0.0"
}
```

## Port & Hosting

- Colyseus WebSocket: port 2500 (shared with mahjong + blackjack)
- Web client: served by mahjong server Express, routed by host header
  (e.g. `roulette.jayryuki.com` -> roulette-dist)
- Web client dev server: port 4500 (Vite)
