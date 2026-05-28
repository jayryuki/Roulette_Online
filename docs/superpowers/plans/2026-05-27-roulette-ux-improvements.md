# Roulette UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 7 roulette improvements: fix player disconnect bug, add inactivity-based timer, horizontal board, prominent cash display, win/loss history, repeat last bet, and draggable chips with multi-number bets.

**Architecture:** Changes span three packages: `@roulette/game-core` (bet validation for adjacent numbers), `Game_Server/apps/server` (RouletteRoom + schema), and `Roulette_Online/apps/web` (all frontend components). The game-core already has split/street/corner/five/sixline bet types with payouts — we mainly need adjacent-number validation and the frontend drop-zone system.

**Tech Stack:** React, TypeScript, Colyseus (server + schema), Vite, pnpm workspaces

---

## File Structure

### Create
- `Roulette_Online/apps/web/src/components/BankrollDisplay.tsx` — prominent bankroll + win/loss history
- `Roulette_Online/apps/web/src/hooks/useDragChip.ts` — drag-and-drop chip logic
- `Roulette_Online/apps/web/src/lib/dropZones.ts` — betting grid drop-zone detection

### Modify
- `Game_Server/apps/server/src/rooms/RouletteRoom.ts` — inactivity timer, repeat bet, immediate disconnect, round history, last bets
- `Game_Server/apps/server/src/rooms/schema/RouletteGameState.ts` — add roundHistory, lastBets fields
- `Roulette_Online/apps/web/src/components/Game.tsx` — integrate BankrollDisplay, remove old bankroll
- `Roulette_Online/apps/web/src/components/BettingGrid.tsx` — horizontal layout, draggable drop zones, column bets
- `Roulette_Online/apps/web/src/components/ChipTray.tsx` — drag source, repeat bet button
- `Roulette_Online/apps/web/src/hooks/useRouletteRoom.ts` — remove reconnection logic
- `Roulette_Online/apps/web/src/types.ts` — add roundHistory to PlayerData
- `Roulette_Online/packages/roulette-game-core/src/models/bets.ts` — add adjacency validation for split/street/corner/sixline

---

### Task 1: Fix — Remove players immediately on disconnect

**Files:**
- Modify: `Game_Server/apps/server/src/rooms/RouletteRoom.ts` (onLeave method, ~line 120-145)
- Modify: `Roulette_Online/apps/web/src/hooks/useRouletteRoom.ts` (joinRoom function)

- [ ] **Step 1: Update server onLeave to always cleanup**

In `Game_Server/apps/server/src/rooms/RouletteRoom.ts`, replace the `onLeave` method:

```typescript
async onLeave(client: Client, consented: boolean) {
  const player = this.state.players.get(client.sessionId);
  if (player) {
    player.isConnected = false;
  }
  this.cleanupPlayer(client);
}
```

- [ ] **Step 2: Remove reconnection logic from client**

In `Roulette_Online/apps/web/src/hooks/useRouletteRoom.ts`:

Remove these constants:
```typescript
const SS_RECONNECTION_TOKEN = 'roulette_reconnectionToken';
```

Remove the `storeSession` and `getStoredSession` functions (keep `clearSession` but simplify it to only remove `SS_ROOM_CODE` and `SS_DISPLAY_NAME`).

In the `joinRoom` callback, remove the entire reconnection attempt block (the `if (stored && stored.roomCode === roomCode)` try/catch block). After `client.joinById`, remove the `storeSession(roomCode, room.reconnectionToken, displayName)` call and replace with just storing roomCode and displayName:

```typescript
try {
  sessionStorage.setItem(SS_ROOM_CODE, roomCode);
  sessionStorage.setItem(SS_DISPLAY_NAME, displayName);
} catch {}
```

- [ ] **Step 3: Rebuild and test locally**

Run: `cd ~/User_Apps/Games/Game_Server && pnpm build`
Run: `cd ~/User_Apps/Games/Roulette_Online && pnpm --filter @roulette/web build`

