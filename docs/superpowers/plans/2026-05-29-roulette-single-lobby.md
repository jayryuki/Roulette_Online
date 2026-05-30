# Roulette Single-Lobby Auto-Join Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual room-creation flow with server-managed auto-table assignment so players just enter a name and click Play.

**Architecture:** Server exposes `POST /api/roulette/join` that finds or creates a roulette room. Frontend simplifies the lobby to name + Play/Solo. Room code, host, and settings concepts are removed from roulette. Name changes are supported via a new `change-name` message.

**Tech Stack:** Colyseus 0.16, Express, React 18, React Router 6, TypeScript

---

### Task 1: Add `POST /api/roulette/join` endpoint to Game Server

**Files:**
- Modify: `Game_Server/apps/server/src/index.ts`

- [ ] **Step 1: Add the `/api/roulette/join` endpoint**

Add this route before the existing `app.post('/api/rooms', ...)` block:

```ts
app.post('/api/roulette/join', async (req, res) => {
  const { displayName } = req.body;
  if (!displayName || typeof displayName !== 'string') {
    res.status(400).json({ error: 'displayName is required' });
    return;
  }

  try {
    // Find an existing roulette room with open slots
    const existingRooms = await matchMaker.query({ roomType: 'roulette' });
    const available = existingRooms.find(r => r.clients < r.maxClients);

    if (available) {
      res.json({ roomId: available.roomId });
      return;
    }

    // No room available — create one
    const room = await matchMaker.createRoom('roulette', {
      roomCode: '',
      hostPlayerId: '',
    });

    res.json({ roomId: room.roomId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join roulette table' });
  }
});
```

- [ ] **Step 2: Verify the server compiles**

Run: `cd /home/jay/User_Apps/Games/Game_Server && npx tsc --noEmit --project apps/server/tsconfig.json 2>&1 || echo "Note: may need tsconfig check"`
Expected: No compilation errors related to the new endpoint.

- [ ] **Step 3: Commit**

```bash
cd /home/jay/User_Apps/Games/Game_Server
git add apps/server/src/index.ts
git commit -m "feat: add POST /api/roulette/join auto-table assignment endpoint"
```

---

### Task 2: Add `change-name` message handler to RouletteRoom

**Files:**
- Modify: `Game_Server/apps/server/src/rooms/RouletteRoom.ts`

- [ ] **Step 1: Add the `change-name` message handler**

In `RouletteRoom.ts`, inside the `onCreate` method, add this handler after the existing `chat` handler block (after the `// --- Swap color ---` section):

```ts
    // --- Change name ---
    this.onMessage('change-name', (client, data: { displayName: string }) => {
      if (!data.displayName || typeof data.displayName !== 'string') return;
      const name = data.displayName.slice(0, 20).trim();
      if (!name) return;
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.displayName = name;
      }
    });
```

- [ ] **Step 2: Remove the `update-settings` message handler**

Delete the entire `// --- Settings ---` block (the `this.onMessage('update-settings', ...)` handler) from `onCreate`. Roulette no longer has host-managed settings.

- [ ] **Step 3: Remove the `kick-player` message handler**

Delete the entire `// --- Kick ---` block (the `this.onMessage('kick-player', ...)` handler) from `onCreate`.

- [ ] **Step 4: Remove host logic from `onJoin`**

In the `onJoin` method, remove this line:
```ts
    player.isHost = this.state.players.size === 0;
```
Replace with:
```ts
    player.isHost = false;
```

- [ ] **Step 5: Remove host transfer logic from `cleanupPlayer`**

In the `cleanupPlayer` method, remove the host transfer block:
```ts
    // Transfer host
    if (client.sessionId === this.state.hostPlayerId) {
      const remaining = Array.from(this.state.players.values());
      if (remaining.length > 0) {
        this.state.hostPlayerId = remaining[0].playerId;
        remaining[0].isHost = true;
      }
    }
```

