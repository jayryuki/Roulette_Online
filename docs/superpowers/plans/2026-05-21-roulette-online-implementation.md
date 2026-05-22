# Roulette Online — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an American Roulette multiplayer game as a Colyseus room on the existing mahjong server (port 2500) with a standalone React+Three.js web client.

**Architecture:** Monorepo (`Roulette_Online/`) with `packages/roulette-game-core` (pure game logic, zero Colyseus deps) and `apps/web` (React+Vite+Tailwind+Three.js). The RouletteRoom class and its schema live inside the mahjong server repo. The web client builds to a `roulette-dist/` folder served by the mahjong Express middleware.

**Tech Stack:** TypeScript, Colyseus 0.16, React 18, Vite 5, Tailwind 3, Three.js (via @react-three/fiber + @react-three/drei), Express 4

---

## File Map

### Roulette_Online/ (new repo)

| File | Responsibility |
|---|---|
| `pnpm-workspace.yaml` | Declare workspaces: apps/*, packages/* |
| `package.json` | Root scripts (build, dev) |
| `tsconfig.base.json` | Shared TS compiler options |
| `packages/roulette-game-core/package.json` | Package: @roulette/game-core |
| `packages/roulette-game-core/tsconfig.json` | Extends base |
| `packages/roulette-game-core/src/index.ts` | Public API barrel export |
| `packages/roulette-game-core/src/models/wheel.ts` | American wheel: pockets, colors, number order |
| `packages/roulette-game-core/src/models/bets.ts` | Bet types, conditions, payout multipliers |
| `packages/roulette-game-core/src/models/chip.ts` | Chip color palette (8 colors) |
| `packages/roulette-game-core/src/engine/fsm.ts` | GamePhase discriminated union, canTransition |
| `packages/roulette-game-core/src/engine/actions.ts` | PlayerAction type (place-bet, remove-bet, etc.) |
| `packages/roulette-game-core/src/payout.ts` | Calculate payouts for all chips vs winning number |
| `apps/web/package.json` | React app with Vite, Three.js deps |
| `apps/web/tsconfig.json` | React JSX config |
| `apps/web/vite.config.ts` | Vite config, proxy to :2500 |
| `apps/web/index.html` | SPA shell |
| `apps/web/tailwind.config.js` | Tailwind v3 config |
| `apps/web/postcss.config.js` | PostCSS with Tailwind + autoprefixer |
| `apps/web/src/main.tsx` | React entry point |
| `apps/web/src/App.tsx` | Router: Lobby -> Game |
| `apps/web/src/hooks/useRouletteRoom.ts` | Colyseus room connection hook |
| `apps/web/src/components/Lobby.tsx` | Create/join room, player list, settings |
| `apps/web/src/components/Game.tsx` | Main game view (wheel + grid + sidebar) |
| `apps/web/src/components/Wheel3D.tsx` | Three.js American roulette wheel |
| `apps/web/src/components/BettingGrid.tsx` | 2D betting layout with chips |
| `apps/web/src/components/ChipTray.tsx` | Denomination selector |
| `apps/web/src/components/PlayerSidebar.tsx` | Bankrolls, colors, chat, hot/cold |
| `apps/web/src/components/HotColdPanel.tsx` | Hot/cold numbers display |
| `apps/web/src/components/ChatBox.tsx` | In-game chat |

### mahjong/ (existing repo — files to create/edit)

| File | Action |
|---|---|
| `apps/server/src/rooms/schema/RouletteGameState.ts` | Create — Colyseus Schema |
| `apps/server/src/rooms/RouletteRoom.ts` | Create — Colyseus Room handler |
| `apps/server/src/index.ts` | Edit — Register room, add routes, serve roulette-dist |
| `apps/server/package.json` | Edit — Add @roulette/game-core dependency |

---

## Phase 1: Roulette_Online Project Scaffolding

### Task 1.1: Root workspace configuration

**Files:**
- Create: `Roulette_Online/pnpm-workspace.yaml`
- Create: `Roulette_Online/package.json`
- Create: `Roulette_Online/tsconfig.base.json`

- [ ] **Step 1: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "roulette-online",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "dev": "pnpm run dev:server & pnpm run dev:web",
    "dev:web": "pnpm --filter @roulette/web dev",
    "dev:server": "pnpm --filter @roulette/server dev"
  }
}
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "useDefineForClassFields": false
  }
}
```

- [ ] **Step 4: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add pnpm-workspace.yaml package.json tsconfig.base.json && git commit -m "chore: scaffold root workspace config"
```

### Task 1.2: game-core package skeleton

**Files:**
- Create: `packages/roulette-game-core/package.json`
- Create: `packages/roulette-game-core/tsconfig.json`
- Create: `packages/roulette-game-core/src/index.ts` (empty barrel)

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p /home/jay/User_Apps/Roulette_Online/packages/roulette-game-core/src/models
mkdir -p /home/jay/User_Apps/Roulette_Online/packages/roulette-game-core/src/engine
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@roulette/game-core",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create placeholder barrel export**

```typescript
// packages/roulette-game-core/src/index.ts
// Barrel exports — populated as game-core modules are built
```

- [ ] **Step 5: Install dependencies and commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && pnpm install
git add packages/roulette-game-core/ && git commit -m "chore: scaffold roulette-game-core package"
```

### Task 1.3: web app skeleton

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/tailwind.config.js`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/index.css`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p /home/jay/User_Apps/Roulette_Online/apps/web/src/components
mkdir -p /home/jay/User_Apps/Roulette_Online/apps/web/src/hooks
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@roulette/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@roulette/game-core": "workspace:*",
    "colyseus.js": "^0.16.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "three": "^0.170.0",
    "@react-three/fiber": "^8.17.0",
    "@react-three/drei": "^9.114.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/three": "^0.170.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleDetection": "force",
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const colyseusTarget = 'http://localhost:2500';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4500,
    host: '0.0.0.0',
    proxy: {
      '/api': colyseusTarget,
      '/matchmake': colyseusTarget,
    },
  },
});
```

- [ ] **Step 5: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Roulette Online</title>
  </head>
  <body class="bg-gray-900 text-white min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 7: Create postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 8: Create index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9: Create main.tsx**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 10: Create placeholder App.tsx**

```tsx
export default function App() {
  return (
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-3xl font-bold">Roulette Online</h1>
    </div>
  );
}
```

- [ ] **Step 11: Install dependencies and verify dev server starts**

```bash
cd /home/jay/User_Apps/Roulette_Online && pnpm install
cd apps/web && npx vite --host 0.0.0.0 &
sleep 3 && curl -s http://localhost:4500 | head -20
# Should show HTML with "Roulette Online" title
```

- [ ] **Step 12: Kill dev server and commit**

```bash
kill %1 2>/dev/null
cd /home/jay/User_Apps/Roulette_Online && git add apps/web/ && git commit -m "chore: scaffold web app skeleton"
```

---

## Phase 2: game-core — Pure Game Logic

### Task 2.1: Wheel model

**Files:**
- Create: `packages/roulette-game-core/src/models/wheel.ts`
- Test: `packages/roulette-game-core/tests/wheel.test.ts`

- [ ] **Step 1: Create directory for tests**

```bash
mkdir -p /home/jay/User_Apps/Roulette_Online/packages/roulette-game-core/tests
```

- [ ] **Step 2: Write tests for wheel model**

```typescript
// packages/roulette-game-core/tests/wheel.test.ts
import { describe, it, expect } from 'vitest';
import { WHEEL_NUMBERS, numberColor, isRed, isBlack, isGreen, POCKET_COUNT } from '../src/models/wheel';

describe('Wheel', () => {
  it('has 38 pockets (American: 0, 00, 1-36)', () => {
    expect(POCKET_COUNT).toBe(38);
    expect(WHEEL_NUMBERS).toHaveLength(38);
  });

  it('contains 0 and 00', () => {
    expect(WHEEL_NUMBERS).toContain(0);
    expect(WHEEL_NUMBERS).toContain(37); // 37 represents 00
  });

  it('contains all numbers 1-36', () => {
    for (let i = 1; i <= 36; i++) {
      expect(WHEEL_NUMBERS).toContain(i);
    }
  });

  it('0 and 00 are green', () => {
    expect(numberColor(0)).toBe('green');
    expect(numberColor(37)).toBe('green');
    expect(isGreen(0)).toBe(true);
    expect(isGreen(37)).toBe(true);
  });

  it('red numbers are correctly identified', () => {
    const reds = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    for (const n of reds) {
      expect(isRed(n), `${n} should be red`).toBe(true);
      expect(isBlack(n), `${n} should not be black`).toBe(false);
    }
  });

  it('black numbers are correctly identified', () => {
    const blacks = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];
    for (const n of blacks) {
      expect(isBlack(n), `${n} should be black`).toBe(true);
      expect(isRed(n), `${n} should not be red`).toBe(false);
    }
  });

  it('numberColor returns correct colors', () => {
    expect(numberColor(1)).toBe('red');
    expect(numberColor(2)).toBe('black');
    expect(numberColor(0)).toBe('green');
    expect(numberColor(37)).toBe('green');
  });

  it('displayLabel returns "00" for 37', () => {
    const { displayLabel } = require('../src/models/wheel');
    expect(displayLabel(0)).toBe('0');
    expect(displayLabel(37)).toBe('00');
    expect(displayLabel(17)).toBe('17');
  });
});
```

- [ ] **Step 3: Run tests (expect FAIL)**

```bash
cd /home/jay/User_Apps/Roulette_Online/packages/roulette-game-core && npx vitest run
# Expected: FAIL — module not found
```

- [ ] **Step 4: Implement wheel.ts**

```typescript
// packages/roulette-game-core/src/models/wheel.ts

/** Total pockets on an American roulette wheel */
export const POCKET_COUNT = 38;

/**
 * American roulette wheel numbers in clockwise order.
 * 37 represents the double-zero (00) pocket.
 */
export const WHEEL_NUMBERS: number[] = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15,
  3, 24, 36, 13, 1, 37, 27, 10, 25, 29, 12, 8, 19, 31,
  18, 6, 21, 33, 16, 4, 23, 35, 14, 2,
];

/** Red numbers on an American wheel */
const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

/** The pocket number representing 00 */
export const DOUBLE_ZERO = 37;

export function isRed(n: number): boolean {
  return RED_NUMBERS.has(n);
}

export function isBlack(n: number): boolean {
  return n !== 0 && n !== DOUBLE_ZERO && !RED_NUMBERS.has(n);
}

export function isGreen(n: number): boolean {
  return n === 0 || n === DOUBLE_ZERO;
}

export type PocketColor = 'red' | 'black' | 'green';

export function numberColor(n: number): PocketColor {
  if (isGreen(n)) return 'green';
  if (isRed(n)) return 'red';
  return 'black';
}

export function displayLabel(n: number): string {
  if (n === DOUBLE_ZERO) return '00';
  return String(n);
}