Verify no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: remove players immediately on disconnect, remove reconnection logic"
```

---

### Task 2: Inactivity-based betting timer

**Files:**
- Modify: `Game_Server/apps/server/src/rooms/RouletteRoom.ts` (startBettingPhase, handlePlaceBet, bet timer logic)

- [ ] **Step 1: Update startBettingPhase to use inactivity timer**

In `RouletteRoom.ts`, replace the `startBettingPhase` method. Instead of starting a countdown immediately, start an inactivity timeout:

```typescript
private startBettingPhase() {
  this.clearPhaseTimer();
  this.clearBetTimer();

  this.phase = 'BETTING';
  this.state.phase = 'BETTING';
  this.state.status = 'in-progress';

  // Reset round state
  this.state.chips.clear();
  this.state.winningNumber = -1;
  this.state.roundResult = '';
  for (const [sessionId, internal] of this.internalState) {
    internal.totalBetThisRound = 0;
    const p = this.state.players.get(sessionId);
    if (p) p.totalBetThisRound = 0;
  }

  // Don't start timer yet — wait for inactivity
  this.state.timerSeconds = 0;
  this.resetInactivityTimer();

  this.broadcast('place-your-bets', {});
}
```

Add a new method:

```typescript
private resetInactivityTimer() {
  this.clearBetTimer();
  this.state.timerSeconds = this.state.betTime;
  this.betTimer = setTimeout(() => {
    this.closeBetting();
  }, this.state.betTime * 1000);
}
```

- [ ] **Step 2: Reset inactivity timer on bet placement**

In `handlePlaceBet`, add `this.resetInactivityTimer();` after a successful bet is placed (right after the chip is pushed to `this.state.chips`).

Also add the same reset in `handleClearBets` and any future `handleRepeatLastBet`.

- [ ] **Step 3: Update the client timer display**

In `Game.tsx`, the timer is already displayed when `phase === 'BETTING'`. When `timerSeconds` is 0, show "Place your bets" instead of a number. This already works since `timerSeconds` starts at 0 now.

Update the multiplayer timer display section in `Game.tsx`:

```tsx
{!isSolo && phase === 'BETTING' && (
  gameState.timerSeconds > 0 ? (
    <span style={{
      fontFamily: "'Inter', sans-serif",
      fontWeight: 700,
      fontSize: '1rem',
      color: 'rgba(255,255,255,0.95)',
      background: 'rgba(0,0,0,0.3)',
      padding: '0.25rem 0.625rem',
      borderRadius: '6px',
      minWidth: '2.5rem',
      textAlign: 'center',
    }}>
      {gameState.timerSeconds}
    </span>
  ) : (
    <span style={{
      fontFamily: "'Inter', sans-serif",
      fontWeight: 600,
      fontSize: '0.75rem',
      color: 'var(--success)',
      background: 'rgba(0,0,0,0.3)',
      padding: '0.25rem 0.625rem',
      borderRadius: '6px',
      letterSpacing: '0.05em',
    }}>
      PLACE YOUR BETS
    </span>
  )
)}
```

- [ ] **Step 4: Rebuild and test**

Run: `cd ~/User_Apps/Games/Game_Server && pnpm build`
Run: `cd ~/User_Apps/Games/Roulette_Online && pnpm --filter @roulette/web build`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: inactivity-based betting timer — timer starts after 30s of no bets"
```

---

### Task 3: Horizontal board layout

**Files:**
- Modify: `Roulette_Online/apps/web/src/components/BettingGrid.tsx`

- [ ] **Step 1: Rewrite BettingGrid to horizontal layout**

Replace the entire `BettingGrid` component with a horizontal layout. The structure:

```
Row 0: [0 spanning 2 rows] [3][6][9]...[36] [col3 2:1]
Row 1:                      [2][5][8]...[35] [col2 2:1]
Row 2: [00 spanning 2 rows] [1][4][7]...[34] [col1 2:1]
Row 3: [1st 12] [2nd 12] [3rd 12]
Row 4: [1-18][EVEN][RED][BLK][ODD][19-36]
```

The grid uses CSS grid for precise alignment. Key structure:

