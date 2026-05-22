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