/**
 * Returns the wheel order index (0-37) for a given pocket number.
 * Used to animate the wheel to a specific pocket.
 */
export function wheelIndex(n: number): number {
  return WHEEL_NUMBERS.indexOf(n);
}
```

- [ ] **Step 5: Run tests (expect PASS)**

```bash
cd /home/jay/User_Apps/Roulette_Online/packages/roulette-game-core && npx vitest run
# Expected: all tests PASS
```

- [ ] **Step 6: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add packages/roulette-game-core/src/models/wheel.ts packages/roulette-game-core/tests/ && git commit -m "feat: add wheel model with American layout and color helpers"
```

### Task 2.2: Bet types and payout table

**Files:**
- Create: `packages/roulette-game-core/src/models/bets.ts`
- Test: `packages/roulette-game-core/tests/bets.test.ts`

- [ ] **Step 1: Write tests for bet model**

```typescript
// packages/roulette-game-core/tests/bets.test.ts
import { describe, it, expect } from 'vitest';
import {
  BetType,
  betToString,
  isWinningBet,
  payoutMultiplier,
  validateBet,
  ALL_BET_TYPES,
} from '../src/models/bets';

describe('Bet types', () => {
  it('straight bet wins only on exact number', () => {
    expect(isWinningBet('straight_17', 17)).toBe(true);
    expect(isWinningBet('straight_17', 18)).toBe(false);
    expect(isWinningBet('straight_0', 0)).toBe(true);
    expect(isWinningBet('straight_37', 37)).toBe(true); // 00
  });

  it('straight bet pays 35:1', () => {
    expect(payoutMultiplier('straight_17')).toBe(35);
  });

  it('split bet wins on either number', () => {
    // split_1_2 covers 1 and 2
    expect(isWinningBet('split_1_2', 1)).toBe(true);
    expect(isWinningBet('split_1_2', 2)).toBe(true);
    expect(isWinningBet('split_1_2', 3)).toBe(false);
  });

  it('split bet pays 17:1', () => {
    expect(payoutMultiplier('split_1_2')).toBe(17);
  });

  it('street bet wins on any of 3 numbers in a row', () => {
    // street_1 covers 1, 2, 3
    expect(isWinningBet('street_1', 1)).toBe(true);
    expect(isWinningBet('street_1', 2)).toBe(true);
    expect(isWinningBet('street_1', 3)).toBe(true);
    expect(isWinningBet('street_1', 4)).toBe(false);
  });

  it('street bet pays 11:1', () => {
    expect(payoutMultiplier('street_1')).toBe(11);
  });

  it('corner bet wins on any of 4 numbers', () => {
    // corner_1_2_4_5 covers 1, 2, 4, 5
    expect(isWinningBet('corner_1_2_4_5', 1)).toBe(true);
    expect(isWinningBet('corner_1_2_4_5', 2)).toBe(true);
    expect(isWinningBet('corner_1_2_4_5', 4)).toBe(true);
    expect(isWinningBet('corner_1_2_4_5', 5)).toBe(true);
    expect(isWinningBet('corner_1_2_4_5', 3)).toBe(false);
  });

  it('corner bet pays 8:1', () => {
    expect(payoutMultiplier('corner_1_2_4_5')).toBe(8);
  });

  it('five bet (0-00-1-2-3) wins on any of those', () => {
    expect(isWinningBet('five', 0)).toBe(true);
    expect(isWinningBet('five', 37)).toBe(true);
    expect(isWinningBet('five', 1)).toBe(true);
    expect(isWinningBet('five', 2)).toBe(true);
    expect(isWinningBet('five', 3)).toBe(true);
    expect(isWinningBet('five', 4)).toBe(false);
  });

  it('five bet pays 6:1', () => {
    expect(payoutMultiplier('five')).toBe(6);
  });

  it('sixline bet wins on any of 6 numbers', () => {
    // sixline_1 covers 1,2,3,4,5,6
    expect(isWinningBet('sixline_1', 1)).toBe(true);
    expect(isWinningBet('sixline_1', 6)).toBe(true);
    expect(isWinningBet('sixline_1', 7)).toBe(false);
  });

  it('sixline bet pays 5:1', () => {
    expect(payoutMultiplier('sixline_1')).toBe(5);
  });

  it('dozen bet wins on correct range', () => {
    expect(isWinningBet('dozen_1', 1)).toBe(true);
    expect(isWinningBet('dozen_1', 12)).toBe(true);
    expect(isWinningBet('dozen_1', 13)).toBe(false);
    expect(isWinningBet('dozen_2', 13)).toBe(true);
    expect(isWinningBet('dozen_2', 24)).toBe(true);
    expect(isWinningBet('dozen_3', 25)).toBe(true);
    expect(isWinningBet('dozen_3', 36)).toBe(true);
  });

  it('dozen bet pays 2:1', () => {
    expect(payoutMultiplier('dozen_1')).toBe(2);
  });

  it('column bet pays 2:1', () => {
    expect(payoutMultiplier('column_1')).toBe(2);
  });

  it('column_1 wins on 1,4,7,...,34', () => {
    expect(isWinningBet('column_1', 1)).toBe(true);
    expect(isWinningBet('column_1', 4)).toBe(true);
    expect(isWinningBet('column_1', 34)).toBe(true);
    expect(isWinningBet('column_1', 2)).toBe(false);
  });

  it('red/black bets', () => {
    expect(isWinningBet('red', 1)).toBe(true);
    expect(isWinningBet('red', 2)).toBe(false);
    expect(isWinningBet('black', 2)).toBe(true);
    expect(isWinningBet('black', 1)).toBe(false);
    expect(isWinningBet('red', 0)).toBe(false);
    expect(isWinningBet('black', 0)).toBe(false);
  });

  it('red/black pays 1:1', () => {
    expect(payoutMultiplier('red')).toBe(1);
    expect(payoutMultiplier('black')).toBe(1);
  });

  it('even/odd bets', () => {
    expect(isWinningBet('even', 2)).toBe(true);
    expect(isWinningBet('even', 3)).toBe(false);
    expect(isWinningBet('odd', 3)).toBe(true);
    expect(isWinningBet('odd', 2)).toBe(false);
    expect(isWinningBet('even', 0)).toBe(false);
    expect(isWinningBet('odd', 37)).toBe(false);
  });

  it('even/odd pays 1:1', () => {
    expect(payoutMultiplier('even')).toBe(1);
    expect(payoutMultiplier('odd')).toBe(1);
  });

  it('low/high bets', () => {
    expect(isWinningBet('low', 1)).toBe(true);
    expect(isWinningBet('low', 18)).toBe(true);
    expect(isWinningBet('low', 19)).toBe(false);
    expect(isWinningBet('high', 19)).toBe(true);
    expect(isWinningBet('high', 36)).toBe(true);
    expect(isWinningBet('high', 18)).toBe(false);
    expect(isWinningBet('low', 0)).toBe(false);
  });

  it('low/high pays 1:1', () => {
    expect(payoutMultiplier('low')).toBe(1);
    expect(payoutMultiplier('high')).toBe(1);
  });

  it('validateBet rejects invalid strings', () => {
    expect(validateBet('nonsense')).toBe(false);
    expect(validateBet('straight_38')).toBe(false); // no 38
    expect(validateBet('straight_-1')).toBe(false);
  });

  it('validateBet accepts valid bet strings', () => {
    expect(validateBet('straight_17')).toBe(true);
    expect(validateBet('straight_0')).toBe(true);
    expect(validateBet('straight_37')).toBe(true);
    expect(validateBet('red')).toBe(true);
    expect(validateBet('black')).toBe(true);
    expect(validateBet('even')).toBe(true);
    expect(validateBet('odd')).toBe(true);
    expect(validateBet('low')).toBe(true);
    expect(validateBet('high')).toBe(true);
    expect(validateBet('dozen_1')).toBe(true);
    expect(validateBet('column_2')).toBe(true);
    expect(validateBet('five')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests (expect FAIL)**

```bash
cd /home/jay/User_Apps/Roulette_Online/packages/roulette-game-core && npx vitest run
# Expected: FAIL — module not found
```

- [ ] **Step 3: Implement bets.ts**

```typescript
// packages/roulette-game-core/src/models/bets.ts

import { isRed, isBlack, DOUBLE_ZERO } from './wheel';

/**
 * Bet type string format:
 *   "straight_N"     — single number (0, 1-36, 37=00)
 *   "split_A_B"       — two adjacent numbers
 *   "street_N"        — row of 3 (N is the row's first number)
 *   "corner_A_B_C_D"   — block of 4 numbers
 *   "five"            — 0-00-1-2-3 (American only)
 *   "sixline_N"       — two adjacent rows (6 numbers)
 *   "dozen_1|2|3"     — 1st 12, 2nd 12, 3rd 12
 *   "column_1|2|3"    — column of 12 numbers
 *   "red"|"black"     — color
 *   "even"|"odd"      — parity
 *   "low"|"high"      — 1-18 / 19-36
 */
export type BetType = string;

const PAYOUT_TABLE: Record<string, number> = {
  straight: 35,
  split: 17,
  street: 11,
  corner: 8,
  five: 6,
  sixline: 5,
  dozen: 2,
  column: 2,
};

const EVEN_MONEY_PAYOUT = 1;

/**
 * Parse a bet string into its category and arguments.
 * e.g. "straight_17" -> { category: "straight", args: [17] }
 */
export function parseBet(bet: BetType): { category: string; args: number[] } | null {
  if (['red', 'black', 'even', 'odd', 'low', 'high', 'five'].includes(bet)) {
    return { category: bet, args: [] };
  }

  const parts = bet.split('_');
  const category = parts[0];
  const args = parts.slice(1).map(Number);

  if (args.some(isNaN)) return null;

  return { category, args };
}

/**
 * Returns the payout multiplier for a bet type (not including the stake).
 * e.g. straight -> 35 (player gets stake * 35 profit + stake back)
 */
export function payoutMultiplier(bet: BetType): number {
  const parsed = parseBet(bet);
  if (!parsed) return 0;

  switch (parsed.category) {
    case 'straight': return PAYOUT_TABLE.straight;
    case 'split': return PAYOUT_TABLE.split;
    case 'street': return PAYOUT_TABLE.street;
    case 'corner': return PAYOUT_TABLE.corner;
    case 'five': return PAYOUT_TABLE.five;
    case 'sixline': return PAYOUT_TABLE.sixline;
    case 'dozen': return PAYOUT_TABLE.dozen;
    case 'column': return PAYOUT_TABLE.column;
    case 'red':
    case 'black':
    case 'even':
    case 'odd':
    case 'low':
    case 'high':
      return EVEN_MONEY_PAYOUT;
    default:
      return 0;
  }
}

/**
 * Check if a bet wins on the given winning number.
 * winningNumber: 0-37 (37 = 00).
 */
