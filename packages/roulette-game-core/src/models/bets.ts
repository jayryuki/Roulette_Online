// packages/roulette-game-core/src/models/bets.ts

import { isRed, isBlack, DOUBLE_ZERO } from './wheel';

/**
 * Bet type string format:
 *   "straight_N"      — single number (0, 1-36, 37=00)
 *   "split_A_B"       — two adjacent numbers
 *   "street_N"        — row of 3 (N is the row's first number)
 *   "corner_A_B_C_D"  — block of 4 numbers
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
 * e.g. straight -> 35 (player gets stake * 35 profit + stake back = stake * 36)
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
 * Check if a bet wins on the given winning number (0-37, 37=00).
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
      const start = args[0];
      return n === start || n === start + 1 || n === start + 2;
    }

    case 'corner':
      return args.includes(n);

    case 'five':
      return n === 0 || n === DOUBLE_ZERO || n === 1 || n === 2 || n === 3;

    case 'sixline': {
      const start = args[0];
      return n >= start && n <= start + 5;
    }

    case 'dozen': {
      const d = args[0];
      const lo = (d - 1) * 12 + 1;
      const hi = d * 12;
      return n >= lo && n <= hi;
    }

    case 'column': {
      const col = args[0];
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
      return args.length === 2 && args.every(n => (n >= 0 && n <= 36) || n === DOUBLE_ZERO);
    }
    case 'street': {
      const start = args[0];
      return start >= 1 && start <= 34 && (start - 1) % 3 === 0;
    }
    case 'corner': {
      return args.length === 4 && args.every(n => (n >= 1 && n <= 36));
    }
    case 'five':
      return true;
    case 'sixline': {
      const start = args[0];
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

/** List of simple (non-number-specific) bet types for UI rendering */
export const SIMPLE_BETS: BetType[] = [
  'red', 'black', 'even', 'odd', 'low', 'high',
  'dozen_1', 'dozen_2', 'dozen_3',
  'column_1', 'column_2', 'column_3',
  'five',
];
