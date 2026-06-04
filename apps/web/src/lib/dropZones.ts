/**
 * Drop-zone detection for the roulette betting grid.
 * Determines bet type based on where a chip is dropped relative to number cells.
 *
 * Supported bet types:
 *   straight  — chip centered on a single number cell
 *   split     — chip on the edge between two adjacent cells
 *   corner    — chip at the intersection of four cells
 *   street    — chip at the left edge of a column (covers 3 numbers)
 *   sixline   — chip at the left edge between two columns (covers 6 numbers)
 *   five      — chip above 0/00 next to 1-2-3 (covers 0, 00, 1, 2, 3)
 *
 * Nearest-cell snapping: when the cursor is between or outside cells,
 * the function finds the closest valid snap point so drops always resolve.
 */

export interface CellRect {
  number: number;
  row: number;  // 0-2 (top/mid/bot)
  col: number;  // 0-11
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DropResult {
  betType: string;
  label: string;
  coveredNumbers: number[];
  /** Screen coordinates where the ghost chip should snap to. */
  snapX: number;
  snapY: number;
}

/** How far from a cell edge to detect edge/corner interactions (fraction of cell width/height). */
const EDGE_THRESHOLD = 0.25;
/** Pixel tolerance for bridging gaps between cells and for edge-of-grid zones. */
const GAP_TOLERANCE = 8;

/** Return the three numbers in a street (column of 3). */
function streetNumbers(col: number): number[] {
  // col 0 → [1,2,3], col 1 → [4,5,6], ... col 11 → [34,35,36]
  const start = col * 3 + 1;
  return [start, start + 1, start + 2];
}

/** Return the six numbers in a sixline (two adjacent streets). */
function sixlineNumbers(col: number): number[] {
  const start = col * 3 + 1;
  return [start, start + 1, start + 2, start + 3, start + 4, start + 5];
}

export function detectDropZone(
  x: number,
  y: number,
  cellRects: CellRect[],
  zeroRect?: { x: number; y: number; width: number; height: number },
  doubleZeroRect?: { x: number; y: number; width: number; height: number },
): DropResult | null {
  if (cellRects.length === 0) return null;

  // Build a lookup by (row, col) for fast neighbor access.
  const cellByPos = new Map<string, CellRect>();
  for (const c of cellRects) cellByPos.set(`${c.row}:${c.col}`, c);
  const getCellAt = (r: number, c: number) => cellByPos.get(`${r}:${c}`);

  // ---- Split between 0 and 00 ----
  if (zeroRect && doubleZeroRect) {
    const zeroBottom = zeroRect.y + zeroRect.height;
    const doubleZeroTop = doubleZeroRect.y;
    const avgHeight = (zeroRect.height + doubleZeroRect.height) / 2;
    const edgeThreshold = avgHeight * EDGE_THRESHOLD;
    const centerX = (zeroRect.x + zeroRect.width / 2 + doubleZeroRect.x + doubleZeroRect.width / 2) / 2;

    if (x >= centerX - edgeThreshold && x <= centerX + edgeThreshold &&
        y >= zeroBottom - edgeThreshold && y <= doubleZeroTop + edgeThreshold) {
      const snapX = centerX;
      const snapY = (zeroBottom + doubleZeroTop) / 2;
      return { betType: 'split_0_37', label: 'Split 0-00', coveredNumbers: [0, 37], snapX, snapY };
    }
  }

  // ---- Splits on the right edge of 0 / 00 with the first column ----
  // These MUST be checked before straight bets because straight zones overlap edge zones.
  if (zeroRect) {
    const col0Cells = cellRects.filter(c => c.col === 0);
    const rightEdge = zeroRect.x + zeroRect.width;
    const edgeThreshold = zeroRect.width * EDGE_THRESHOLD;
    if (x >= rightEdge - edgeThreshold && x <= rightEdge + edgeThreshold + GAP_TOLERANCE) {
      // Find the nearest col-0 cell by vertical distance to its center
      let bestCell: CellRect | null = null;
      let bestDist = Infinity;
      for (const c of col0Cells) {
        const cy = c.y + c.height / 2;
        const dist = Math.abs(y - cy);
        if (dist < bestDist) { bestDist = dist; bestCell = c; }
      }
      if (bestCell && y >= zeroRect.y - GAP_TOLERANCE && y <= zeroRect.y + zeroRect.height + GAP_TOLERANCE) {
        const a = 0, b = bestCell.number;
        const sorted = [a, b].sort((p, q) => p - q);
        const snapX = (rightEdge + bestCell.x) / 2;
        const snapY = zeroRect.y + zeroRect.height / 2;
        return { betType: `split_${sorted.join('_')}`, label: `Split 0-${b === 37 ? '00' : String(b)}`, coveredNumbers: sorted, snapX, snapY };
      }
    }
  }

  // ---- Five-number bet (0, 00, 1, 2, 3) ----
  // Only at the corner between 0/00 and the first column (near cell 1).
  // This must be checked BEFORE the 00→col0 split because the corner is
  // inside the right-edge zone of 00.
  if (zeroRect && doubleZeroRect) {
    const cell1 = cellRects.find(c => c.number === 1);
    if (cell1) {
      const cornerX = (zeroRect.x + zeroRect.width + cell1.x) / 2;
      const cornerY = (doubleZeroRect.y + doubleZeroRect.height + cell1.y) / 2;
      const threshold = cell1.width * EDGE_THRESHOLD;
      if (Math.abs(x - cornerX) <= threshold && Math.abs(y - cornerY) <= threshold) {
        return { betType: 'five', label: 'Top Line (0-00-1-2-3)', coveredNumbers: [0, 37, 1, 2, 3], snapX: cornerX, snapY: cornerY };
      }
    }
  }
  if (doubleZeroRect) {
    const col0Cells = cellRects.filter(c => c.col === 0);
    const rightEdge = doubleZeroRect.x + doubleZeroRect.width;
    const edgeThreshold = doubleZeroRect.width * EDGE_THRESHOLD;
    if (x >= rightEdge - edgeThreshold && x <= rightEdge + edgeThreshold + GAP_TOLERANCE) {
      let bestCell: CellRect | null = null;
      let bestDist = Infinity;
      for (const c of col0Cells) {
        const cy = c.y + c.height / 2;
        const dist = Math.abs(y - cy);
        if (dist < bestDist) { bestDist = dist; bestCell = c; }
      }
      if (bestCell && y >= doubleZeroRect.y - GAP_TOLERANCE && y <= doubleZeroRect.y + doubleZeroRect.height + GAP_TOLERANCE) {
        const a = 37, b = bestCell.number;
        const sorted = [a, b].sort((p, q) => p - q);
        const snapX = (rightEdge + bestCell.x) / 2;
        const snapY = doubleZeroRect.y + doubleZeroRect.height / 2;
        return { betType: `split_${sorted.join('_')}`, label: `Split 00-${b === 37 ? '00' : String(b)}`, coveredNumbers: sorted, snapX, snapY };
      }
    }
  }

  // ---- 0 / 00 straight bets ----
  if (zeroRect && x >= zeroRect.x - GAP_TOLERANCE && x <= zeroRect.x + zeroRect.width + GAP_TOLERANCE && y >= zeroRect.y - GAP_TOLERANCE && y <= zeroRect.y + zeroRect.height + GAP_TOLERANCE) {
    return { betType: 'straight_0', label: '0', coveredNumbers: [0], snapX: zeroRect.x + zeroRect.width / 2, snapY: zeroRect.y + zeroRect.height / 2 };
  }
  if (doubleZeroRect && x >= doubleZeroRect.x - GAP_TOLERANCE && x <= doubleZeroRect.x + doubleZeroRect.width + GAP_TOLERANCE && y >= doubleZeroRect.y - GAP_TOLERANCE && y <= doubleZeroRect.y + doubleZeroRect.height + GAP_TOLERANCE) {
    return { betType: 'straight_37', label: '00', coveredNumbers: [37], snapX: doubleZeroRect.x + doubleZeroRect.width / 2, snapY: doubleZeroRect.y + doubleZeroRect.height / 2 };
  }

  // ---- Find the cell the cursor is over or nearest to ----
  let hitCell: CellRect | null = null;
  let relX = 0;
  let relY = 0;

  // First pass: direct hit (with gap tolerance)
  for (const cell of cellRects) {
    if (x >= cell.x - GAP_TOLERANCE && x <= cell.x + cell.width + GAP_TOLERANCE &&
        y >= cell.y - GAP_TOLERANCE && y <= cell.y + cell.height + GAP_TOLERANCE) {
      hitCell = cell;
      relX = Math.max(0, Math.min(1, (x - cell.x) / cell.width));
      relY = Math.max(0, Math.min(1, (y - cell.y) / cell.height));
      break;
    }
  }

  // Second pass: nearest-cell snapping (cursor is between or outside cells)
  if (!hitCell) {
    let bestDist = Infinity;
    let bestCell: CellRect | null = null;
    for (const cell of cellRects) {
      const cx = cell.x + cell.width / 2;
      const cy = cell.y + cell.height / 2;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < bestDist) {
        bestDist = dist;
        bestCell = cell;
      }
    }
    if (bestCell) {
      hitCell = bestCell;
      relX = Math.max(0, Math.min(1, (x - bestCell.x) / bestCell.width));
      relY = Math.max(0, Math.min(1, (y - bestCell.y) / bestCell.height));
    }
  }