```tsx
export default function BettingGrid({
  chips, players, phase, sessionId, selectedAmount, onPlaceBet, onRemoveBet, isMobile = false,
}: BettingGridProps) {
  const canBet = phase === 'BETTING' && sessionId != null;

  // ... chipMap, handleNumberClick, handleOutsideBet, renderChipsOnCell (keep as-is)

  const numCellSize = isMobile
    ? { width: '44px', height: '36px', fontSize: '12px', minHeight: '36px' }
    : { width: '36px', height: '28px', fontSize: '10px' };

  // Horizontal number rows
  const topRow = Array.from({ length: 12 }, (_, i) => i * 3 + 3);    // 3,6,9...36
  const midRow = Array.from({ length: 12 }, (_, i) => i * 3 + 2);    // 2,5,8...35
  const botRow = Array.from({ length: 12 }, (_, i) => i * 3 + 1);    // 1,4,7...34

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', userSelect: 'none' }}>
      {/* Main number grid: 0/00 on left, 3 number rows, column bets on right */}
      <div style={{ display: 'flex', gap: '1px' }}>
        {/* 0 and 00 on the left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <div onClick={() => handleNumberClick(0)} style={{ ...cellStyle, ...numCellSize, backgroundColor: numColor(0), height: isMobile ? '73px' : '56px' }}>
            0{renderChipsOnCell('straight_0')}
          </div>
          <div onClick={() => handleNumberClick(37)} style={{ ...cellStyle, ...numCellSize, backgroundColor: numColor(37), height: isMobile ? '73px' : '56px' }}>
            00{renderChipsOnCell('straight_37')}
          </div>
        </div>

        {/* Number rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {[topRow, midRow, botRow].map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: '1px' }}>
              {row.map(num => (
                <div key={num} onClick={() => handleNumberClick(num)}
                  style={{ ...cellStyle, ...numCellSize, backgroundColor: numColor(num) }}>
                  {displayNum(num)}
                  {renderChipsOnCell(`straight_${num}`)}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Column bets on right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {['column_3', 'column_2', 'column_1'].map(betType => (
            <div key={betType} onClick={() => handleOutsideBet(betType)}
              style={{ ...cellStyle, ...numCellSize, backgroundColor: 'var(--surface-panel-raised)', color: 'var(--text-primary)', fontSize: isMobile ? '9px' : '8px', fontWeight: 600, width: isMobile ? '44px' : '32px' }}>
              2:1
              {renderChipsOnCell(betType)}
            </div>
          ))}
        </div>
      </div>

      {/* Dozen bets */}
      <div style={{ display: 'flex', gap: '1px' }}>
        {[
          { label: '1st 12', betType: 'dozen_1' },
          { label: '2nd 12', betType: 'dozen_2' },
          { label: '3rd 12', betType: 'dozen_3' },
        ].map(({ label, betType }) => (
          <div key={betType} onClick={() => handleOutsideBet(betType)}
            style={{ ...cellStyle, ...numCellSize, backgroundColor: 'var(--surface-panel-raised)', color: 'var(--text-primary)', fontSize: isMobile ? '10px' : '9px', fontWeight: 600, flex: 1, minWidth: '44px', height: isMobile ? '44px' : '22px' }}>
            {label}
            {renderChipsOnCell(betType)}
          </div>
        ))}
      </div>

      {/* Even money bets */}
      <div style={{ display: 'flex', gap: '1px' }}>
        {[
          { label: '1-18', betType: 'low', bg: 'var(--surface-panel-raised)', fg: 'var(--text-primary)' },
          { label: 'EVEN', betType: 'even', bg: 'var(--surface-panel-raised)', fg: 'var(--text-primary)' },
          { label: 'RED', betType: 'red', bg: 'var(--roulette-red)', fg: '#fff' },
          { label: 'BLK', betType: 'black', bg: 'var(--roulette-black)', fg: '#fff' },
          { label: 'ODD', betType: 'odd', bg: 'var(--surface-panel-raised)', fg: 'var(--text-primary)' },
          { label: '19-36', betType: 'high', bg: 'var(--surface-panel-raised)', fg: 'var(--text-primary)' },
        ].map(({ label, betType, bg, fg }) => (
          <div key={betType} onClick={() => handleOutsideBet(betType)}
            style={{ ...cellStyle, ...numCellSize, backgroundColor: bg, color: fg, fontSize: isMobile ? '10px' : '9px', fontWeight: 600, flex: 1, minWidth: '44px', height: isMobile ? '44px' : '22px' }}>
            {label}
            {renderChipsOnCell(betType)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify visually in dev mode**

Run: `cd ~/User_Apps/Games/Roulette_Online && pnpm dev`

Check that the board renders horizontally with numbers going left-to-right, 0/00 on the left, column bets on the right, dozens and even-money bets below. Both desktop and mobile viewports.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: horizontal roulette board layout for desktop and mobile"
```

---

### Task 4: Prominent cash display

