// packages/roulette-game-core/src/index.ts
// Barrel exports for the roulette game-core package

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
} from './models/wheel.js';
export type { PocketColor } from './models/wheel.js';

export {
  parseBet,
  payoutMultiplier,
  isWinningBet,
  validateBet,
  SIMPLE_BETS,
} from './models/bets.js';
export type { BetType } from './models/bets.js';

export {
  CHIP_COLORS,
  CHIP_COUNT,
  getChipColor,
  assignChipColor,
} from './models/chip.js';
export type { ChipColor } from './models/chip.js';

// Engine
export {
  canTransition,
  phaseType,
  VALID_TRANSITIONS,
} from './engine/fsm.js';
export type { PhaseType, GamePhase, LobbyPhase, BettingPhase, SpinningPhase, SettlementPhase, RoundEndPhase } from './engine/fsm.js';

export type { PlayerAction } from './engine/actions.js';

// Payout
export {
  calculatePayouts,
  calculateNetProfit,
} from './payout.js';
export type { Chip, PayoutResult } from './payout.js';