- [ ] **Step 6: Simplify `onCreate` options**

Change the `onCreate` signature from:
```ts
  onCreate(options: { preset?: string; hostPlayerId: string; roomCode: string }) {
```
to:
```ts
  onCreate(options: { roomCode?: string; hostPlayerId?: string }) {
```

And remove these lines from `onCreate`:
```ts
    this.state.roomCode = options.roomCode;
    this.state.hostPlayerId = options.hostPlayerId;
```

Replace with:
```ts
    this.state.roomCode = '';
    this.state.hostPlayerId = '';
```

- [ ] **Step 7: Commit**

```bash
cd /home/jay/User_Apps/Games/Game_Server
git add apps/server/src/rooms/RouletteRoom.ts
git commit -m "feat: add change-name handler, remove host/kick/settings from roulette"
```

---

### Task 3: Update frontend `useRouletteRoom.ts` — replace joinRoom/createRoom with autoJoin

**Files:**
- Modify: `Roulette_Online/apps/web/src/hooks/useRouletteRoom.ts`

- [ ] **Step 1: Replace `joinRoom` and `createRoom` with `autoJoin`**

Replace the entire `joinRoom` and `createRoom` callbacks with a single `autoJoin` method:

```ts
  const autoJoin = useCallback(async (displayName: string) => {
    if (joinedRef.current) return roomRef.current;
    joinedRef.current = true;

    try {
      setError(null);

      // Ask server to find or create a table
      const res = await fetch('/api/roulette/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) throw new Error('Failed to join table');
      const { roomId } = await res.json();

      const room = await colyseusClient.joinById(roomId, { displayName });
      roomRef.current = room;
      setConnected(true);
      setSessionId(room.sessionId);

      room.onStateChange((state: any) => {
        setGameState(parseState(state));
      });

      room.onError((code: number, msg?: string) => {
        setError(`Room error: ${msg}`);
      });

      // Force initial state parse
      setGameState(parseState(room.state));

      return room;
    } catch (e: any) {
      joinedRef.current = false;
      setError(e.message);
      return null;
    }
  }, []);
```

- [ ] **Step 2: Update the return object**

Change the return from:
```ts
  return {
    gameState,
    connected,
    error,
    createRoom,
    joinRoom,
    send,
    leave,
    detachRoom,
    sessionId,
  };
```
to:
```ts
  return {
    gameState,
    connected,
    error,
    autoJoin,
    send,
    leave,
    detachRoom,
    sessionId,
  };
```

- [ ] **Step 3: Commit**

```bash
cd /home/jay/User_Apps/Games/Roulette_Online
git add apps/web/src/hooks/useRouletteRoom.ts
git commit -m "feat: replace joinRoom/createRoom with autoJoin in useRouletteRoom"
```

---

### Task 4: Update `useRouletteSolo.ts` — replace joinRoom/createRoom in return shape

**Files:**
- Modify: `Roulette_Online/apps/web/src/hooks/useRouletteSolo.ts`

- [ ] **Step 1: Update the return object to match the new hook shape**

In the return object at the bottom of `useRouletteSolo`, replace `joinRoom` and `createRoom` with `autoJoin`:

Change:
```ts
    joinRoom,
    send,
    leave,
    detachRoom: () => {},
```
to:
```ts
    autoJoin: joinRoom,
    send,
    leave,
    detachRoom: () => {},
```

(Renames the existing `joinRoom` field to `autoJoin` so the solo hook has the same shape as the multiplayer hook.)

- [ ] **Step 2: Commit**

```bash
cd /home/jay/User_Apps/Games/Roulette_Online
git add apps/web/src/hooks/useRouletteSolo.ts
git commit -m "fix: align useRouletteSolo return shape with autoJoin"
```

---

### Task 5: Update `App.tsx` — change route from `/game/:roomCode` to `/game`

