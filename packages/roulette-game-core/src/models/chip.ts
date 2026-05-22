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
