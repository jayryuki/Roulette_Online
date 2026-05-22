// packages/roulette-game-core/tests/bets.test.ts
import { describe, it, expect } from 'vitest';
import {
  parseBet,
  payoutMultiplier,
  isWinningBet,
  validateBet,
  SIMPLE_BETS,
} from '../src/models/bets';

describe('Bet types', () => {
  // --- Straight bets ---
  it('straight bet wins only on exact number', () => {
    expect(isWinningBet('straight_17', 17)).toBe(true);
    expect(isWinningBet('straight_17', 18)).toBe(false);
    expect(isWinningBet('straight_0', 0)).toBe(true);
    expect(isWinningBet('straight_37', 37)).toBe(true); // 00
  });

  it('straight bet pays 35:1', () => {
    expect(payoutMultiplier('straight_17')).toBe(35);
  });

  // --- Split bets ---
  it('split bet wins on either number', () => {
    expect(isWinningBet('split_1_2', 1)).toBe(true);
    expect(isWinningBet('split_1_2', 2)).toBe(true);
    expect(isWinningBet('split_1_2', 3)).toBe(false);
  });

  it('split bet pays 17:1', () => {
    expect(payoutMultiplier('split_1_2')).toBe(17);
  });

  // --- Street bets ---
  it('street bet wins on any of 3 numbers in a row', () => {
    expect(isWinningBet('street_1', 1)).toBe(true);
    expect(isWinningBet('street_1', 2)).toBe(true);
    expect(isWinningBet('street_1', 3)).toBe(true);
    expect(isWinningBet('street_1', 4)).toBe(false);
  });

  it('street bet pays 11:1', () => {
    expect(payoutMultiplier('street_1')).toBe(11);
  });

  // --- Corner bets ---
  it('corner bet wins on any of 4 numbers', () => {
    expect(isWinningBet('corner_1_2_4_5', 1)).toBe(true);
    expect(isWinningBet('corner_1_2_4_5', 2)).toBe(true);
    expect(isWinningBet('corner_1_2_4_5', 4)).toBe(true);
    expect(isWinningBet('corner_1_2_4_5', 5)).toBe(true);
    expect(isWinningBet('corner_1_2_4_5', 3)).toBe(false);
  });

  it('corner bet pays 8:1', () => {
    expect(payoutMultiplier('corner_1_2_4_5')).toBe(8);
  });

  // --- Five bet (0-00-1-2-3) ---
  it('five bet wins on 0,00,1,2,3', () => {
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

  // --- Sixline bets ---
  it('sixline bet wins on any of 6 numbers', () => {
    expect(isWinningBet('sixline_1', 1)).toBe(true);
    expect(isWinningBet('sixline_1', 6)).toBe(true);
    expect(isWinningBet('sixline_1', 7)).toBe(false);
  });

  it('sixline bet pays 5:1', () => {
    expect(payoutMultiplier('sixline_1')).toBe(5);
  });

  // --- Dozen bets ---
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

  // --- Column bets ---
  it('column bet pays 2:1', () => {
    expect(payoutMultiplier('column_1')).toBe(2);
  });

  it('column_1 wins on 1,4,7,...,34', () => {
    expect(isWinningBet('column_1', 1)).toBe(true);
    expect(isWinningBet('column_1', 4)).toBe(true);
    expect(isWinningBet('column_1', 34)).toBe(true);
    expect(isWinningBet('column_1', 2)).toBe(false);
  });

  // --- Red/Black ---
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

  // --- Even/Odd ---
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

  // --- Low/High ---
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

  // --- Validation ---
  it('validateBet rejects invalid strings', () => {
    expect(validateBet('nonsense')).toBe(false);
    expect(validateBet('straight_38')).toBe(false);
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

  // --- SIMPLE_BETS ---
  it('SIMPLE_BETS contains all outside bets', () => {
    expect(SIMPLE_BETS).toContain('red');
    expect(SIMPLE_BETS).toContain('black');
    expect(SIMPLE_BETS).toContain('even');
    expect(SIMPLE_BETS).toContain('odd');
    expect(SIMPLE_BETS).toContain('low');
    expect(SIMPLE_BETS).toContain('high');
    expect(SIMPLE_BETS).toContain('dozen_1');
    expect(SIMPLE_BETS).toContain('dozen_2');
    expect(SIMPLE_BETS).toContain('dozen_3');
    expect(SIMPLE_BETS).toContain('column_1');
    expect(SIMPLE_BETS).toContain('column_2');
    expect(SIMPLE_BETS).toContain('column_3');
    expect(SIMPLE_BETS).toContain('five');
  });

  // --- parseBet ---
  it('parseBet parses straight bet correctly', () => {
    const result = parseBet('straight_17');
    expect(result).toEqual({ category: 'straight', args: [17] });
  });

  it('parseBet parses simple bet correctly', () => {
    const result = parseBet('red');
    expect(result).toEqual({ category: 'red', args: [] });
  });

  it('parseBet returns null for invalid bet', () => {
    expect(parseBet('straight_abc')).toBeNull();
  });
});