export function isWinningBet(bet: BetType, winningNumber: number): boolean {
  const parsed = parseBet(bet);
  if (!parsed) return false;

  const { category, args } = parsed;
  const n = winningNumber;

  switch (category) {
    case 'straight':
      return args[0] === n;

    case 'split':
      return args.includes(n);

    case 'street': {
      // street_N covers N, N+1, N+2
      const start = args[0];
      return n === start || n === start + 1 || n === start + 2;
    }

    case 'corner':
      return args.includes(n);

    case 'five':
      return n === 0 || n === DOUBLE_ZERO || n === 1 || n === 2 || n === 3;

    case 'sixline': {
      // sixline_N covers N through N+5 (two rows)
      const start = args[0];
      return n >= start && n <= start + 5;
    }

    case 'dozen': {
      const d = args[0]; // 1, 2, or 3
      const lo = (d - 1) * 12 + 1;
      const hi = d * 12;
      return n >= lo && n <= hi;
    }

    case 'column': {
      const col = args[0]; // 1, 2, or 3
      if (n === 0 || n === DOUBLE_ZERO) return false;
      return ((n - 1) % 3) + 1 === col;
    }

    case 'red':
      return isRed(n);
    case 'black':
      return isBlack(n);
    case 'even':
      return n !== 0 && n !== DOUBLE_ZERO && n % 2 === 0;
    case 'odd':
      return n !== 0 && n !== DOUBLE_ZERO && n % 2 === 1;
    case 'low':
      return n >= 1 && n <= 18;
    case 'high':
      return n >= 19 && n <= 36;

    default:
      return false;
  }
}

/**
 * Validate that a bet string is well-formed.
 */
export function validateBet(bet: BetType): boolean {
  const parsed = parseBet(bet);
  if (!parsed) return false;

  const { category, args } = parsed;

  switch (category) {
    case 'straight': {
      const n = args[0];
      return (n >= 0 && n <= 36) || n === DOUBLE_ZERO;
    }
    case 'split': {
      // Must have 2 args, both valid pocket numbers
      return args.length === 2 && args.every(n => (n >= 0 && n <= 36) || n === DOUBLE_ZERO);
    }
    case 'street': {
      const start = args[0];
      // Valid street starts: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
      return start >= 1 && start <= 34 && (start - 1) % 3 === 0;
    }
    case 'corner': {
      // Must have 4 args, all valid
      return args.length === 4 && args.every(n => (n >= 1 && n <= 36));
    }
    case 'five':
      return true;
    case 'sixline': {
      const start = args[0];
      // Valid sixline starts: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31
      return start >= 1 && start <= 31 && (start - 1) % 3 === 0;
    }
    case 'dozen':
      return args[0] >= 1 && args[0] <= 3;
    case 'column':
      return args[0] >= 1 && args[0] <= 3;
    case 'red':
    case 'black':
    case 'even':
    case 'odd':
    case 'low':
    case 'high':
      return true;
    default:
      return false;
  }
}

/** List of simple (non-number-specific) bet types */
export const SIMPLE_BETS: BetType[] = [
  'red', 'black', 'even', 'odd', 'low', 'high',
  'dozen_1', 'dozen_2', 'dozen_3',
  'column_1', 'column_2', 'column_3',
  'five',
];
```

- [ ] **Step 4: Run tests (expect PASS)**

```bash
cd /home/jay/User_Apps/Roulette_Online/packages/roulette-game-core && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add packages/roulette-game-core/src/models/bets.ts packages/roulette-game-core/tests/bets.test.ts && git commit -m "feat: add bet types, validation, and payout table"
```

### Task 2.3: Chip color palette

**Files:**
- Create: `packages/roulette-game-core/src/models/chip.ts`

- [ ] **Step 1: Implement chip.ts**

```typescript
// packages/roulette-game-core/src/models/chip.ts

export interface ChipColor {
  index: number;
  name: string;
  hex: string;
}

export const CHIP_COLORS: ChipColor[] = [
  { index: 0, name: 'Red',    hex: '#E53E3E' },
  { index: 1, name: 'Blue',   hex: '#3182CE' },
  { index: 2, name: 'Green',  hex: '#38A169' },
  { index: 3, name: 'Yellow', hex: '#D69E2E' },
  { index: 4, name: 'Purple', hex: '#805AD5' },
  { index: 5, name: 'Orange', hex: '#DD6B20' },
  { index: 6, name: 'Cyan',   hex: '#00B5D8' },
  { index: 7, name: 'Pink',   hex: '#D53F8C' },
];

export const CHIP_COUNT = CHIP_COLORS.length;

export function getChipColor(index: number): ChipColor | undefined {
  return CHIP_COLORS.find(c => c.index === index);
}

/**
 * Assign the first unclaimed chip color index to a new player.
 */