**Files:**
- Modify: `Roulette_Online/apps/web/src/App.tsx`

- [ ] **Step 1: Update routes**

Replace:
```tsx
        <Route path="/solo" element={<Game isSolo />} />
        <Route path="/game/:roomCode" element={<Game />} />
```
with:
```tsx
        <Route path="/solo" element={<Game isSolo />} />
        <Route path="/game" element={<Game />} />
```

- [ ] **Step 2: Commit**

```bash
cd /home/jay/User_Apps/Games/Roulette_Online
git add apps/web/src/App.tsx
git commit -m "feat: change roulette game route from /game/:roomCode to /game"
```

---

### Task 6: Rewrite `Lobby.tsx` — simplified name + Play/Solo

**Files:**
- Modify: `Roulette_Online/apps/web/src/components/Lobby.tsx`

- [ ] **Step 1: Replace the entire Lobby component**

Replace the full contents of `Lobby.tsx` with:

```tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ThemeToggle } from '@games/ui';
import { useRouletteRoom } from '../hooks/useRouletteRoom';
import { useIsMobile } from '../hooks/useIsMobile';

const ADJECTIVES = ['Swift', 'Calm', 'Bright', 'Keen', 'Bold', 'Fair', 'Warm', 'Cool', 'Wise', 'Lucky'];
const NOUNS = ['Ace', 'Spin', 'Chip', 'Zero', 'Ball', 'Red', 'Black', 'Wheel', 'Bet', 'Gold'];

function randomName(): string {
  return ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] + NOUNS[Math.floor(Math.random() * NOUNS.length)] + Math.floor(Math.random() * 99);
}

const LS_NAME_KEY = 'roulette_displayName';

export default function Lobby() {
  const navigate = useNavigate();
  const { autoJoin, error: roomError } = useRouletteRoom();
  const [playerName, setPlayerName] = useState(() => {
    try { return localStorage.getItem(LS_NAME_KEY) || ''; } catch { return ''; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

  const getName = () => {
    const name = playerName.trim() || randomName();
    try { localStorage.setItem(LS_NAME_KEY, name); } catch {}
    return name;
  };

  const handlePlay = async () => {
    const name = getName();
    setLoading(true);
    setError('');
    try {
      const room = await autoJoin(name);
      if (room) navigate('/game');
    } catch {
      setError('Failed to connect');
    }
    setLoading(false);
  };

  const handlePlaySolo = () => {
    const name = getName();
    navigate(`/solo?name=${encodeURIComponent(name)}`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: isMobile ? '1rem' : '1.5rem',
      padding: isMobile ? '1rem' : '2rem',
      maxWidth: '100vw',
      overflowX: 'hidden',
    }}>
      <h1 style={{
        fontFamily: "'Newsreader', Georgia, serif",
        fontSize: isMobile ? '2.25rem' : '3rem',
        fontWeight: 500,
        letterSpacing: '-0.03em',
        color: 'var(--text-primary)',
        margin: 0,
      }}>
        Roulette
      </h1>
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: isMobile ? '1rem' : '1.125rem',
        fontStyle: 'italic',
        fontFamily: "'Newsreader', Georgia, serif",
        margin: 0,
        textAlign: 'center',
      }}>
        Place your bets. Watch the wheel.
      </p>

      {/* Name input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: '360px' }}>
        <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', flexShrink: 0 }}>Name</label>
        <input
          value={playerName}
          onChange={(e) => { setPlayerName(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handlePlay(); }}
          placeholder="Leave blank for a random name"
          style={{
            flex: 1,
            padding: isMobile ? '0.625rem 0.75rem' : '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-panel)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            outline: 'none',
            minHeight: isMobile ? '44px' : undefined,
          }}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button size="lg" onClick={handlePlay} disabled={loading} style={isMobile ? { minHeight: '44px' } : undefined}>Play</Button>
        <Button size="lg" variant="secondary" onClick={handlePlaySolo} disabled={loading} style={isMobile ? { minHeight: '44px' } : undefined}>Play Solo</Button>
        <ThemeToggle style={isMobile ? { minHeight: '44px', minWidth: '44px' } : undefined} />
      </div>

      {(error || roomError) && <div style={{ color: 'var(--danger)', fontSize: '0.8125rem' }}>{error || roomError}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/jay/User_Apps/Games/Roulette_Online
git add apps/web/src/components/Lobby.tsx
git commit -m "feat: simplify lobby to name + Play/Solo, localStorage name"
```