  if (!hitCell) return null;

  const { row, col, number } = hitCell;

  // Precompute snap positions for the hit cell
  const cellCenterX = hitCell.x + hitCell.width / 2;
  const cellCenterY = hitCell.y + hitCell.height / 2;
  const cellRightEdgeX = hitCell.x + hitCell.width;
  const cellLeftEdgeX = hitCell.x;
  const cellTopEdgeY = hitCell.y;
  const cellBottomEdgeY = hitCell.y + hitCell.height;

  const onLeftEdge = relX < EDGE_THRESHOLD;
  const onRightEdge = relX > 1 - EDGE_THRESHOLD;
  const onTopEdge = relY < EDGE_THRESHOLD;
  const onBottomEdge = relY > 1 - EDGE_THRESHOLD;

  // ---- Corner (intersection of 4 cells) ----
  if ((onTopEdge || onBottomEdge) && (onLeftEdge || onRightEdge)) {
    let rOffset = onTopEdge ? -1 : 1;
    let cOffset = onLeftEdge ? -1 : 1;
    // At grid boundaries, look inward
    if (onBottomEdge && !getCellAt(row + 1, col)) rOffset = -1;
    if (onLeftEdge && !getCellAt(row, col - 1)) cOffset = 1;
    if (onRightEdge && !getCellAt(row, col + 1)) cOffset = -1;
    // NOTE: top edge intentionally NOT handled — that zone is for street/sixline bets.

    const corners: number[] = [];
    corners.push(number);
    const h = getCellAt(row, col + cOffset);
    const v = getCellAt(row + rOffset, col);
    const d = getCellAt(row + rOffset, col + cOffset);
    if (h) corners.push(h.number);
    if (v) corners.push(v.number);
    if (d) corners.push(d.number);

    if (corners.length === 4) {
      const sorted = corners.sort((a, b) => a - b);
      const snapX = onRightEdge ? cellRightEdgeX : cellLeftEdgeX;
      const snapY = onBottomEdge ? cellBottomEdgeY : cellTopEdgeY;
      return { betType: `corner_${sorted.join('_')}`, label: 'Corner', coveredNumbers: sorted, snapX, snapY };
    }
  }