**Files:**
- Create: `Roulette_Online/apps/web/src/components/BankrollDisplay.tsx`
- Modify: `Roulette_Online/apps/web/src/components/Game.tsx`

- [ ] **Step 1: Create BankrollDisplay component**

Create `Roulette_Online/apps/web/src/components/BankrollDisplay.tsx`:

```tsx
interface BankrollDisplayProps {
  bankroll: number;
  availableBankroll: number;
  roundHistory: number[];
  isMobile?: boolean;
}

export default function BankrollDisplay({ bankroll, availableBankroll, roundHistory, isMobile = false }: BankrollDisplayProps) {
  const hasBets = availableBankroll !== bankroll;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.25rem',
      padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
    }}>
      {/* Main bankroll */}
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
        fontSize: isMobile ? '1.5rem' : '2rem',
        color: bankroll > 0 ? 'var(--success)' : 'var(--danger)',
        lineHeight: 1,
      }}>
        ${bankroll.toLocaleString()}
      </div>

      {/* Available when bets placed */}
      {hasBets && (
        <div style={{
          fontSize: '0.6875rem',
          color: 'var(--text-muted)',
          fontFamily: "'Inter', sans-serif",
        }}>
          ${availableBankroll.toLocaleString()} available
        </div>
      )}

      {/* Win/Loss history */}
      {roundHistory.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          overflowX: 'auto',
          maxWidth: '100%',
          padding: '0.125rem 0',
        }}>
          {roundHistory.map((profit, i) => (
            <span key={i} style={{
              fontSize: '0.6875rem',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              padding: '0.125rem 0.375rem',
              borderRadius: '4px',
              background: profit >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: profit >= 0 ? 'var(--success)' : 'var(--danger)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {profit >= 0 ? `+$${profit}` : `-$${Math.abs(profit)}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Integrate BankrollDisplay into Game.tsx**

In `Game.tsx`, import `BankrollDisplay` and add it above the BettingGrid. Remove the old bankroll displays:

1. **Above the betting grid** (in the left/column area, before the BettingGrid div), add:

```tsx
<BankrollDisplay
  bankroll={isSolo ? soloBankroll : (myPlayer?.bankroll ?? 0)}
  availableBankroll={isSolo ? soloAvailableBankroll : ((myPlayer?.bankroll ?? 0) - (myPlayer?.totalBetThisRound ?? 0))}
  roundHistory={myPlayer?.roundHistory ?? []}
  isMobile={isMobile}
/>
```

2. **Remove** the solo bankroll display from the top bar (the `$ {soloBankroll.toLocaleString()}` div).

3. **Remove** the solo bankroll card from the desktop sidebar and mobile drawer.

4. **Update** `PlayerData` in `types.ts` to add `roundHistory: number[]`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: prominent bankroll display with available balance"
```

---

### Task 5: Win/loss history

**Files:**
- Modify: `Game_Server/apps/server/src/rooms/schema/RouletteGameState.ts` (add roundHistory to PlayerSchema)
- Modify: `Game_Server/apps/server/src/rooms/RouletteRoom.ts` (track round history in settleRound)
- Modify: `Roulette_Online/apps/web/src/types.ts` (add roundHistory to PlayerData)

- [ ] **Step 1: Add roundHistory to PlayerSchema**

In `RouletteGameState.ts`, add to `PlayerSchema`:

```typescript
@type('string') roundHistory: string = '';  // JSON-encoded number[], last 10 net profits
```

- [ ] **Step 2: Track round history in RouletteRoom**

In `RouletteRoom.ts`, in the `settleRound` method, after updating bankrolls, compute and store round history:

```typescript
// In settleRound, after the bankroll update loop:
for (const [sessionId, internal] of this.internalState) {
  const netProfit = calculateNetProfit(results, sessionId);
  // Parse existing history, push new entry, keep last 10
  let history: number[] = [];
  try {
    const player = this.state.players.get(sessionId);
    if (player && player.roundHistory) {
      history = JSON.parse(player.roundHistory);
    }
  } catch {}
  history.push(netProfit);
  if (history.length > 10) history = history.slice(-10);

  const player = this.state.players.get(sessionId);
  if (player) player.roundHistory = JSON.stringify(history);
}
```

- [ ] **Step 3: Add roundHistory to client types**

In `types.ts`, add to `PlayerData`:

```typescript
roundHistory: number[];
```

In `useRouletteRoom.ts`, in the `parseState` function, parse the roundHistory:

```typescript
// Inside the players map loop:
roundHistory: (() => { try { return JSON.parse(value.roundHistory || '[]'); } catch { return []; } })(),
```

- [ ] **Step 4: Rebuild and test**

Run: `cd ~/User_Apps/Games/Game_Server && pnpm build`
Run: `cd ~/User_Apps/Games/Roulette_Online && pnpm --filter @roulette/web build`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: win/loss history tracking per player, last 10 rounds"
```