---

### Task 7: Update `Game.tsx` — remove room code, settings, use autoJoin

**Files:**
- Modify: `Roulette_Online/apps/web/src/components/Game.tsx`

- [ ] **Step 1: Update imports and destructure**

In Game.tsx, change the hook destructure from:
```tsx
  const { gameState, connected, error, joinRoom, send, leave, detachRoom, sessionId } = hook;
```
to:
```tsx
  const { gameState, connected, error, autoJoin, send, leave, detachRoom, sessionId } = hook;
```

- [ ] **Step 2: Update multiplayer join effect**

Replace the multiplayer join `useEffect`:
```tsx
  useEffect(() => {
    if (!isSolo && roomCode) {
      detachRoom(); // prevent unmount from leaving the room
      joinRoom(roomCode, displayName).then(room => {
        if (!room) navigate('/');
      });
    }
  }, [isSolo, roomCode, joinRoom, displayName, navigate, detachRoom]);
```
with:
```tsx
  useEffect(() => {
    if (!isSolo) {
      detachRoom(); // prevent unmount from leaving the room
      autoJoin(displayName).then(room => {
        if (!room) navigate('/');
      });
    }
  }, [isSolo, autoJoin, displayName, navigate, detachRoom]);
```

- [ ] **Step 3: Update solo join effect**

Change:
```tsx
  useEffect(() => {
    if (isSolo) {
      joinRoom('SOLO', displayName);
    }
  }, [isSolo, joinRoom, displayName]);
```
to:
```tsx
  useEffect(() => {
    if (isSolo) {
      autoJoin(displayName);
    }
  }, [isSolo, autoJoin, displayName]);
```

- [ ] **Step 4: Remove unused variables**

Remove the `roomCode` destructure from `useParams`:
```tsx
  const { roomCode } = useParams<{ roomCode: string }>();
```
Replace with:
```tsx
  // No roomCode needed — auto-join assigns the table
```

Remove the `searchParams` / `displayName` from URL logic. Replace:
```tsx
  const [searchParams] = useSearchParams();
  const displayName = searchParams.get('name') || (() => { try { return sessionStorage.getItem('roulette_displayName') || 'Player'; } catch { return 'Player'; } })();
```
with:
```tsx
  const displayName = (() => { try { return localStorage.getItem('roulette_displayName') || 'Player'; } catch { return 'Player'; } })();
```

Remove the `useSearchParams` import if no longer used. Also remove `useParams` import if no longer used.

- [ ] **Step 5: Remove room code display from top bar**

In the top bar section, remove the room code display block:
```tsx
          {/* Room code */}
          {!isSolo && (
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.15em',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '0.875rem',
            }}>
              {gameState.roomCode}
            </div>
          )}
```

- [ ] **Step 6: Remove settings panel from Game.tsx**

Remove the `settingsOpen` state:
```tsx
  const [settingsOpen, setSettingsOpen] = useState(false);
```

Remove the `handleUpdateSettings` callback:
```tsx
  const handleUpdateSettings = useCallback((settings: Partial<{ minBet: number; maxBet: number; betTime: number; maxPlayers: number }>) => {
    send('update-settings', settings);
  }, [send]);
```

Remove the settings panel render block:
```tsx
      {/* Settings panel overlay */}
      {settingsOpen && gameState && (
        <SettingsPanel ... />
      )}
```