export function assignChipColor(takenIndices: Set<number>): number {
  for (const color of CHIP_COLORS) {
    if (!takenIndices.has(color.index)) {
      return color.index;
    }
  }
  // All taken — fallback (shouldn't happen with 8 players)
  return 0;
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add packages/roulette-game-core/src/models/chip.ts && git commit -m "feat: add chip color palette and assignment logic"
```

### Task 2.4: Game FSM (phases and transitions)

**Files:**
- Create: `packages/roulette-game-core/src/engine/fsm.ts`

- [ ] **Step 1: Implement fsm.ts**

```typescript
// packages/roulette-game-core/src/engine/fsm.ts

export type PhaseType = 'LOBBY' | 'BETTING' | 'SPINNING' | 'SETTLEMENT' | 'ROUND_END';

export interface LobbyPhase { type: 'LOBBY'; }
export interface BettingPhase {
  type: 'BETTING';
  timerStartedAt: number;
  timerDurationMs: number;
}
export interface SpinningPhase { type: 'SPINNING'; }
export interface SettlementPhase { type: 'SETTLEMENT'; }
export interface RoundEndPhase { type: 'ROUND_END'; }

export type GamePhase =
  | LobbyPhase
  | BettingPhase
  | SpinningPhase
  | SettlementPhase
  | RoundEndPhase;

export const VALID_TRANSITIONS: Record<PhaseType, PhaseType[]> = {
  LOBBY:      ['BETTING'],
  BETTING:    ['SPINNING'],
  SPINNING:   ['SETTLEMENT'],
  SETTLEMENT: ['ROUND_END'],
  ROUND_END:  ['BETTING', 'LOBBY'],
};

export function canTransition(from: PhaseType, to: PhaseType): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function phaseType(phase: GamePhase): PhaseType {
  return phase.type;
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add packages/roulette-game-core/src/engine/fsm.ts && git commit -m "feat: add game phase FSM"
```

### Task 2.5: Player actions

**Files:**
- Create: `packages/roulette-game-core/src/engine/actions.ts`

- [ ] **Step 1: Implement actions.ts**

```typescript
// packages/roulette-game-core/src/engine/actions.ts

export type PlayerAction =
  | { type: 'PLACE_BET'; betType: string; amount: number }
  | { type: 'REMOVE_BET'; chipIndex: number }
  | { type: 'CLEAR_BETS' }
  | { type: 'SPIN_NOW' }
  | { type: 'TOGGLE_READY' }
  | { type: 'CHOOSE_SEAT'; seatIndex: number }
  | { type: 'SWAP_COLOR'; targetIndex: number }
  | { type: 'START_ROUND' }
  | { type: 'UPDATE_SETTINGS'; minBet?: number; maxBet?: number; maxPlayers?: number; betTime?: number }
  | { type: 'CHAT'; text: string };
```

- [ ] **Step 2: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add packages/roulette-game-core/src/engine/actions.ts && git commit -m "feat: add player action types"
```

### Task 2.6: Payout calculator

**Files:**
- Create: `packages/roulette-game-core/src/payout.ts`
- Test: `packages/roulette-game-core/tests/payout.test.ts`

- [ ] **Step 1: Write tests for payout**

```typescript
// packages/roulette-game-core/tests/payout.test.ts
import { describe, it, expect } from 'vitest';
import { calculatePayouts, type Chip } from '../src/payout';

describe('calculatePayouts', () => {
  it('returns empty for no chips', () => {
    expect(calculatePayouts([], 17)).toEqual([]);
  });

  it('pays 35:1 on straight hit (player gets bet * 36 back)', () => {
    const chips: Chip[] = [
      { playerId: 'p1', betType: 'straight_17', amount: 10 },
    ];
    const results = calculatePayouts(chips, 17);
    expect(results).toEqual([
      { playerId: 'p1', betType: 'straight_17', amount: 10, won: true, payout: 360 },
    ]);
  });

  it('loses straight bet on miss', () => {
    const chips: Chip[] = [
      { playerId: 'p1', betType: 'straight_17', amount: 10 },
    ];
    const results = calculatePayouts(chips, 18);
    expect(results).toEqual([
      { playerId: 'p1', betType: 'straight_17', amount: 10, won: false, payout: 0 },
    ]);
  });

  it('pays 1:1 on red hit', () => {
    const chips: Chip[] = [
      { playerId: 'p1', betType: 'red', amount: 50 },
      { playerId: 'p2', betType: 'black', amount: 25 },
    ];
    const results = calculatePayouts(chips, 1); // 1 is red
    expect(results[0].won).toBe(true);
    expect(results[0].payout).toBe(100); // 50 * 2
    expect(results[1].won).toBe(false);
    expect(results[1].payout).toBe(0);
  });

  it('handles multiple players and bet types', () => {
    const chips: Chip[] = [
      { playerId: 'p1', betType: 'straight_7', amount: 5 },
      { playerId: 'p1', betType: 'red', amount: 20 },
      { playerId: 'p2', betType: 'black', amount: 10 },
      { playerId: 'p2', betType: 'dozen_1', amount: 15 },
    ];
    // 7 is red, in dozen 1
    const results = calculatePayouts(chips, 7);
    expect(results).toHaveLength(4);

    // p1 straight_7 wins 35:1
    expect(results[0].won).toBe(true);
    expect(results[0].payout).toBe(180); // 5 * 36

    // p1 red wins 1:1
    expect(results[1].won).toBe(true);
    expect(results[1].payout).toBe(40); // 20 * 2

    // p2 black loses
    expect(results[2].won).toBe(false);
    expect(results[2].payout).toBe(0);

    // p2 dozen_1 wins 2:1
    expect(results[3].won).toBe(true);
    expect(results[3].payout).toBe(45); // 15 * 3
  });

  it('green (0/00) beats all outside bets', () => {
    const chips: Chip[] = [
      { playerId: 'p1', betType: 'red', amount: 10 },
      { playerId: 'p1', betType: 'even', amount: 10 },
      { playerId: 'p2', betType: 'low', amount: 10 },
    ];
    const results = calculatePayouts(chips, 0);
    expect(results.every(r => !r.won)).toBe(true);
    expect(results.every(r => r.payout === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests (expect FAIL)**

```bash
cd /home/jay/User_Apps/Roulette_Online/packages/roulette-game-core && npx vitest run
```

- [ ] **Step 3: Implement payout.ts**

```typescript
// packages/roulette-game-core/src/payout.ts

import { isWinningBet, payoutMultiplier } from './models/bets';

export interface Chip {
  playerId: string;
  betType: string;
  amount: number;
}

export interface PayoutResult {
  playerId: string;
  betType: string;
  amount: number;
  won: boolean;
  payout: number; // total return (stake + profit if won, 0 if lost)
}

/**
 * Calculate payouts for all chips against a winning number.
 * Returns one PayoutResult per chip, preserving input order.
 */
export function calculatePayouts(chips: Chip[], winningNumber: number): PayoutResult[] {
  return chips.map(chip => {
    const won = isWinningBet(chip.betType, winningNumber);
    if (!won) {
      return { ...chip, won: false, payout: 0 };
    }
    const multiplier = payoutMultiplier(chip.betType);
    // Total return = bet * (multiplier + 1)
    const payout = chip.amount * (multiplier + 1);
    return { ...chip, won: true, payout };
  });
}

/**
 * Calculate total net profit for a player from settlement results.
 * Net = totalPayout - totalBetsPlaced
 */
export function calculateNetProfit(results: PayoutResult[], playerId: string): number {
  return results
    .filter(r => r.playerId === playerId)
    .reduce((sum, r) => sum + (r.won ? r.payout - r.amount : -r.amount), 0);
}
```

- [ ] **Step 4: Run tests (expect PASS)**

```bash
cd /home/jay/User_Apps/Roulette_Online/packages/roulette-game-core && npx vitest run
```

- [ ] **Step 5: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add packages/roulette-game-core/src/payout.ts packages/roulette-game-core/tests/payout.test.ts && git commit -m "feat: add payout calculator"
```

### Task 2.7: Barrel export

**Files:**
- Edit: `packages/roulette-game-core/src/index.ts`

- [ ] **Step 1: Update index.ts with all exports**

```typescript
// packages/roulette-game-core/src/index.ts

// Models
export {
  POCKET_COUNT,
  WHEEL_NUMBERS,
  DOUBLE_ZERO,
  isRed,
  isBlack,
  isGreen,
  numberColor,
  displayLabel,
  wheelIndex,
} from './models/wheel';
export type { PocketColor } from './models/wheel';

export {
  parseBet,
  payoutMultiplier,
  isWinningBet,
  validateBet,
  SIMPLE_BETS,
} from './models/bets';
export type { BetType } from './models/bets';

export {
  CHIP_COLORS,
  CHIP_COUNT,
  getChipColor,
  assignChipColor,
} from './models/chip';
export type { ChipColor } from './models/chip';

// Engine
export {
  canTransition,
  phaseType,
  VALID_TRANSITIONS,
} from './engine/fsm';
export type { PhaseType, GamePhase, LobbyPhase, BettingPhase, SpinningPhase, SettlementPhase, RoundEndPhase } from './engine/fsm';

export type { PlayerAction } from './engine/actions';

// Payout
export {
  calculatePayouts,
  calculateNetProfit,
} from './payout';
export type { Chip, PayoutResult } from './payout';
```

- [ ] **Step 2: Build game-core to verify it compiles**

```bash
cd /home/jay/User_Apps/Roulette_Online/packages/roulette-game-core && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add packages/roulette-game-core/src/index.ts && git commit -m "feat: complete game-core barrel exports"
```

---

## Phase 3: Colyseus Schema + Room (mahjong repo)

### Task 3.1: RouletteGameState schema

**Files:**
- Create: `mahjong/apps/server/src/rooms/schema/RouletteGameState.ts`

- [ ] **Step 1: Create the schema**

```typescript
// mahjong/apps/server/src/rooms/schema/RouletteGameState.ts

import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';

export class ChipSchema extends Schema {
  @type('string') playerId: string = '';
  @type('uint8') chipColor: number = 0;
  @type('uint32') amount: number = 0;
  @type('string') betType: string = '';
}

export class ChatMessageSchema extends Schema {
  @type('string') senderId: string = '';
  @type('string') senderName: string = '';
  @type('string') text: string = '';
  @type('uint32') timestamp: number = 0;
}

export class PlayerSchema extends Schema {
  @type('string') playerId: string = '';
  @type('string') displayName: string = '';
  @type('uint8') seatIndex: number = 0;
  @type('boolean') isConnected: boolean = false;
  @type('boolean') isReady: boolean = false;
  @type('boolean') isHost: boolean = false;
  @type('uint32') bankroll: number = 1000;
  @type('uint8') chipColor: number = 255; // 0-7, 255 = unassigned
  @type('uint32') totalBetThisRound: number = 0;
}

export class RouletteGameState extends Schema {
  @type('string') roomId: string = '';
  @type('string') roomCode: string = '';
  @type('string') status: string = 'lobby';
  @type('string') hostPlayerId: string = '';
  @type('string') phase: string = 'LOBBY';

  @type('int8') winningNumber: number = -1; // -1 until settled, 0-37 (37=00)

  @type('uint8') timerSeconds: number = 0; // countdown during BETTING

  @type('uint32') minBet: number = 1;
  @type('uint32') maxBet: number = 1000;
  @type('uint8') betTime: number = 30; // configurable seconds
  @type('uint8') maxPlayers: number = 8;

  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type([ChipSchema]) chips = new ArraySchema<ChipSchema>();
  @type([ChatMessageSchema]) chatMessages = new ArraySchema<ChatMessageSchema>();

  // Last 20 winning numbers for hot/cold display, stored as JSON strings
  @type([ 'string' ]) lastResults = new ArraySchema<string>();

  @type('string') roundResult: string = ''; // JSON settlement summary
}
```

- [ ] **Step 2: Commit in mahjong repo**

```bash
cd /home/jay/User_Apps/mahjong && git add apps/server/src/rooms/schema/RouletteGameState.ts && git commit -m "feat: add RouletteGameState schema"
```

### Task 3.2: RouletteRoom handler

**Files:**
- Create: `mahjong/apps/server/src/rooms/RouletteRoom.ts`

- [ ] **Step 1: Create RouletteRoom.ts**

```typescript
// mahjong/apps/server/src/rooms/RouletteRoom.ts

import { Room, Client } from '@colyseus/core';
import {
  RouletteGameState,
  PlayerSchema,
  ChipSchema,
  ChatMessageSchema,
} from './schema/RouletteGameState.js';
import {
  assignChipColor,
  validateBet,
  calculatePayouts,
  calculateNetProfit,
  CHIP_COUNT,
} from '@roulette/game-core';
import type { GamePhase, PhaseType } from '@roulette/game-core';

interface InternalPlayer {
  bankroll: number;
  totalBetThisRound: number;
}

export class RouletteRoom extends Room<RouletteGameState> {
  maxClients = 8;

  private internalState = new Map<string, InternalPlayer>();
  private sessionToSeat = new Map<string, number>();
  private seatToSession = new Map<number, string>();
  private betTimer: NodeJS.Timeout | null = null;
  private phaseTimer: NodeJS.Timeout | null = null;
  private currentPhase: PhaseType = 'LOBBY';

  onCreate(options: { preset?: string; hostPlayerId: string; roomCode: string }) {
    this.setState(new RouletteGameState());
    this.state.roomId = this.roomId;
    this.state.roomCode = options.roomCode;
    this.state.hostPlayerId = options.hostPlayerId;
    this.state.status = 'lobby';
    this.state.phase = 'LOBBY';
    this.state.minBet = 1;
    this.state.maxBet = 1000;
    this.state.betTime = 30;
    this.state.maxPlayers = 8;

    // Lobby messages
    this.onMessage('choose-seat', (client, data: { seatIndex: number }) => {
      this.handleChooseSeat(client, data);
    });

    this.onMessage('swap-color', (client, data: { targetIndex: number }) => {
      this.handleSwapColor(client, data);
    });

    this.onMessage('toggle-ready', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) player.isReady = !player.isReady;
    });

    this.onMessage('start-round', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isHost) return;
      if (this.currentPhase !== 'LOBBY' && this.currentPhase !== 'ROUND_END') return;
      this.startBettingPhase();
    });

    // Betting messages
    this.onMessage('place-bet', (client, data: { betType: string; amount: number }) => {
      this.handlePlaceBet(client, data);
    });

    this.onMessage('remove-bet', (client, data: { chipIndex: number }) => {
      this.handleRemoveBet(client, data);
    });

    this.onMessage('clear-bets', (client) => {
      this.handleClearBets(client);
    });

    this.onMessage('spin-now', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isHost) return;
      if (this.currentPhase !== 'BETTING') return;
      this.closeBetting();
    });

    // Settings
    this.onMessage('update-settings', (client, data: {
      minBet?: number; maxBet?: number; maxPlayers?: number; betTime?: number;
    }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isHost) return;
      if (this.currentPhase !== 'LOBBY') return;
      if (data.minBet !== undefined && data.minBet >= 1) this.state.minBet = data.minBet;
      if (data.maxBet !== undefined && data.maxBet <= 10000) this.state.maxBet = data.maxBet;
      if (data.maxPlayers !== undefined && data.maxPlayers >= 2 && data.maxPlayers <= 8) {
        this.state.maxPlayers = data.maxPlayers;
      }
      if (data.betTime !== undefined && data.betTime >= 10 && data.betTime <= 120) {
        this.state.betTime = data.betTime;
      }
    });

    // Chat
    this.onMessage('chat', (client, data: { text: string }) => {
      if (!data.text || typeof data.text !== 'string') return;
      const text = data.text.slice(0, 200).trim();
      if (!text) return;
      const player = this.state.players.get(client.sessionId);
      const msg = new ChatMessageSchema();
      msg.senderId = client.sessionId;
      msg.senderName = player?.displayName ?? 'Player';
      msg.text = text;
      msg.timestamp = Date.now();
      this.state.chatMessages.push(msg);
      while (this.state.chatMessages.length > 50) {
        this.state.chatMessages.shift();
      }
    });

    // Kick
    this.onMessage('kick-player', (client, data: { targetId: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.isHost) return;
      if (!data.targetId || data.targetId === client.sessionId) return;
      const target = this.clients.find(c => c.sessionId === data.targetId);
      if (target) target.leave(4001, 'Kicked by host');
    });
  }

  // ---------------------------------------------------------------------------
  // Join / Leave
  // ---------------------------------------------------------------------------

  onJoin(client: Client, options: { displayName: string }) {
    const player = new PlayerSchema();
    player.playerId = client.sessionId;
    player.displayName = options.displayName || 'Player';
    player.isConnected = true;
    player.isHost = this.state.players.size === 0;

    // Auto-assign seat
    const occupiedSeats = new Set(this.sessionToSeat.values());
    for (let i = 0; i < this.maxClients; i++) {
      if (!occupiedSeats.has(i)) {
        player.seatIndex = i;
        this.sessionToSeat.set(client.sessionId, i);
        this.seatToSession.set(i, client.sessionId);
        break;
      }
    }

    // Assign chip color
    const takenColors = new Set<number>();
    for (const [, p] of this.state.players) {
      if (p.chipColor < CHIP_COUNT) takenColors.add(p.chipColor);
    }
    player.chipColor = assignChipColor(takenColors);

    this.state.players.set(client.sessionId, player);
    this.internalState.set(client.sessionId, {
      bankroll: 1000,
      totalBetThisRound: 0,
    });
  }

  onLeave(client: Client) {
    this.clearPhaseTimer();
    const seat = this.sessionToSeat.get(client.sessionId);
    if (seat !== undefined) this.seatToSession.delete(seat);
    this.sessionToSeat.delete(client.sessionId);
    this.internalState.delete(client.sessionId);
    this.state.players.delete(client.sessionId);

    // Transfer host
    if (client.sessionId === this.state.hostPlayerId) {
      const remaining = Array.from(this.state.players.values());
      if (remaining.length > 0) {
        this.state.hostPlayerId = remaining[0].playerId;
        remaining[0].isHost = true;
      }
    }

    // Remove this player's chips from the table
    this.removePlayerChips(client.sessionId);
  }

  onDispose() {
    this.clearPhaseTimer();
    this.clearBetTimer();
  }

  // ---------------------------------------------------------------------------
  // Lobby handlers
  // ---------------------------------------------------------------------------

  private handleChooseSeat(client: Client, data: { seatIndex: number }) {
    const idx = data.seatIndex;
    if (idx < 0 || idx >= this.maxClients) return;
    const existing = this.seatToSession.get(idx);
    if (existing && existing !== client.sessionId) return;

    const oldSeat = this.sessionToSeat.get(client.sessionId);
    if (oldSeat !== undefined) this.seatToSession.delete(oldSeat);

    this.sessionToSeat.set(client.sessionId, idx);
    this.seatToSession.set(idx, client.sessionId);

    const player = this.state.players.get(client.sessionId);
    if (player) player.seatIndex = idx;
  }

  private handleSwapColor(client: Client, data: { targetIndex: number }) {
    if (data.targetIndex < 0 || data.targetIndex >= CHIP_COUNT) return;
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Check if target color is taken
    for (const [, p] of this.state.players) {
      if (p.playerId !== client.sessionId && p.chipColor === data.targetIndex) return;
    }

    player.chipColor = data.targetIndex;
  }

  // ---------------------------------------------------------------------------
  // Betting phase
  // ---------------------------------------------------------------------------

  private startBettingPhase() {
    this.clearPhaseTimer();

    // Check all players are seated
    const players = Array.from(this.state.players.values());
    if (players.length < 1) return;
    const allSeated = players.every(p => this.sessionToSeat.has(p.playerId));
    if (!allSeated) return;
    const allReady = players.every(p => p.isReady);
    if (!allReady) return;

    this.state.status = 'in-progress';
    this.currentPhase = 'BETTING';
    this.state.phase = 'BETTING';

    // Reset round
    this.state.chips.clear();
    this.state.winningNumber = -1;
    this.state.roundResult = '';
    for (const [sessionId, internal] of this.internalState) {
      internal.totalBetThisRound = 0;
      const p = this.state.players.get(sessionId);
      if (p) p.totalBetThisRound = 0;
    }

    // Start countdown
    this.state.timerSeconds = this.state.betTime;

    this.betTimer = setInterval(() => {
      this.state.timerSeconds--;
      if (this.state.timerSeconds <= 0) {
        this.clearBetTimer();
        this.closeBetting();
      }
    }, 1000);

    this.broadcast('place-your-bets', { timerSeconds: this.state.betTime });
  }

  private handlePlaceBet(client: Client, data: { betType: string; amount: number }) {
    if (this.currentPhase !== 'BETTING') return;

    const player = this.state.players.get(client.sessionId);
    const internal = this.internalState.get(client.sessionId);
    if (!player || !internal) return;

    const amount = Math.floor(data.amount);
    if (amount < this.state.minBet || amount > this.state.maxBet) return;
    if (!validateBet(data.betType)) return;

    const availableBankroll = internal.bankroll - internal.totalBetThisRound;
    if (amount > availableBankroll) return;

    internal.totalBetThisRound += amount;
    player.totalBetThisRound = internal.totalBetThisRound;

    const chip = new ChipSchema();
    chip.playerId = client.sessionId;
    chip.chipColor = player.chipColor;
    chip.amount = amount;
    chip.betType = data.betType;
    this.state.chips.push(chip);
  }

  private handleRemoveBet(client: Client, data: { chipIndex: number }) {
    if (this.currentPhase !== 'BETTING') return;

    const chip = this.state.chips[data.chipIndex];
    if (!chip || chip.playerId !== client.sessionId) return;

    const internal = this.internalState.get(client.sessionId);
    const player = this.state.players.get(client.sessionId);
    if (internal && player) {
      internal.totalBetThisRound -= chip.amount;
      player.totalBetThisRound = internal.totalBetThisRound;
    }

    this.state.chips.deleteAt(data.chipIndex);
  }

  private handleClearBets(client: Client) {
    if (this.currentPhase !== 'BETTING') return;
    this.removePlayerChips(client.sessionId);
  }

  private removePlayerChips(sessionId: string) {
    const internal = this.internalState.get(sessionId);
    const player = this.state.players.get(sessionId);
    if (internal && player) {
      internal.totalBetThisRound = 0;
      player.totalBetThisRound = 0;
    }

    // Remove all chips for this player
    for (let i = this.state.chips.length - 1; i >= 0; i--) {
      if (this.state.chips[i].playerId === sessionId) {
        this.state.chips.deleteAt(i);
      }
    }
  }

  private clearBetTimer() {
    if (this.betTimer) {
      clearInterval(this.betTimer);
      this.betTimer = null;
    }
  }

  private clearPhaseTimer() {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Spinning phase
  // ---------------------------------------------------------------------------

  private closeBetting() {
    this.clearBetTimer();
    this.currentPhase = 'SPINNING';
    this.state.phase = 'SPINNING';

    // Generate winning number (0-37, 37=00) using crypto
    const winningNumber = this.generateWinningNumber();
    this.state.winningNumber = winningNumber;

    // Track in last results
    this.state.lastResults.push(String(winningNumber));
    while (this.state.lastResults.length > 20) {
      this.state.lastResults.shift();
    }

    this.broadcast('spin-result', { number: winningNumber });

    // After 5 seconds (wheel animation), move to settlement
    this.phaseTimer = setTimeout(() => this.settleRound(), 5000);
  }

  private generateWinningNumber(): number {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % 38; // 0-37, 37 = 00
  }

  // ---------------------------------------------------------------------------
  // Settlement
  // ---------------------------------------------------------------------------

  private settleRound() {
    this.clearPhaseTimer();
    this.currentPhase = 'SETTLEMENT';
    this.state.phase = 'SETTLEMENT';

    const winningNumber = this.state.winningNumber;

    // Convert schema chips to plain objects
    const chips = this.state.chips.map(c => ({
      playerId: c.playerId,
      betType: c.betType,
      amount: c.amount,
    }));

    const results = calculatePayouts(chips, winningNumber);

    // Update bankrolls
    for (const [sessionId, internal] of this.internalState) {
      const netProfit = calculateNetProfit(results, sessionId);
      internal.bankroll += netProfit;
      internal.totalBetThisRound = 0;

      const player = this.state.players.get(sessionId);
      if (player) {
        player.bankroll = internal.bankroll;
        player.totalBetThisRound = 0;
      }
    }

    // Build result summary for client display
    const resultSummary = results.map(r => {
      const player = this.state.players.get(r.playerId);
      return {
        playerId: r.playerId,
        name: player?.displayName ?? 'Player',
        betType: r.betType,
        amount: r.amount,
        won: r.won,
        payout: r.payout,
      };
    });

    this.state.roundResult = JSON.stringify({
      winningNumber,
      results: resultSummary,
    });

    this.state.chips.clear();

    const bankrolls: Record<string, number> = {};
    for (const [sessionId, internal] of this.internalState) {
      bankrolls[sessionId] = internal.bankroll;
    }

    this.broadcast('round-result', {
      winningNumber,
      results: resultSummary,
      bankrolls,
    });

    // After 5s display, move to ROUND_END
    this.phaseTimer = setTimeout(() => {
      this.currentPhase = 'ROUND_END';
      this.state.phase = 'ROUND_END';

      // Auto-restart after 10s
      this.phaseTimer = setTimeout(() => {
        this.startBettingPhase();
      }, 10000);
    }, 5000);
  }
}
```

- [ ] **Step 2: Verify it compiles (type-check only)**

```bash
cd /home/jay/User_Apps/mahjong/apps/server && npx tsc --noEmit
# May fail if @roulette/game-core not yet linked — we'll fix in Task 4.2
```

- [ ] **Step 3: Commit**

```bash
cd /home/jay/User_Apps/mahjong && git add apps/server/src/rooms/RouletteRoom.ts && git commit -m "feat: add RouletteRoom handler"
```

---

## Phase 4: Wire Roulette into the mahjong server

### Task 4.1: Update server package.json

**Files:**
- Edit: `mahjong/apps/server/package.json`

- [ ] **Step 1: Add @roulette/game-core dependency**

Edit the `dependencies` to add `"@roulette/game-core": "workspace:*"`:

```json
{
  "name": "@mahjong/server",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@colyseus/core": "^0.16.0",
    "@colyseus/schema": "^3.0.0",
    "@colyseus/ws-transport": "^0.16.0",
    "@mahjong/game-core": "workspace:*",
    "@blackjack/game-core": "workspace:*",
    "@roulette/game-core": "workspace:*",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "tsx": "^4.19.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Update mahjong root pnpm-workspace.yaml** to include Roulette_Online packages:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - '../Roulette_Online/packages/*'
```

- [ ] **Step 3: Install and link**

```bash
cd /home/jay/User_Apps/mahjong && pnpm install
```

- [ ] **Step 4: Commit**

```bash
cd /home/jay/User_Apps/mahjong && git add apps/server/package.json pnpm-workspace.yaml && git commit -m "chore: add @roulette/game-core dependency and workspace link"
```

### Task 4.2: Register RouletteRoom in index.ts

**Files:**
- Edit: `mahjong/apps/server/src/index.ts`

- [ ] **Step 1: Add import and registration**

After the existing BlackjackRoom import, add:

```typescript
import { RouletteRoom } from './rooms/RouletteRoom.js';
```

After the existing `gameServer.define('blackjack', BlackjackRoom);`, add:

```typescript
gameServer.define('roulette', RouletteRoom);
```

- [ ] **Step 2: Add roulette dist path variable**

After `const blackjackDist = path.resolve(__dirname, '../blackjack-dist');`, add:

```typescript
const rouletteDist = path.resolve(__dirname, '../roulette-dist');
```

- [ ] **Step 3: Add roulette to host-based static routing**

Update the middleware to include roulette host:

```typescript
app.use((req, res, next) => {
  const host = req.hostname || req.headers.host || '';
  if (host.includes('roulette')) {
    express.static(rouletteDist)(req, res, next);
  } else if (host.includes('blackjack')) {
    express.static(blackjackDist)(req, res, next);
  } else {
    express.static(mahjongDist)(req, res, next);
  }
});
```

- [ ] **Step 4: Add 'roulette' to the POST /api/rooms gameType mapping**

Update the ternary:

```typescript
const gameType = game === 'blackjack' ? 'blackjack'
               : game === 'roulette' ? 'roulette'
               : 'mahjong';
```

- [ ] **Step 5: Update the GET /api/rooms maxPlayers fallback**

```typescript
maxPlayers: game === 'blackjack' ? 7 : game === 'roulette' ? 8 : 4,
openSlots: game === 'blackjack' ? 7 : game === 'roulette' ? 8 : 4,
```

- [ ] **Step 6: Add roulette to SPA catch-all**

```typescript
app.get('*', (req, res) => {
  const host = req.hostname || req.headers.host || '';
  const dist = host.includes('roulette') ? rouletteDist
             : host.includes('blackjack') ? blackjackDist
             : mahjongDist;
  res.sendFile(path.join(dist, 'index.html'));
});
```

- [ ] **Step 7: Update the console.log at startup**

```typescript
console.log(`Game server running on port ${PORT} (mahjong + blackjack + roulette)`);
```

- [ ] **Step 8: Verify compilation**

```bash
cd /home/jay/User_Apps/mahjong/apps/server && npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
cd /home/jay/User_Apps/mahjong && git add apps/server/src/index.ts && git commit -m "feat: register RouletteRoom and add roulette routing"
```

---

## Phase 5: Web Client — Foundation

### Task 5.1: Colyseus room connection hook

**Files:**
- Create: `Roulette_Online/apps/web/src/hooks/useRouletteRoom.ts`

- [ ] **Step 1: Create the hook**

```typescript
// apps/web/src/hooks/useRouletteRoom.ts

import { useEffect, useRef, useState, useCallback } from 'react';
import { Client, Room } from 'colyseus.js';
import { RouletteGameState } from '../types'; // defined in Step 2

const ENDPOINT = window.location.hostname === 'localhost'
  ? 'ws://localhost:2500'
  : `wss://${window.location.hostname}:2500`;

export function useRouletteRoom() {
  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room<RouletteGameState> | null>(null);
  const [gameState, setGameState] = useState<RouletteGameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize client once
  if (!clientRef.current) {
    clientRef.current = new Client(ENDPOINT);
  }

  const createRoom = useCallback(async (displayName: string) => {
    try {
      setError(null);
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, game: 'roulette' }),
      });
      if (!res.ok) throw new Error('Failed to create room');
      return await res.json();
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, []);

  const joinRoom = useCallback(async (roomCode: string, displayName: string) => {
    try {
      setError(null);
      const lookup = await fetch(`/api/rooms/${roomCode}`);
      if (!lookup.ok) throw new Error('Room not found');
      const { roomId } = await lookup.json();

      const room = await clientRef.current!.joinById(roomId, { displayName });
      roomRef.current = room;
      setConnected(true);

      room.onStateChange((state: RouletteGameState) => {
        setGameState({ ...state });
      });

      room.onLeave(() => {
        setConnected(false);
        setGameState(null);
      });

      room.onError((code, msg) => {
        setError(`Room error: ${msg}`);
      });

      // Register no-op handlers for all server broadcasts
      room.onMessage('place-your-bets', () => {});
      room.onMessage('spin-result', () => {});
      room.onMessage('round-result', () => {});
      room.onMessage('shuffling', () => {});

      return room;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, []);

  const send = useCallback((type: string, data: any = {}) => {
    roomRef.current?.send(type, data);
  }, []);

  const leave = useCallback(() => {
    roomRef.current?.leave();
    roomRef.current = null;
    setConnected(false);
    setGameState(null);
  }, []);

  return {
    gameState,
    connected,
    error,
    createRoom,
    joinRoom,
    send,
    leave,
    sessionId: roomRef.current?.sessionId ?? null,
  };
}
```

- [ ] **Step 2: Create types file**

```typescript
// apps/web/src/types.ts

export interface ChipData {
  playerId: string;
  chipColor: number;
  amount: number;
  betType: string;
}

export interface PlayerData {
  playerId: string;
  displayName: string;
  seatIndex: number;
  isConnected: boolean;
  isReady: boolean;
  isHost: boolean;
  bankroll: number;
  chipColor: number;
  totalBetThisRound: number;
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface RouletteGameState {
  roomId: string;
  roomCode: string;
  status: string;
  hostPlayerId: string;
  phase: string;
  winningNumber: number;
  timerSeconds: number;
  minBet: number;
  maxBet: number;
  betTime: number;
  maxPlayers: number;
  players: Map<string, PlayerData>;
  chips: ChipData[];
  chatMessages: ChatMessage[];
  lastResults: string[];
  roundResult: string;
}
```

- [ ] **Step 3: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add apps/web/src/hooks/ apps/web/src/types.ts && git commit -m "feat: add Colyseus room hook and types"
```

### Task 5.2: App shell with routing

**Files:**
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/components/Lobby.tsx`

- [ ] **Step 1: Create App.tsx with routing**

```tsx
// apps/web/src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Lobby from './components/Lobby';
import Game from './components/Game';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/game/:roomCode" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 2: Create Lobby component**

```tsx
// apps/web/src/components/Lobby.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRouletteRoom } from '../hooks/useRouletteRoom';

export default function Lobby() {
  const navigate = useNavigate();
  const { createRoom, joinRoom, error } = useRouletteRoom();
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    const data = await createRoom(displayName.trim());
    if (data) navigate(`/game/${data.roomCode}?name=${encodeURIComponent(displayName)}`);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!displayName.trim() || !joinCode.trim()) return;
    setLoading(true);
    const room = await joinRoom(joinCode.trim().toUpperCase(), displayName.trim());
    if (room) navigate(`/game/${joinCode.trim().toUpperCase()}?name=${encodeURIComponent(displayName)}`);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full shadow-2xl border border-gray-700">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          🎰 Roulette Online
        </h1>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={16}
              placeholder="Enter your name"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !displayName.trim()}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition"
          >
            Create New Room
          </button>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-600" />
            <span className="text-gray-400 text-sm">or join</span>
            <div className="flex-1 h-px bg-gray-600" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Room Code</label>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono tracking-widest text-center"
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={loading || !displayName.trim() || !joinCode.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition"
          >
            Join Room
          </button>
        </div>

        {error && (
          <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify dev server renders**

```bash
cd /home/jay/User_Apps/Roulette_Online/apps/web && npx vite --host 0.0.0.0 &
sleep 3 && curl -s http://localhost:4500 | grep "Roulette Online"
```

- [ ] **Step 4: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add apps/web/src/App.tsx apps/web/src/components/Lobby.tsx && git commit -m "feat: add app shell with lobby and routing"
```

---

## Phase 6: Web Client — Betting Grid

### Task 6.1: Betting grid component

**Files:**
- Create: `apps/web/src/components/BettingGrid.tsx`

- [ ] **Step 1: Create the betting grid**

```tsx
// apps/web/src/components/BettingGrid.tsx

import { useMemo } from 'react';
import type { ChipData, PlayerData } from '../types';
import { CHIP_COLORS } from '@roulette/game-core';

interface BettingGridProps {
  chips: ChipData[];
  players: Map<string, PlayerData>;
  phase: string;
  sessionId: string | null;
  selectedAmount: number;
  onPlaceBet: (betType: string, amount: number) => void;
  onRemoveBet: (chipIndex: number) => void;
}

// Numbers in grid order (American layout)
const GRID = [
  [null, null, 0, 37, null], // 0 and 00 row
  [1, 2, 3, null],
  [4, 5, 6, null],
  [7, 8, 9, null],
  [10, 11, 12, null],
  [13, 14, 15, null],
  [16, 17, 18, null],
  [19, 20, 21, null],
  [22, 23, 24, null],
  [25, 26, 27, null],
  [28, 29, 30, null],
  [31, 32, 33, null],
  [34, 35, 36, null],
];

const NUMBER_COLORS: Record<number, string> = {
  0: 'bg-green-700', 37: 'bg-green-700',
};
for (let i = 1; i <= 36; i++) {
  const reds = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
  NUMBER_COLORS[i] = reds.has(i) ? 'bg-red-700' : 'bg-gray-900';
}

function displayNum(n: number): string {
  return n === 37 ? '00' : String(n);
}

export default function BettingGrid({
  chips, players, phase, sessionId, selectedAmount, onPlaceBet, onRemoveBet,
}: BettingGridProps) {
  const canBet = phase === 'BETTING' && sessionId != null;

  const chipMap = useMemo(() => {
    const map = new Map<string, ChipData[]>();
    for (const chip of chips) {
      const existing = map.get(chip.betType) || [];
      existing.push(chip);
      map.set(chip.betType, existing);
    }
    return map;
  }, [chips]);

  // Find my chips (indexes into the chips array)
  const myChipIndices = useMemo(() => {
    if (!sessionId) return new Set<number>();
    return new Set(
      chips.map((c, i) => c.playerId === sessionId ? i : -1).filter(i => i >= 0)
    );
  }, [chips, sessionId]);

  const handleNumberClick = (num: number) => {
    if (!canBet || selectedAmount <= 0) return;
    if (num === null) return;
    const betType = `straight_${num}`;
    onPlaceBet(betType, selectedAmount);
  };

  const renderChipsOnCell = (betType: string) => {
    const cellChips = chipMap.get(betType);
    if (!cellChips || cellChips.length === 0) return null;
    return (
      <div className="absolute inset-0 flex flex-wrap items-center justify-center pointer-events-none">
        {cellChips.map((chip, i) => {
          const color = CHIP_COLORS.find(c => c.index === chip.chipColor);
          return (
            <div
              key={i}
              className="w-5 h-5 rounded-full border-2 border-white text-[8px] flex items-center justify-center font-bold"
              style={{ backgroundColor: color?.hex ?? '#888' }}
              title={`${players.get(chip.playerId)?.displayName}: $${chip.amount}`}
            >
              {chip.amount}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="select-none">
      {/* Number grid */}
      <div className="grid grid-cols-5 gap-0.5 mb-2">
        {/* 0 and 00 header */}
        <div
          onClick={() => handleNumberClick(0)}
          className="relative bg-green-700 hover:bg-green-600 cursor-pointer rounded aspect-square flex items-center justify-center text-white font-bold text-sm"
        >
          0
          {renderChipsOnCell('straight_0')}
        </div>
        <div
          onClick={() => handleNumberClick(37)}
          className="relative bg-green-700 hover:bg-green-600 cursor-pointer rounded aspect-square flex items-center justify-center text-white font-bold text-sm"
        >
          00
          {renderChipsOnCell('straight_37')}
        </div>
        {/* Spacer columns */}
        <div /><div /><div />

        {/* Number rows */}
        {GRID.slice(2).map((row, rowIdx) => (
          row.map((num, colIdx) => {
            if (num === null) return <div key={colIdx} />;
            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                onClick={() => handleNumberClick(num)}
                className={`relative ${NUMBER_COLORS[num] || 'bg-gray-800'} ${num !== 0 && num !== 37 ? 'hover:brightness-125' : 'hover:brightness-110'} cursor-pointer rounded aspect-square flex items-center justify-center text-white font-bold text-sm transition`}
              >
                {displayNum(num)}
                {renderChipsOnCell(`straight_${num}`)}
              </div>
            );
          })
        ))}
      </div>

      {/* Outside bets row */}
      <div className="grid grid-cols-6 gap-0.5 mb-1">
        {[
          { label: '1st 12', betType: 'dozen_1' },
          { label: '2nd 12', betType: 'dozen_2' },
          { label: '3rd 12', betType: 'dozen_3' },
          { label: '1-18', betType: 'low' },
          { label: 'EVEN', betType: 'even' },
          { label: 'RED', betType: 'red' },
          { label: 'BLACK', betType: 'black' },
          { label: 'ODD', betType: 'odd' },
          { label: '19-36', betType: 'high' },
        ].map(({ label, betType }) => (
          <div
            key={betType}
            onClick={() => canBet && selectedAmount > 0 && onPlaceBet(betType, selectedAmount)}
            className="relative bg-gray-700 hover:bg-gray-600 cursor-pointer rounded py-1.5 flex items-center justify-center text-white text-xs font-semibold"
          >
            {label}
            {renderChipsOnCell(betType)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add apps/web/src/components/BettingGrid.tsx && git commit -m "feat: add betting grid component"
```

### Task 6.2: Chip tray component

**Files:**
- Create: `apps/web/src/components/ChipTray.tsx`

- [ ] **Step 1: Create chip tray**

```tsx
// apps/web/src/components/ChipTray.tsx

interface ChipTrayProps {
  selectedAmount: number;
  onSelectAmount: (amount: number) => void;
  onClearBets: () => void;
  canBet: boolean;
}

const DENOMINATIONS = [1, 5, 25, 100, 500];

const CHIP_STYLES: Record<number, string> = {
  1: 'bg-white text-gray-900 border-gray-300',
  5: 'bg-red-600 text-white border-red-400',
  25: 'bg-green-600 text-white border-green-400',
  100: 'bg-gray-800 text-white border-gray-600',
  500: 'bg-purple-700 text-white border-purple-400',
};

export default function ChipTray({ selectedAmount, onSelectAmount, onClearBets, canBet }: ChipTrayProps) {
  return (
    <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
      <div className="flex gap-2">
        {DENOMINATIONS.map(denom => (
          <button
            key={denom}
            onClick={() => onSelectAmount(denom)}
            disabled={!canBet}
            className={`w-12 h-12 rounded-full border-2 font-bold text-sm transition-all ${
              CHIP_STYLES[denom]
            } ${
              selectedAmount === denom
                ? 'ring-2 ring-yellow-400 scale-110 shadow-lg'
                : 'hover:scale-105'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            ${denom}
          </button>
        ))}
      </div>
      <button
        onClick={onClearBets}
        disabled={!canBet}
        className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 text-white rounded-lg text-sm font-semibold transition"
      >
        Clear Bets
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add apps/web/src/components/ChipTray.tsx && git commit -m "feat: add chip tray component"
```

---

## Phase 7: Web Client — 3D Wheel

### Task 7.1: Three.js roulette wheel component

**Files:**
- Create: `apps/web/src/components/Wheel3D.tsx`

- [ ] **Step 1: Create 3D wheel component**

```tsx
// apps/web/src/components/Wheel3D.tsx

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Text, Cylinder, Torus } from '@react-three/drei';
import * as THREE from 'three';
import { WHEEL_NUMBERS, numberColor as getPocketColor, displayLabel } from '@roulette/game-core';

