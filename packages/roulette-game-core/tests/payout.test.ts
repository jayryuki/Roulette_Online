// packages/roulette-game-core/tests/payout.test.ts
import { describe, it, expect } from 'vitest';
import { calculatePayouts, calculateNetProfit, type Chip } from '../src/payout';

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

describe('calculateNetProfit', () => {
  it('calculates net profit correctly', () => {
    const results = [
      { playerId: 'p1', betType: 'straight_7', amount: 5, won: true, payout: 180 },
      { playerId: 'p1', betType: 'red', amount: 20, won: true, payout: 40 },
      { playerId: 'p1', betType: 'black', amount: 10, won: false, payout: 0 },
    ];
    // Net = (won payouts - bets placed)
    // p1: (180 - 5) + (40 - 20) + (0 - 10) = 175 + 20 - 10 = 185
    expect(calculateNetProfit(results, 'p1')).toBe(185);
  });

  it('returns 0 for player with no results', () => {
    const results = [
      { playerId: 'p1', betType: 'red', amount: 10, won: false, payout: 0 },
    ];
    expect(calculateNetProfit(results, 'p2')).toBe(0);
  });
});