---

### Task 6: Repeat last bet

**Files:**
- Modify: `Game_Server/apps/server/src/rooms/RouletteRoom.ts` (add lastBets tracking + repeat-last-bet handler)
- Modify: `Roulette_Online/apps/web/src/components/ChipTray.tsx` (add Repeat Bet button)

- [ ] **Step 1: Add lastBets to InternalPlayer and track in RouletteRoom**

In `RouletteRoom.ts`, update the `InternalPlayer` interface:

```typescript
interface InternalPlayer {
  bankroll: number;
  totalBetThisRound: number;
  lastBets: Array<{ betType: string; amount: number }>;
}
```

In `onJoin`, initialize `lastBets: []`.

In `startBettingPhase`, before clearing chips, snapshot each player's bets:

```typescript
// Snapshot last bets before clearing
for (const [sessionId, internal] of this.internalState) {
  const playerChips = this.state.chips
    .filter(c => c.playerId === sessionId)
    .map(c => ({ betType: c.betType, amount: c.amount }));
  if (playerChips.length > 0) {
    internal.lastBets = playerChips;
  }
}
```

Add a `repeat-last-bet` message handler in `onCreate`:

```typescript
this.onMessage('repeat-last-bet', (client) => {
  if (this.phase !== 'BETTING') return;
  const internal = this.internalState.get(client.sessionId);
  const player = this.state.players.get(client.sessionId);
  if (!internal || !player || internal.lastBets.length === 0) return;

  const availableBankroll = internal.bankroll - internal.totalBetThisRound;
  for (const bet of internal.lastBets) {
    if (bet.amount > availableBankroll - internal.totalBetThisRound) break;
    if (!validateBet(bet.betType)) continue;
    if (bet.amount < this.state.minBet || bet.amount > this.state.maxBet) continue;

    internal.totalBetThisRound += bet.amount;
    player.totalBetThisRound = internal.totalBetThisRound;

    const chip = new ChipSchema();
    chip.playerId = client.sessionId;
    chip.chipColor = player.chipColor;
    chip.amount = bet.amount;
    chip.betType = bet.betType;
    this.state.chips.push(chip);
  }

  this.resetInactivityTimer();
});
```

- [ ] **Step 2: Add Repeat Bet button to ChipTray**

In `ChipTray.tsx`, add props and button:

```tsx
interface ChipTrayProps {
  selectedAmount: number;
  onSelectAmount: (amount: number) => void;
  onClearBets: () => void;
  onRepeatBet: () => void;
  canBet: boolean;
  hasLastBets: boolean;
  isMobile?: boolean;
}
```

Add the Repeat button next to Clear:

```tsx
{hasLastBets && (
  <button
    onClick={onRepeatBet}
    disabled={!canBet}
    style={{
      padding: isMobile ? '0.5rem 0.75rem' : '0.375rem 0.75rem',
      background: 'var(--accent-warm)',
      color: '#ffffff',
      border: 'none',
      borderRadius: '6px',
      fontSize: isMobile ? '0.8125rem' : '0.75rem',
      fontWeight: 600,
      cursor: canBet ? 'pointer' : 'not-allowed',
      opacity: canBet ? 1 : 0.5,
      fontFamily: "'Inter', sans-serif",
      minHeight: isMobile ? '44px' : undefined,
    }}
  >
    Repeat
  </button>
)}
```

- [ ] **Step 3: Wire up in Game.tsx**

In `Game.tsx`, pass `onRepeatBet={() => send('repeat-last-bet')}` and `hasLastBets` to `ChipTray`. Track `hasLastBets` via a new schema field or by tracking on client state. Simplest approach: add `lastBets: string` (JSON) to `PlayerSchema` and check if non-empty on client.

Add to `PlayerSchema`:
```typescript
@type('string') lastBets: string = '';
```

