/**
 * Drop-zone detection for the roulette betting grid.
 * Determines bet type based on where a chip is dropped relative to number cells.
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
}

const EDGE_THRESHOLD = 0.2;

export function detectDropZone(
  x: number,
  y: number,
  cellRects: CellRect[],
  zeroRect?: { x: number; y: number; width: number; height: number },
  doubleZeroRect?: { x: number; y: number; width: number; height: number },
): DropResult | null {
  // Check if over 0 or 00
  if (zeroRect && x >= zeroRect.x && x <= zeroRect.x + zeroRect.width && y >= zeroRect.y && y <= zeroRect.y + zeroRect.height) {
    return { betType: 'straight_0', label: '0', coveredNumbers: [0] };
  }
  if (doubleZeroRect && x >= doubleZeroRect.x && x <= doubleZeroRect.x + doubleZeroRect.width && y >= doubleZeroRect.y && y <= doubleZeroRect.y + doubleZeroRect.height) {
    return { betType: 'straight_37', label: '00', coveredNumbers: [37] };
  }

  // Find the cell the cursor is over
  let hitCell: CellRect | null = null;
  let relX = 0;
  let relY = 0;

  for (const cell of cellRects) {
    if (x >= cell.x && x <= cell.x + cell.width && y >= cell.y && y <= cell.y + cell.height) {
      hitCell = cell;
      relX = (x - cell.x) / cell.width;
      relY = (y - cell.y) / cell.height;
      break;
    }
  }

  if (!hitCell) return null;

  const { row, col, number } = hitCell;
  const getCellAt = (r: number, c: number) => cellRects.find(cr => cr.row === r && cr.col === c);

  const onLeftEdge = relX < EDGE_THRESHOLD;
  const onRightEdge = relX > 1 - EDGE_THRESHOLD;
  const onTopEdge = relY < EDGE_THRESHOLD;
  const onBottomEdge = relY > 1 - EDGE_THRESHOLD;

  // Center zone = straight bet
  if (!onLeftEdge && !onRightEdge && !onTopEdge && !onBottomEdge) {
    return { betType: `straight_${number}`, label: String(number === 37 ? '00' : number), coveredNumbers: [number] };
  }

  // Corner (intersection of 4 cells)
  if ((onTopEdge || onBottomEdge) && (onLeftEdge || onRightEdge)) {
    const corners: number[] = [];
    const rOffset = onTopEdge ? -1 : 1;
    const cOffset = onLeftEdge ? -1 : 1;

    corners.push(number);
    const h = getCellAt(row, col + cOffset);
    const v = getCellAt(row + rOffset, col);
    const d = getCellAt(row + rOffset, col + cOffset);
    if (h) corners.push(h.number);
    if (v) corners.push(v.number);
    if (d) corners.push(d.number);

    if (corners.length === 4) {
      const sorted = corners.sort((a, b) => a - b);
      return { betType: `corner_${sorted.join('_')}`, label: 'Corner', coveredNumbers: sorted };
    }
  }

  // Split (horizontal edge between rows)
  if (onTopEdge || onBottomEdge) {
    const rOffset = onTopEdge ? -1 : 1;
    const neighbor = getCellAt(row + rOffset, col);
    if (neighbor) {
      const sorted = [number, neighbor.number].sort((a, b) => a - b);
      return { betType: `split_${sorted.join('_')}`, label: 'Split', coveredNumbers: sorted };
    }
  }

  // Split (vertical edge between columns)
  if (onLeftEdge || onRightEdge) {
    const cOffset = onLeftEdge ? -1 : 1;
    const neighbor = getCellAt(row, col + cOffset);
    if (neighbor) {
      const sorted = [number, neighbor.number].sort((a, b) => a - b);
      return { betType: `split_${sorted.join('_')}`, label: 'Split', coveredNumbers: sorted };
    }
  }

  // Fallback to straight
  return { betType: `straight_${number}`, label: String(number === 37 ? '00' : number), coveredNumbers: [number] };
}
