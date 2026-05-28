# Roulette UX & Bug Fixes

Date: 2026-05-27

## Overview

Six changes to the roulette game: five UX improvements and one bug fix, plus an inactivity-based betting timer.

---

## 1. Repeat Last Bet

**Server**: Add `lastBets: Array<{betType: string, amount: number}>` to `InternalPlayer`. At the start of each new betting round (`startBettingPhase`), snapshot each player's current chips into `lastBets`, then clear. Add a `repeat-last-bet` message handler that iterates `lastBets` and re-places each bet (same validation as `place-bet`: check phase, bankroll, bet validity). Skip any individual bet that exceeds available bankroll.

**Client**: Add a "Repeat Bet" button in `ChipTray`, positioned next to the Clear button. Only visible when: (a) phase is BETTING, (b) player has a `lastBets` array from the server. Send `repeat-last-bet` on click. Disable if available bankroll is less than the total of last bets.

---

## 2. Horizontal Board Layout

Rotate `BettingGrid` to the traditional horizontal roulette layout, applying to both desktop and mobile:

```
[0] [3] [6] [9]  ... [36] [2:1]
    [2] [5] [8]  ... [35] [2:1]
[00][1] [4] [7]  ... [34] [2:1]
    [1st 12] [2nd 12] [3rd 12]
    [1-18][EVEN][RED][BLK][ODD][19-36]
```

- 0 and 00 span rows on the left edge
- Numbers go left-to-right in the traditional 3-row arrangement
- Column bets (2:1) on the right edge
- Dozens and even-money bets span the bottom

Cell sizing: desktop cells ~36x28px, mobile cells scale to fit viewport width (minimum 44px touch targets). The grid is horizontally scrollable on narrow screens.

---

## 3. Split / Street / Corner / Top Line / Double Street Bets + Draggable Chips

### Bet Types & Payouts

| Bet Type | Covers | Payout | betType format |
|----------|--------|--------|----------------|
| Straight | 1 number | 35:1 | `straight_N` (existing) |
| Split | 2 adjacent numbers | 17:1 | `split_N_N` |
| Street | 3 numbers in a row | 11:1 | `street_N_N_N` |
| Corner | 4 numbers in a square | 8:1 | `corner_N_N_N_N` |
| Top Line | 0,00,1,2,3 | 6:1 | `topline` |
| Double Street | 6 numbers (2 streets) | 5:1 | `doublestreet_N_N_N_N_N_N` |

Numbers in betType are sorted ascending for consistency.

### Server-side (@roulette/game-core)

- Add validation functions for each new bet type (verify numbers are actually adjacent on the roulette board)
- Add payout calculation for each new bet type
- Add `validateBet` support for the new patterns

### Client-side (BettingGrid)

**Draggable chips**: Chips are dragged from the ChipTray onto the board. On drag start, create a chip element at the cursor position. On drag over the grid, highlight the nearest valid drop zone. On drop, place the bet.

**Drop zone detection**: Each cell has a central zone (straight bet) and edge zones:
- **Horizontal edge** between two vertically adjacent numbers → split
- **Vertical edge** between two horizontally adjacent numbers → split
- **Corner intersection** where 4 numbers meet → corner
- **Left edge of row** → street (3 numbers in that row)
- **Left edge spanning two rows** → double street

Edge zones are detected by cursor position relative to cell boundaries (within ~20% of the cell edge triggers edge zone).

**Top line**: Drop zone on the edge between 0 and 00 (or a dedicated zone at the top of the 0/00 area).

**Removing chips**: Drag a placed chip off the betting mat to remove it. No right-click removal. On drag end, if the chip is outside the grid bounds, send `remove-bet`.

**Visual feedback**: During drag, show a semi-transparent chip at cursor. Highlight valid drop zones. On hover over an edge/intersection, highlight all numbers covered by that bet.

---

## 4. Cash Amount — Bigger & Front and Center

Move the bankroll display from the top bar (solo) / sidebar (multiplayer) to a prominent position directly above the betting board, centered.

- Font size: 2rem on desktop, 1.5rem on mobile
- Color: green (`var(--success)`) when positive, red (`var(--danger)`) when zero
- Format: `$1,234` with Inter font, weight 700
- Show available balance below in smaller text: `$984 available` when bets are placed
- This replaces the small bankroll in the top bar and sidebar; remove those duplicates
- Apply to both solo and multiplayer modes

---

## 5. Win/Loss History

**Server**: Add `roundHistory: Array<{netProfit: number}>` to `InternalPlayer`. After each settlement, push the player's net profit for that round. Keep last 10 entries. Sync to client via a new field on `PlayerSchema`: `roundHistory: string` (JSON-encoded array).

**Client**: Below the bankroll display, show a horizontal scrollable list of the last 10 round results. Each entry:
- `+$150` in green or `-$75` in red
- Small pill/chip style, compact font (0.75rem)
- Most recent on the right
- If no history yet, show nothing (no empty state)

---

## 6. Inactivity-Based Betting Timer

**Server**: Change the betting timer from a fixed countdown to an inactivity timer. When the betting phase starts, do NOT start the countdown immediately. Instead, start a 30-second inactivity timer. Any `place-bet` or `repeat-last-bet` message resets this inactivity timer. Once 30 seconds pass with no bets placed, the betting phase closes and the wheel spins.

The `betTime` setting (default 30s) controls the inactivity duration, not a fixed phase length. There is no maximum phase duration — as long as players keep placing chips, the phase continues.

**Client**: Display the timer only once the inactivity countdown starts (after the first period of no betting activity). While players are actively placing chips, show "Place your bets" without a countdown. When the timer starts, show the countdown as today. Any bet placement resets the displayed timer.

---

## 7. Remove Players Immediately on Disconnect

**Server**: In `RouletteRoom.onLeave`, remove the `allowReconnection` logic. Always call `cleanupPlayer(client)` regardless of the `consented` flag. Remove the reconnection token storage in the client (`useRouletteRoom.ts`).

**Client**: Remove `SS_RECONNECTION_TOKEN` storage and the reconnection attempt in `joinRoom`. On page refresh, players simply rejoin as new players (the room code is still in sessionStorage for easy rejoin via the lobby).

---

## Implementation Order

1. Bug fix (#7) — simplest, unblocks testing
2. Inactivity timer (#6) — server timer change, independent
3. Horizontal board (#2) — layout foundation for draggable chips
4. Cash display (#4) — independent, quick
5. Win/loss history (#5) — builds on cash display
6. Repeat last bet (#1) — server + client, moderate
7. Draggable chips + multi-number bets (#3) — most complex, builds on horizontal layout