const POCKET_COUNT = 38;
const WHEEL_RADIUS = 3;
const POCKET_ANGLE = (2 * Math.PI) / POCKET_COUNT;

interface WheelMeshProps {
  targetNumber: number | null; // null = idle, number = spin to this pocket
  spinning: boolean;
}

function WheelMesh({ targetNumber, spinning }: WheelMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const rotationSpeed = useRef(0.05);
  const targetAngle = useRef(0);

  // Calculate the pocket positions
  const pockets = useMemo(() => {
    return WHEEL_NUMBERS.map((num, index) => {
      const angle = index * POCKET_ANGLE;
      const color = getPocketColor(num);
      return { num, index, angle, color };
    });
  }, []);

  // Handle spin target
  useMemo(() => {
    if (targetNumber !== null && spinning) {
      const targetIdx = WHEEL_NUMBERS.indexOf(targetNumber);
      if (targetIdx >= 0) {
        // Calculate angle to land on target pocket at the top (12 o'clock)
        // Top of wheel is at angle PI/2 from +X axis
        const pocketCenter = targetIdx * POCKET_ANGLE;
        const fullSpins = 5 * Math.PI * 2; // 5 full rotations
        targetAngle.current = fullSpins + (Math.PI * 2 - pocketCenter + Math.PI / 2);
        rotationSpeed.current = 0.08;
      }
    }
  }, [targetNumber, spinning]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (spinning) {
      const remaining = targetAngle.current - groupRef.current.rotation.z;
      if (Math.abs(remaining) > 0.01) {
        groupRef.current.rotation.z += remaining * Math.min(delta * 3, 1);
      }
    } else {
      // Idle slow rotation
      groupRef.current.rotation.z += 0.003;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer rim */}
      <Torus args={[WHEEL_RADIUS, 0.15, 16, 64]}>
        <meshStandardMaterial color="#8B4513" metalness={0.6} roughness={0.3} />
      </Torus>

      {/* Pockets */}
      {pockets.map(({ num, angle, color }) => {
        const cx = (WHEEL_RADIUS - 0.6) * Math.cos(angle);
        const cy = (WHEEL_RADIUS - 0.6) * Math.sin(angle);
        const hexColor = color === 'red' ? '#B91C1C' : color === 'black' ? '#1F2937' : '#15803D';

        return (
          <group key={num}>
            {/* Pocket background */}
            <mesh position={[cx * 0.85, cy * 0.85, 0.05]} rotation={[0, 0, angle]}>
              <planeGeometry args={[0.4, 0.55]} />
              <meshStandardMaterial color={hexColor} />
            </mesh>
            {/* Number label */}
            <Text
              position={[cx * 0.85, cy * 0.85, 0.1]}
              fontSize={0.12}
              color="white"
              anchorX="center"
              anchorY="middle"
              rotation={[0, 0, angle]}
            >
              {displayLabel(num)}
            </Text>
          </group>
        );
      })}

      {/* Ball */}
      <mesh position={[WHEEL_RADIUS - 0.35, 0, 0.15]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
      </mesh>

      {/* Center hub */}
      <Cylinder args={[0.4, 0.4, 0.2, 32]} position={[0, 0, 0.05]}>
        <meshStandardMaterial color="#D4A574" metalness={0.8} roughness={0.2} />
      </Cylinder>
    </group>
  );
}

interface Wheel3DProps {
  targetNumber: number | null;
  spinning: boolean;
}

export default function Wheel3D({ targetNumber, spinning }: Wheel3DProps) {
  return (
    <div className="w-full aspect-square max-w-md mx-auto">
      <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-5, -5, 5]} intensity={0.4} />
        <WheelMesh targetNumber={targetNumber} spinning={spinning} />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles (type-check)**

```bash
cd /home/jay/User_Apps/Roulette_Online/apps/web && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add apps/web/src/components/Wheel3D.tsx && git commit -m "feat: add 3D roulette wheel component"
```

---

## Phase 8: Web Client — Main Game View

### Task 8.1: Player sidebar component

**Files:**
- Create: `apps/web/src/components/PlayerSidebar.tsx`

- [ ] **Step 1: Create player sidebar**

```tsx
// apps/web/src/components/PlayerSidebar.tsx

import { CHIP_COLORS } from '@roulette/game-core';
import type { PlayerData } from '../types';
import HotColdPanel from './HotColdPanel';
import ChatBox from './ChatBox';

interface PlayerSidebarProps {
  players: Map<string, PlayerData>;
  sessionId: string | null;
  hostPlayerId: string;
  phase: string;
  lastResults: string[];
  chatMessages: any[];
  onSendChat: (text: string) => void;
  onToggleReady: () => void;
  onSwapColor: (index: number) => void;
  onStartRound: () => void;
  takenColors: Set<number>;
}

export default function PlayerSidebar({
  players, sessionId, hostPlayerId, phase, lastResults, chatMessages,
  onSendChat, onToggleReady, onSwapColor, takenColors,
}: PlayerSidebarProps) {
  const playerList = Array.from(players.values()).sort((a, b) => a.seatIndex - b.seatIndex);
  const myPlayer = sessionId ? players.get(sessionId) : null;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Players panel */}
      <div className="bg-gray-800 rounded-xl p-3">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Players</h3>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {playerList.map(p => {
            const color = CHIP_COLORS.find(c => c.index === p.chipColor);
            return (
              <div key={p.playerId} className={`flex items-center gap-2 px-2 py-1 rounded ${p.playerId === sessionId ? 'bg-gray-700' : ''}`}>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color?.hex ?? '#888' }}
                />
                <span className="text-sm text-white flex-1 truncate">
                  {p.displayName}
                  {p.isHost && ' (Host)'}
                </span>
                <span className="text-xs text-green-400 font-mono">${p.bankroll}</span>
                {!p.isReady && phase === 'LOBBY' && (
                  <span className="text-xs text-yellow-400">Not ready</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Color swapper (for my player) */}
        {myPlayer && phase === 'LOBBY' && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="text-xs text-gray-400 mb-1">Chip Color</p>
            <div className="flex gap-1 flex-wrap">
              {CHIP_COLORS.map(c => (
                <button
                  key={c.index}
                  onClick={() => onSwapColor(c.index)}
                  disabled={takenColors.has(c.index) && c.index !== myPlayer.chipColor}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    c.index === myPlayer.chipColor ? 'border-white scale-110' : 'border-transparent'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hot/Cold numbers */}
      <HotColdPanel lastResults={lastResults} />

      {/* Ready button (lobby) */}
      {phase === 'LOBBY' && myPlayer && (
        <button
          onClick={onToggleReady}
          className={`w-full py-2 rounded-lg font-semibold text-sm transition ${
            myPlayer.isReady
              ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
              : 'bg-green-600 hover:bg-green-500 text-white'
          }`}
        >
          {myPlayer.isReady ? 'Not Ready' : 'Ready'}
        </button>
      )}

      {/* Start button (host) */}
      {myPlayer?.isHost && (phase === 'LOBBY' || phase === 'ROUND_END') && (
        <button
          onClick={onStartRound}
          className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg font-bold text-sm"
        >
          Start Round
        </button>
      )}

      {/* Chat */}
      <div className="flex-1 min-h-0">
        <ChatBox messages={chatMessages} onSend={onSendChat} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add apps/web/src/components/PlayerSidebar.tsx && git commit -m "feat: add player sidebar component"
```

### Task 8.2: Hot/cold panel + ChatBox

**Files:**
- Create: `apps/web/src/components/HotColdPanel.tsx`
- Create: `apps/web/src/components/ChatBox.tsx`

- [ ] **Step 1: Create HotColdPanel**

```tsx
// apps/web/src/components/HotColdPanel.tsx

import { useMemo } from 'react';
import { displayLabel } from '@roulette/game-core';

interface HotColdPanelProps {
  lastResults: string[];
}

export default function HotColdPanel({ lastResults }: HotColdPanelProps) {
  const frequencies = useMemo(() => {
    const freq = new Map<number, number>();
    for (const s of lastResults) {
      const n = parseInt(s, 10);
      freq.set(n, (freq.get(n) || 0) + 1);
    }

    const entries = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1] || a[0] - b[0]);

    if (entries.length === 0) return [];

    return entries;
  }, [lastResults]);

  if (frequencies.length === 0) return null;

  const maxFreq = frequencies[0]?.[1] ?? 1;
  const hotThreshold = maxFreq;
  const coldThreshold = 1;

  return (
    <div className="bg-gray-800 rounded-xl p-3">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Hot / Cold</h3>
      <div className="flex flex-wrap gap-1">
        {frequencies.map(([num, count]) => {
          const isHot = count >= hotThreshold && count > 1;
          const isCold = count <= coldThreshold && frequencies.length > 5;
          return (
            <span
              key={num}
              className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${
                isHot ? 'bg-red-700 text-red-200' :
                isCold ? 'bg-blue-900 text-blue-200' :
                'bg-gray-700 text-gray-300'
              }`}
              title={`${count} hits`}
            >
              {displayLabel(num)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ChatBox**

```tsx
// apps/web/src/components/ChatBox.tsx

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export default function ChatBox({ messages, onSend }: ChatBoxProps) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div className="bg-gray-800 rounded-xl flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-300 p-3 pb-1">Chat</h3>
      <div className="flex-1 overflow-y-auto p-3 pt-1 space-y-1 min-h-[80px] max-h-[200px]">
        {messages.map((msg, i) => (
          <div key={i} className="text-xs">
            <span className="text-blue-400 font-semibold">{msg.senderName}: </span>
            <span className="text-gray-300">{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-1 p-2 pt-0">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          maxLength={200}
          placeholder="Chat..."
          className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSend}
          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add apps/web/src/components/HotColdPanel.tsx apps/web/src/components/ChatBox.tsx && git commit -m "feat: add hot/cold panel and chat box components"
```

### Task 8.3: Main Game component (wiring everything together)

**Files:**
- Create: `apps/web/src/components/Game.tsx`

- [ ] **Step 1: Create Game component**

```tsx
// apps/web/src/components/Game.tsx

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useRouletteRoom } from '../hooks/useRouletteRoom';
import Wheel3D from './Wheel3D';
import BettingGrid from './BettingGrid';
import ChipTray from './ChipTray';
import PlayerSidebar from './PlayerSidebar';
import { CHIP_COLORS } from '@roulette/game-core';

export default function Game() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const displayName = searchParams.get('name') || 'Player';

  const { gameState, connected, error, joinRoom, send, leave, sessionId } = useRouletteRoom();
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [joined, setJoined] = useState(false);

  // Join room on mount
  useEffect(() => {
    if (roomCode && !joined) {
      joinRoom(roomCode, displayName).then(room => {
        if (!room) navigate('/');
        setJoined(true);
      });
    }
  }, [roomCode]);

  // Handle leave
  useEffect(() => {
    return () => { leave(); };
  }, []);

  if (!gameState || !connected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <p>Connecting to room {roomCode}...</p>
      </div>
    );
  }

  const players = gameState.players;
  const myPlayer = sessionId ? players.get(sessionId) : null;
  const phase = gameState.phase;
  const canBet = phase === 'BETTING' && myPlayer != null;

  // Compute taken colors
  const takenColors = new Set<number>();
  for (const [, p] of players) {
    if (p.chipColor < 8) takenColors.add(p.chipColor);
  }

  // Determine wheel spinning state
  const spinning = phase === 'SPINNING';
  const targetNumber = gameState.winningNumber >= 0 ? gameState.winningNumber : null;

  // Parse round result
  const roundResult = useMemo(() => {
    if (!gameState.roundResult) return null;
    try { return JSON.parse(gameState.roundResult); } catch { return null; }
  }, [gameState.roundResult]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">Roulette</h1>
          <span className="text-sm text-gray-400 font-mono">{gameState.roomCode}</span>
        </div>
        <div className="flex items-center gap-3">
          {phase === 'BETTING' && (
            <span className="text-sm font-mono bg-gray-700 px-2 py-0.5 rounded">
              {gameState.timerSeconds}s
            </span>
          )}
          <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
            phase === 'SPINNING' ? 'bg-yellow-600' :
            phase === 'SETTLEMENT' ? 'bg-green-600' :
            'bg-gray-600'
          }`}>
            {phase}
          </span>
          <button
            onClick={() => { leave(); navigate('/'); }}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Leave
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 max-w-7xl mx-auto w-full">
        {/* Wheel + Grid */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Wheel */}
          <Wheel3D targetNumber={targetNumber} spinning={spinning} />

          {/* Winning number display */}
          {phase === 'SETTLEMENT' && targetNumber !== null && (
            <div className="text-center py-2 bg-green-800 rounded-lg">
              <span className="text-2xl font-bold">
                Winning: {targetNumber === 37 ? '00' : targetNumber}
              </span>
            </div>
          )}

          {/* Round result summary */}
          {roundResult && phase === 'SETTLEMENT' && (
            <div className="bg-gray-800 rounded-xl p-3 text-sm max-h-36 overflow-y-auto">
              <h3 className="font-semibold mb-1">Results</h3>
              {roundResult.results?.map((r: any, i: number) => (
                <div key={i} className={`flex justify-between ${r.won ? 'text-green-400' : 'text-red-400'}`}>
                  <span>{r.name} — {r.betType}</span>
                  <span className="font-mono">{r.won ? `+$${r.payout - r.amount}` : `-$${r.amount}`}</span>
                </div>
              ))}
            </div>
          )}

          {/* Betting grid */}
          <BettingGrid
            chips={gameState.chips || []}
            players={players}
            phase={phase}
            sessionId={sessionId}
            selectedAmount={selectedAmount}
            onPlaceBet={(betType, amount) => send('place-bet', { betType, amount })}
            onRemoveBet={(chipIndex) => send('remove-bet', { chipIndex })}
          />

          {/* Chip tray */}
          <div className="flex items-center gap-3">
            <ChipTray
              selectedAmount={selectedAmount}
              onSelectAmount={setSelectedAmount}
              onClearBets={() => send('clear-bets')}
              canBet={canBet}
            />
            {/* Spin Now button (host only, during BETTING) */}
            {myPlayer?.isHost && phase === 'BETTING' && (
              <button
                onClick={() => send('spin-now')}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-xl font-bold text-sm transition"
              >
                Spin Now
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <PlayerSidebar
            players={players}
            sessionId={sessionId}
            hostPlayerId={gameState.hostPlayerId}
            phase={phase}
            lastResults={gameState.lastResults || []}
            chatMessages={gameState.chatMessages || []}
            onSendChat={(text) => send('chat', { text })}
            onToggleReady={() => send('toggle-ready')}
            onSwapColor={(index) => send('swap-color', { targetIndex: index })}
            onStartRound={() => send('start-round')}
            takenColors={takenColors}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update App.tsx to remove placeholder**

The App.tsx already routes to Game at `/game/:roomCode` — no change needed.

- [ ] **Step 3: Verify type-check**

```bash
cd /home/jay/User_Apps/Roulette_Online/apps/web && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
cd /home/jay/User_Apps/Roulette_Online && git add apps/web/src/components/Game.tsx && git commit -m "feat: add main game view wiring all components"
```

---

## Phase 9: Integration & Build

### Task 9.1: Build the web client

- [ ] **Step 1: Build the web app**

```bash
cd /home/jay/User_Apps/Roulette_Online/apps/web && npx vite build
```

- [ ] **Step 2: Symlink/copy dist to mahjong server**

```bash
# Create a symlink so the mahjong server can serve the roulette dist
ln -s /home/jay/User_Apps/Roulette_Online/apps/web/dist /home/jay/User_Apps/mahjong/apps/server/roulette-dist
```

- [ ] **Step 3: Start the mahjong server and verify**

```bash
cd /home/jay/User_Apps/mahjong/apps/server && npx tsx src/index.ts &
sleep 2
# Test room creation API
curl -s -X POST http://localhost:2500/api/rooms \
  -H 'Content-Type: application/json' \
  -d '{"displayName":"Test","game":"roulette"}' | head -c 200
# Should return { roomCode, roomId, hostPlayerId, game: "roulette" }
```

- [ ] **Step 4: Verify frontend dev server works**

```bash
cd /home/jay/User_Apps/Roulette_Online/apps/web && npx vite --host 0.0.0.0 &
sleep 3 && curl -s http://localhost:4500 | grep "Roulette Online"
```

- [ ] **Step 5: Kill servers and commit**

```bash
kill %1 %2 2>/dev/null
cd /home/jay/User_Apps/mahjong && git add apps/server/roulette-dist && git commit -m "chore: add roulette-dist symlink"
cd /home/jay/User_Apps/Roulette_Online && git add -A && git commit -m "chore: final integration and build artifacts"
```

---

## Phase 10: Final Verification

- [ ] **Step 1: Run all game-core tests**

```bash
cd /home/jay/User_Apps/Roulette_Online/packages/roulette-game-core && npx vitest run
# Expected: all tests PASS (wheel, bets, payout)
```

- [ ] **Step 2: Type-check the entire project**

```bash
cd /home/jay/User_Apps/Roulette_Online/packages/roulette-game-core && npx tsc --noEmit
cd /home/jay/User_Apps/Roulette_Online/apps/web && npx tsc --noEmit
cd /home/jay/User_Apps/mahjong/apps/server && npx tsc --noEmit
# Expected: no errors
```

- [ ] **Step 3: Full integration smoke test**

```bash
# Start mahjong server
cd /home/jay/User_Apps/mahjong/apps/server && npx tsx src/index.ts &

# Start roulette web dev
cd /home/jay/User_Apps/Roulette_Online/apps/web && npx vite --host 0.0.0.0 &

sleep 3
# Create room via API
ROOM=$(curl -s -X POST http://localhost:2500/api/rooms \
  -H 'Content-Type: application/json' \
  -d '{"displayName":"Alice","game":"roulette"}')
echo $ROOM
# Expected: valid roomCode

# Open browser test: navigate to http://localhost:4500, create a room, verify
# lobby loads, betting grid visible, 3D wheel renders.

# Kill servers
kill %1 %2 2>/dev/null
```
