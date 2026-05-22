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
