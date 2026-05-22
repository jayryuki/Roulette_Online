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
