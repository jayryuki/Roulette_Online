import { describe, it, expect } from 'vitest';
import { detectDropZone, type CellRect } from '../../apps/web/src/lib/dropZones';

describe('detectDropZone — 0/00 splits and top line', () => {
  // Realistic American roulette layout (matches the deployed app CSS):
  // - Zero column on the LEFT, 0 on top, 00 on bottom (with 3px gap)
  // - Number grid: 3 rows × 12 cols
  //   - row 0 (top):    3, 6, 9, ..., 36
  //   - row 1 (middle): 2, 5, 8, ..., 35
  //   - row 2 (bottom): 1, 4, 7, ..., 34
  // Cell size: 50w × 40h, gap: 3px
  const W = 50, H = 40, GAP = 3;
  const zeroX = 0, zeroY = 0;
  const dzX = 0, dzY = H + GAP;
  const zeroRect = { x: zeroX, y: zeroY, width: W, height: H };
  const doubleZeroRect = { x: dzX, y: dzY, width: W, height: H };

  const cellRects: CellRect[] = [];
  for (let col = 0; col < 12; col++) {
    const x = W + GAP + col * (W + GAP); // number grid starts to the right of zero column
    cellRects.push({ number: col * 3 + 3, row: 0, col, x, y: 0, width: W, height: H });
    cellRects.push({ number: col * 3 + 2, row: 1, col, x, y: H + GAP, width: W, height: H });
    cellRects.push({ number: col * 3 + 1, row: 2, col, x, y: 2 * (H + GAP), width: W, height: H });
  }

  it('split_0_37 (vertical split between 0 and 00) at the boundary', () => {
    // Cursor at the horizontal center of 0/00, right at the boundary line
    const cx = zeroX + W / 2;
    const cy = (zeroY + H + dzY) / 2; // midpoint between bottom of 0 and top of 00
    const result = detectDropZone(cx, cy, cellRects, zeroRect, doubleZeroRect);
    expect(result?.betType).toBe('split_0_37');
    expect(result?.coveredNumbers).toEqual([0, 37]);
  });

  it('split_0_37 still detected slightly above boundary (in 0 cell)', () => {
    const cx = zeroX + W / 2;
    const cy = (zeroY + H + dzY) / 2 - 5; // 5px above the boundary
    const result = detectDropZone(cx, cy, cellRects, zeroRect, doubleZeroRect);
    expect(result?.betType).toBe('split_0_37');
  });

  it('split_0_37 still detected slightly below boundary (in 00 cell)', () => {
    const cx = zeroX + W / 2;
    const cy = (zeroY + H + dzY) / 2 + 5;
    const result = detectDropZone(cx, cy, cellRects, zeroRect, doubleZeroRect);
    expect(result?.betType).toBe('split_0_37');
  });

  it('top line (five) bet at bottom-right corner of 0/00', () => {
    // Cursor at the corner where 0/00 meets cell 1
    const cell1 = cellRects.find(c => c.number === 1)!;
    const cornerX = (zeroRect.x + zeroRect.width + cell1.x) / 2;
    const cornerY = (doubleZeroRect.y + doubleZeroRect.height + cell1.y) / 2;
    const result = detectDropZone(cornerX, cornerY, cellRects, zeroRect, doubleZeroRect);
    expect(result?.betType).toBe('five');
    expect(result?.coveredNumbers).toEqual([0, 37, 1, 2, 3]);
  });

  it('split_0_1 at right edge of 0 (top half) should detect split, not five', () => {
    // Cursor at right edge of 0, vertically aligned with cell 3 (which is the top of column 0)
    // 0-3 split is a vertical split between 0 and cell 3
    const cx = zeroRect.x + zeroRect.width + (cellRects.find(c => c.number === 3)!.x - (zeroRect.x + zeroRect.width)) / 2;
    const cy = zeroRect.y + zeroRect.height / 2; // vertical center of 0
    const result = detectDropZone(cx, cy, cellRects, zeroRect, doubleZeroRect);
    // Should be a split involving 0, not the five-number bet
    expect(result?.betType).toMatch(/^split_/);
    expect(result?.coveredNumbers).toContain(0);
  });

  it('straight_0 when cursor is in the center of 0', () => {
    const result = detectDropZone(
      zeroRect.x + zeroRect.width / 2,
      zeroRect.y + zeroRect.height / 2,
      cellRects, zeroRect, doubleZeroRect,
    );
    expect(result?.betType).toBe('straight_0');
  });

  it('straight_37 when cursor is in the center of 00', () => {
    const result = detectDropZone(
      doubleZeroRect.x + doubleZeroRect.width / 2,
      doubleZeroRect.y + doubleZeroRect.height / 2,
      cellRects, zeroRect, doubleZeroRect,
    );
    expect(result?.betType).toBe('straight_37');
  });

  it('5px to the right of 0-00 boundary but at center X should still be split_0_37', () => {
    // This is the critical case — the user expects the chip to register as a 0-00 split
    // when dropped at the boundary between 0 and 00, anywhere along the column.
    const cx = zeroX + W / 2;
    const cy = zeroY + H + 1; // 1px into the gap from 0's bottom
    const result = detectDropZone(cx, cy, cellRects, zeroRect, doubleZeroRect);
    expect(result?.betType).toBe('split_0_37');
  });
});
