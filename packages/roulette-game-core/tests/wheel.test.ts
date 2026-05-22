import { describe, it, expect } from 'vitest';
import { WHEEL_NUMBERS, numberColor, isRed, isBlack, isGreen, POCKET_COUNT, DOUBLE_ZERO, displayLabel, wheelIndex } from '../src/models/wheel';

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
    expect(displayLabel(0)).toBe('0');
    expect(displayLabel(37)).toBe('00');
    expect(displayLabel(17)).toBe('17');
  });

  it('wheelIndex returns correct positions', () => {
    expect(wheelIndex(0)).toBe(0);   // first in wheel order
    expect(wheelIndex(2)).toBe(37);  // last in wheel order
    expect(wheelIndex(37)).toBe(19); // 00 position
  });
});