Remove the settings gear button in the top bar:
```tsx
          {/* Settings gear — multiplayer only */}
          {!isSolo && myPlayer && (
            <button
              onClick={() => setSettingsOpen(true)}
              ...
```

Remove the `SettingsPanel` import at the top of the file.

- [ ] **Step 7: Remove `searchParams` and `useSearchParams` imports**

If `useSearchParams` is still imported from `react-router-dom` but unused, remove it. Keep `useNavigate` since `handleLeave` uses it.

- [ ] **Step 8: Commit**

```bash
cd /home/jay/User_Apps/Games/Roulette_Online
git add apps/web/src/components/Game.tsx
git commit -m "feat: update Game.tsx for auto-join, remove room code and settings"
```

---

### Task 8: Add inline name editing to `PlayerSidebar.tsx`

**Files:**
- Modify: `Roulette_Online/apps/web/src/components/PlayerSidebar.tsx`

- [ ] **Step 1: Add `onChangeName` prop**

Update the `PlayerSidebarProps` interface to add the new prop:
```ts
interface PlayerSidebarProps {
  players: Map<string, PlayerData>;
  sessionId: string | null;
  hostPlayerId: string;
  phase: string;
  lastResults: string[];
  chatMessages: any[];
  onSendChat: (text: string) => void;
  onSwapColor: (index: number) => void;
  onChangeName: (name: string) => void;
  takenColors: Set<number>;
  isMobile?: boolean;
}
```

Add `onChangeName` to the destructured props:
```ts
  players, sessionId, hostPlayerId, phase, lastResults, chatMessages,
  onSendChat, onSwapColor, onChangeName, takenColors, isMobile = false,
```

- [ ] **Step 2: Add inline name editing for the current player**

Add state for the name editor at the top of the component function:
```ts
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
```

In the player list rendering, replace the `{p.displayName}...` span for the current player with an inline editable version. Replace the existing `<span>` that shows `p.displayName` with:

```tsx
                {isMe ? (
                  editingName ? (
                    <input
                      autoFocus
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onBlur={() => {
                        const trimmed = nameInput.trim().slice(0, 20);
                        if (trimmed && trimmed !== myPlayer?.displayName) {
                          onChangeName(trimmed);
                          try { localStorage.setItem('roulette_displayName', trimmed); } catch {}
                        }
                        setEditingName(false);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); }
                        if (e.key === 'Escape') { setEditingName(false); }
                      }}
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        background: 'var(--surface-panel-raised)',
                        border: '1px solid var(--accent-warm)',
                        borderRadius: '4px',
                        padding: '0 0.25rem',
                        outline: 'none',
                        width: '100%',
                        maxWidth: '120px',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderBottom: '1px dashed var(--text-muted)',
                      }}
                      onClick={() => { setNameInput(p.displayName); setEditingName(true); }}
                      title="Click to change name"
                    >
                      {p.displayName} ✎
                    </span>
                  )
                ) : (
                  <span style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {p.displayName}
                  </span>
                )}
```

- [ ] **Step 3: Remove the host badge display**

In the same player list, remove the host indicator:
```tsx
                  {p.isHost && <span style={{ color: 'var(--accent-warm)', marginLeft: '0.25rem', fontSize: '0.6875rem' }}>H</span>}
```

- [ ] **Step 4: Commit**

```bash
cd /home/jay/User_Apps/Games/Roulette_Online
git add apps/web/src/components/PlayerSidebar.tsx
git commit -m "feat: add inline name editing to PlayerSidebar"
```

---

### Task 9: Wire `onChangeName` in `Game.tsx`

**Files:**
- Modify: `Roulette_Online/apps/web/src/components/Game.tsx`

- [ ] **Step 1: Add the `handleChangeName` callback and pass to PlayerSidebar**