In `RouletteRoom.ts`, after snapshotting last bets:
```typescript
const player = this.state.players.get(sessionId);
if (player) player.lastBets = JSON.stringify(internal.lastBets);
```

In `parseState` on client: `lastBets: value.lastBets || ''`.

In `Game.tsx`, determine `hasLastBets`:
```typescript
const hasLastBets = myPlayer ? (() => { try { return JSON.parse(myPlayer.lastBets).length > 0; } catch { return false; } })() : false;
```

- [ ] **Step 4: Rebuild and test**

Run: `cd ~/User_Apps/Games/Game_Server && pnpm build`
Run: `cd ~/User_Apps/Games/Roulette_Online && pnpm --filter @roulette/web build`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: repeat last bet button with server-side bet snapshot"
```

---

### Task 7: Draggable chips + multi-number bets

This is the most complex task. It breaks into: (a) adjacency validation in game-core, (b) drop-zone detection utility, (c) drag-and-drop hook, (d) BettingGrid drop-zone integration.

**Files:**
- Modify: `Roulette_Online/packages/roulette-game-core/src/models/bets.ts` (adjacency validation)
- Create: `Roulette_Online/apps/web/src/lib/dropZones.ts`
- Create: `Roulette_Online/apps/web/src/hooks/useDragChip.ts`
- Modify: `Roulette_Online/apps/web/src/components/BettingGrid.tsx`
- Modify: `Roulette_Online/apps/web/src/components/ChipTray.tsx`

- [ ] **Step 7a: Add adjacency validation to game-core**

In `bets.ts`, add a helper that maps the roulette board layout for adjacency checks:

```typescript
/**
 * Board layout: number -> {row, col} in the standard 3-row, 12-column grid.
 * Row 0 = top (3,6,9...36), Row 1 = mid (2,5,8...35), Row 2 = bot (1,4,7...34)
 */
const BOARD_POSITION = new Map<number, { row: number; col: number }>();
for (let col = 0; col < 12; col++) {
  BOARD_POSITION.set(col * 3 + 3, { row: 0, col });
  BOARD_POSITION.set(col * 3 + 2, { row: 1, col });
  BOARD_POSITION.set(col * 3 + 1, { row: 2, col });
}
```

Update `validateBet` to check adjacency:

```typescript
case 'split': {
  if (args.length !== 2) return false;
  const [a, b] = args;
  if (!((a >= 0 && a <= 36) || a === DOUBLE_ZERO) || !((b >= 0 && b <= 36) || b === DOUBLE_ZERO)) return false;
  // 0-00 split
  if ((a === 0 && b === DOUBLE_ZERO) || (a === DOUBLE_ZERO && b === 0)) return true;
  // Top line numbers adjacent to 0/00
  if ((a === 0 || a === DOUBLE_ZERO) && (b === 1 || b === 2 || b === 3)) return true;
  if ((b === 0 || b === DOUBLE_ZERO) && (a === 1 || a === 2 || a === 3)) return true;
  const posA = BOARD_POSITION.get(a);
  const posB = BOARD_POSITION.get(b);
  if (!posA || !posB) return false;
  // Horizontal neighbors (same row, adjacent columns)
  if (posA.row === posB.row && Math.abs(posA.col - posB.col) === 1) return true;
  // Vertical neighbors (same column, adjacent rows)
  if (posA.col === posB.col && Math.abs(posA.row - posB.row) === 1) return true;
  return false;
}
case 'street': {
  const start = args[0];
  const pos = BOARD_POSITION.get(start);
  if (!pos) return false;
  return pos.row === 2 && start >= 1 && start <= 34 && (start - 1) % 3 === 0;
}
case 'corner': {
  if (args.length !== 4) return false;
  // All 4 numbers must form a 2x2 block
  const positions = args.map(n => BOARD_POSITION.get(n)).filter(Boolean) as { row: number; col: number }[];
  if (positions.length !== 4) return false;
  const rows = positions.map(p => p.row);
  const cols = positions.map(p => p.col);
  const minRow = Math.min(...rows), maxRow = Math.max(...rows);
  const minCol = Math.min(...cols), maxCol = Math.max(...cols);
  return maxRow - minRow === 1 && maxCol - minCol === 1;
}
case 'sixline': {
  const start = args[0];
  const pos = BOARD_POSITION.get(start);
  if (!pos) return false;
  return pos.row === 2 && start >= 1 && start <= 31 && (start - 1) % 3 === 0;
}
```

- [ ] **Step 7b: Create drop-zone detection utility**

Create `Roulette_Online/apps/web/src/lib/dropZones.ts`:

```typescript
/**
 * Determines the bet type based on where a chip is dropped relative to number cells.
 * 
 * The grid is a 3-row x 12-column layout. Each cell has:
 * - Center zone: straight bet on that number
 * - Edge zones (within 20% of cell boundary): split, street, corner, sixline
 */