  // ---- Street bet (top edge of grid, above row 0) ----
  if (onTopEdge && row === 0) {
    if (!onLeftEdge && !onRightEdge) {
      const nums = streetNumbers(col);
      const sorted = nums.sort((a, b) => a - b);
      return { betType: `street_${sorted[0]}`, label: `Street (${sorted.join('-')})`, coveredNumbers: sorted, snapX: cellCenterX, snapY: cellTopEdgeY + hitCell.height * 0.25 };
    }
  }

  // ---- Sixline / double street (top edge, between two columns) ----
  if (onTopEdge && row === 0 && (onLeftEdge || onRightEdge)) {
    const cOffset = onLeftEdge ? -1 : 1;
    const neighbor = getCellAt(row, col + cOffset);
    if (neighbor) {
      const minCol = Math.min(col, neighbor.col);
      const nums = sixlineNumbers(minCol);
      const start = Math.min(...nums);
      const snapX = onLeftEdge ? cellLeftEdgeX : cellRightEdgeX;
      return { betType: `sixline_${start}`, label: `Double Street (${nums.sort((a,b)=>a-b).join('-')})`, coveredNumbers: nums.sort((a,b)=>a-b), snapX, snapY: cellTopEdgeY + hitCell.height * 0.25 };
    }
  }

  // ---- Split (horizontal edge between rows) ----
  if (onTopEdge || onBottomEdge) {
    const rOffset = onTopEdge ? -1 : 1;
    const neighbor = getCellAt(row + rOffset, col);
    if (neighbor) {
      const sorted = [number, neighbor.number].sort((a, b) => a - b);
      const snapX = cellCenterX;
      const snapY = onBottomEdge ? cellBottomEdgeY : cellTopEdgeY;
      return { betType: `split_${sorted.join('_')}`, label: 'Split', coveredNumbers: sorted, snapX, snapY };
    }
  }

  // ---- Split (vertical edge between columns) ----
  if (onLeftEdge || onRightEdge) {
    const cOffset = onLeftEdge ? -1 : 1;
    const neighbor = getCellAt(row, col + cOffset);
    if (neighbor) {
      const sorted = [number, neighbor.number].sort((a, b) => a - b);
      const snapX = onRightEdge ? cellRightEdgeX : cellLeftEdgeX;
      const snapY = cellCenterY;
      return { betType: `split_${sorted.join('_')}`, label: 'Split', coveredNumbers: sorted, snapX, snapY };
    }
  }

  // ---- Fallback: straight bet ----
  return { betType: `straight_${number}`, label: String(number === 37 ? '00' : number), coveredNumbers: [number], snapX: cellCenterX, snapY: cellCenterY };
}