Add this callback after `handleToggleMute`:
```tsx
  const handleChangeName = useCallback((name: string) => {
    send('change-name', { displayName: name });
  }, [send]);
```

Find the `<PlayerSidebar>` renders (there are two — desktop and mobile drawer) and add `onChangeName={handleChangeName}` to both:

Desktop version:
```tsx
              <PlayerSidebar
                players={players}
                sessionId={sessionId}
                hostPlayerId={gameState.hostPlayerId}
                phase={phase}
                lastResults={gameState.lastResults || []}
                chatMessages={gameState.chatMessages || []}
                onSendChat={(text) => send('chat', { text })}
                onSwapColor={(index) => send('swap-color', { targetIndex: index })}
                onChangeName={handleChangeName}
                takenColors={takenColors}
                isMobile={isMobile}
              />
```

Mobile drawer version — same addition of `onChangeName={handleChangeName}`.

- [ ] **Step 2: Commit**

```bash
cd /home/jay/User_Apps/Games/Roulette_Online
git add apps/web/src/components/Game.tsx
git commit -m "feat: wire onChangeName to send change-name message"
```

---

### Task 10: Remove `SettingsPanel.tsx` (no longer used)

**Files:**
- Delete: `Roulette_Online/apps/web/src/components/SettingsPanel.tsx`

- [ ] **Step 1: Delete the file**

```bash
cd /home/jay/User_Apps/Games/Roulette_Online
rm apps/web/src/components/SettingsPanel.tsx
```

- [ ] **Step 2: Commit**

```bash
git add -u apps/web/src/components/SettingsPanel.tsx
git commit -m "chore: remove SettingsPanel (roulette no longer has host settings)"
```

---

### Task 11: Build, test locally, and deploy to production

**Files:**
- N/A (build and deployment)

- [ ] **Step 1: Build the roulette frontend locally**

```bash
cd /home/jay/User_Apps/Games/Roulette_Online && pnpm build
```
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Copy built dist to Game_Server**

```bash
rm -rf /home/jay/User_Apps/Games/Game_Server/apps/server/roulette-dist
cp -r /home/jay/User_Apps/Games/Roulette_Online/apps/web/dist /home/jay/User_Apps/Games/Game_Server/apps/server/roulette-dist
```

- [ ] **Step 3: Commit the dist update**

```bash
cd /home/jay/User_Apps/Games/Game_Server
git add apps/server/roulette-dist
git commit -m "chore: update roulette frontend dist — single-lobby auto-join"
```

- [ ] **Step 4: Push both repos to GitHub**

```bash
cd /home/jay/User_Apps/Games/Roulette_Online && git push origin master
cd /home/jay/User_Apps/Games/Game_Server && git push origin master
```

- [ ] **Step 5: Pull and rebuild on production server**

```bash
ssh -i ~/.ssh/oracle.key ubuntu@163.192.50.203 "cd /home/ubuntu/Roulette_Online && git pull origin master && pnpm install && pnpm build"
```

- [ ] **Step 6: Copy dist to Game_Server on production and commit**

```bash
ssh -i ~/.ssh/oracle.key ubuntu@163.192.50.203 "cd /home/ubuntu/Game_Server && git pull origin master && rm -rf apps/server/roulette-dist && cp -r /home/ubuntu/Roulette_Online/apps/web/dist apps/server/roulette-dist && git add apps/server/roulette-dist && git commit -m 'chore: update roulette frontend dist' && git push origin master"
```

- [ ] **Step 7: Restart production server**

```bash
ssh -i ~/.ssh/oracle.key ubuntu@163.192.50.203 "cd /home/ubuntu/Game_Server && pm2 restart game-server"
```

- [ ] **Step 8: Verify production**

```bash
ssh -i ~/.ssh/oracle.key ubuntu@163.192.50.203 "sleep 3 && pm2 logs game-server --lines 5 --nostream"
```
Expected: `Game server running on port 2500 (mahjong + blackjack + roulette)`