interface CellRect {
  number: number;
  row: number;  // 0-2 (top/mid/bot)
  col: number;  // 0-11
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DropResult {
  betType: string;
  label: string;
  coveredNumbers: number[];
}

const EDGE_THRESHOLD = 0.2; // 20% of cell dimension

export function detectDropZone(
  x: number,
  y: number,
  cellRects: CellRect[],
  zeroRect?: { x: number; y: number; width: number; height: number },
  doubleZeroRect?: { x: number; y: number; width: number; height: number },
): DropResult | null {
  // Find the cell the cursor is over
  let hitCell: CellRect | null = null;
  let relX = 0;
  let relY = 0;

  for (const cell of cellRects) {
    if (x >= cell.x && x <= cell.x + cell.width && y >= cell.y && y <= cell.y + cell.height) {
      hitCell = cell;
      relX = (x - cell.x) / cell.width;
      relY = (y - cell.y) / cell.height;
      break;
    }
  }

  if (!hitCell) {
    // Check if over 0 or 00
    if (zeroRect && x >= zeroRect.x && x <= zeroRect.x + zeroRect.width && y >= zeroRect.y && y <= zeroRect.y + zeroRect.height) {
      return { betType: 'straight_0', label: '0', coveredNumbers: [0] };
    }
    if (doubleZeroRect && x >= doubleZeroRect.x && x <= doubleZeroRect.x + doubleZeroRect.width && y >= doubleZeroRect.y && y <= doubleZeroRect.y + doubleZeroRect.height) {
      return { betType: 'straight_37', label: '00', coveredNumbers: [37] };
    }
    return null;
  }

  const { row, col, number } = hitCell;

  // Determine zone within cell
  const onLeftEdge = relX < EDGE_THRESHOLD;
  const onRightEdge = relX > 1 - EDGE_THRESHOLD;
  const onTopEdge = relY < EDGE_THRESHOLD;
  const onBottomEdge = relY > 1 - EDGE_THRESHOLD;

  // Straight bet (center zone)
  if (!onLeftEdge && !onRightEdge && !onTopEdge && !onBottomEdge) {
    return { betType: `straight_${number}`, label: String(number), coveredNumbers: [number] };
  }

  // Find neighboring cells
  const getCellAt = (r: number, c: number) => cellRects.find(cr => cr.row === r && cr.col === c);

  // Corner (intersection of 4 cells)
  if ((onTopEdge && onLeftEdge) || (onTopEdge && onRightEdge) || (onBottomEdge && onLeftEdge) || (onBottomEdge && onRightEdge)) {
    const corners: number[] = [];
    const rOffset = onTopEdge ? -1 : 1;
    const cOffset = onLeftEdge ? -1 : 1;

    corners.push(number);
    const h = getCellAt(row, col + cOffset);
    const v = getCellAt(row + rOffset, col);
    const d = getCellAt(row + rOffset, col + cOffset);
    if (h) corners.push(h.number);
    if (v) corners.push(v.number);
    if (d) corners.push(d.number);

    if (corners.length === 4) {
      const sorted = corners.sort((a, b) => a - b);
      return { betType: `corner_${sorted.join('_')}`, label: `Corner`, coveredNumbers: sorted };
    }
    // If not exactly 4, fall through to edge detection
  }

  // Split (horizontal edge between rows)
  if (onTopEdge || onBottomEdge) {
    const rOffset = onTopEdge ? -1 : 1;
    const neighbor = getCellAt(row + rOffset, col);
    if (neighbor) {
      const sorted = [number, neighbor.number].sort((a, b) => a - b);
      return { betType: `split_${sorted.join('_')}`, label: `Split`, coveredNumbers: sorted };
    }
  }

  // Split (vertical edge between columns)
  if (onLeftEdge || onRightEdge) {
    const cOffset = onLeftEdge ? -1 : 1;
    const neighbor = getCellAt(row, col + cOffset);
    if (neighbor) {
      const sorted = [number, neighbor.number].sort((a, b) => a - b);
      return { betType: `split_${sorted.join('_')}`, label: `Split`, coveredNumbers: sorted };
    }
  }

  // Street (left edge of bottom row)
  if (onLeftEdge && row === 2 && col > 0) {
    // Could be a street or double street
    const streetStart = number; // number is col*3+1
    const streetNums = [streetStart, streetStart + 1, streetStart + 2];
    return { betType: `street_${streetStart}`, label: `Street`, coveredNumbers: streetNums };
  }

  // Fallback to straight
  return { betType: `straight_${number}`, label: String(number), coveredNumbers: [number] };
}
```

- [ ] **Step 7c: Create drag-and-drop hook**

Create `Roulette_Online/apps/web/src/hooks/useDragChip.ts`:

```typescript
import { useState, useCallback, useRef } from 'react';

interface DragState {
  isDragging: boolean;
  amount: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export function useDragChip() {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const startDrag = useCallback((amount: number, x: number, y: number) => {
    setDragState({ isDragging: true, amount, startX: x, startY: y, currentX: x, currentY: y });
  }, []);

  const moveDrag = useCallback((x: number, y: number) => {
    setDragState(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  }, []);

  const endDrag = useCallback(() => {
    setDragState(null);
  }, []);

  return { dragState, startDrag, moveDrag, endDrag };
}
```

- [ ] **Step 7d: Integrate draggable chips into BettingGrid and ChipTray**

**ChipTray changes:**
- Each chip in the tray becomes a drag source
- On `onPointerDown`, call `startDrag(amount, e.clientX, e.clientY)`
- Add global `onPointerMove` and `onPointerUp` handlers (attached to window when dragging)
- On `pointerUp` over the grid, determine the drop zone and call `onPlaceBet`
- On `pointerUp` outside the grid, cancel the drag

**BettingGrid changes:**
- Add a ref to the grid container
- Pass `cellRects` (computed via getBoundingClientRect) to `detectDropZone`
- On drag hover over the grid, highlight the detected drop zone and its covered numbers
- Render placed chips as before, but now they're also draggable (for removal)
- On drag of a placed chip off the grid, call `onRemoveBet`

**Game.tsx changes:**
- Lift `useDragChip` state to Game.tsx
- Pass drag handlers to ChipTray and BettingGrid
- Render a ghost chip following the cursor during drag

This integration is the most UI-heavy part. The key interactions:

1. **ChipTray → Grid**: Start drag on chip, drop on grid to place bet
2. **Grid → Off-grid**: Start drag on placed chip, drop outside to remove
3. **Grid → Grid**: Start drag on placed chip, drop on new zone to move bet

- [ ] **Step 7e: Build and test**

Run: `cd ~/User_Apps/Games/Game_Server && pnpm build`
Run: `cd ~/User_Apps/Games/Roulette_Online && pnpm --filter @roulette/web build`

Test all bet types in solo mode: straight, split, street, corner, top line, double street, dozens, columns, even-money.

- [ ] **Step 7f: Commit**

```bash
git add -A
git commit -m "feat: draggable chips with split/street/corner/topline/doublestreet bets"
```

---

### Task 8: Deploy to production

- [ ] **Step 1: Build roulette frontend and copy dist**

```bash
cd ~/User_Apps/Games/Roulette_Online && pnpm --filter @roulette/web build
rm -rf ~/User_Apps/Games/Game_Server/apps/server/roulette-dist/*
cp -r ~/User_Apps/Games/Roulette_Online/apps/web/dist/* ~/User_Apps/Games/Game_Server/apps/server/roulette-dist/
```

- [ ] **Step 2: Commit and push**

```bash
cd ~/User_Apps/Games/Roulette_Online && git add -A && git push origin
cd ~/User_Apps/Games/Game_Server && git add -A && git commit -m "chore: update roulette frontend dist" && git push origin
```

- [ ] **Step 3: Deploy on production**

```bash
ssh -i ~/.ssh/oracle.key ubuntu@163.192.50.203 "cd ~/Game_Server && git pull && pnpm build && pm2 restart game-server && pm2 save"
```

- [ ] **Step 4: Verify**

Visit `roulette.jayryuki.com` and test all features.
