import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import type { ChipData, PlayerData } from '../types';
import { CHIP_COLORS, parseBet } from '@roulette/game-core';
import { detectDropZone } from '../lib/dropZones';
import type { CellRect, DropResult } from '../lib/dropZones';

interface DragStateInput {
  isDragging: boolean;
  amount: number;
  currentX: number;
  currentY: number;
  snapX: number;
  snapY: number;
  chipColorIndex: number;
}

interface BettingGridProps {
  chips: ChipData[];
  players: Map<string, PlayerData>;
  phase: string;
  sessionId: string | null;
  selectedAmount: number;
  onPlaceBet: (betType: string, amount: number) => void;
  onRemoveBet: (chipIndex: number) => void;
  isMobile?: boolean;
  dragState?: DragStateInput | null;
  onDrop?: (betType: string, amount: number) => void;
  onDragCancel?: () => void;
  onGridPointerDown?: (x: number, y: number) => void;
  wasDragging?: () => boolean;
  /** Press on a placed chip to reposition it. */
  onChipPointerDown?: (chipIndex: number, amount: number, chipColor: number, x: number, y: number) => void;
}

/** Return the numbers covered by a bet type. */
function coveredNumbers(betType: string): number[] {
  const parsed = parseBet(betType);
  if (!parsed) return [];
  const { category, args } = parsed;
  switch (category) {
    case 'straight':
      return [args[0]];
    case 'split':
      return args;
    case 'street': {
      const s = args[0];
      return [s, s + 1, s + 2];
    }
    case 'corner':
      return args;
    case 'five':
      return [0, 37, 1, 2, 3];
    case 'sixline': {
      const s = args[0];
      return [s, s + 1, s + 2, s + 3, s + 4, s + 5];
    }
    default:
      return [];
  }
}

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function numColor(n: number): string {
  if (n === 0 || n === 37) return 'var(--roulette-green)';
  return RED_NUMBERS.has(n) ? 'var(--roulette-red)' : 'var(--roulette-black)';
}

function displayNum(n: number): string {
  return n === 37 ? '00' : String(n);
}

function chipBorderColor(category: string | undefined): string {
  switch (category) {
    case 'split':   return 'var(--accent-warm)';
    case 'corner':  return '#FFD700';
    case 'street':  return '#00BFFF';
    case 'sixline': return '#FF69B4';
    case 'five':    return '#9B59B6';
    default:        return 'white';
  }
}

interface MeasuredCell { rect: DOMRect; row: number; col: number; }

/** Screen-space snap point for a chip of the given bet type. */
function chipSnapScreen(betType: string, cells: Map<string, MeasuredCell>): { sx: number; sy: number } | null {
  const parsed = parseBet(betType);
  if (!parsed) return null;
  const { category, args } = parsed;
  switch (category) {
    case 'straight': {
      const d = cells.get(String(args[0])); if (!d) return null;
      return { sx: d.rect.left + d.rect.width / 2, sy: d.rect.top + d.rect.height / 2 };
    }
    case 'split': {
      const da = cells.get(String(args[0])), db = cells.get(String(args[1]));
      if (!da || !db) return null;
      if (da.row === db.row) return { sx: (da.rect.right + db.rect.left) / 2, sy: da.rect.top + da.rect.height / 2 };
      return { sx: da.rect.left + da.rect.width / 2, sy: (da.rect.bottom + db.rect.top) / 2 };
    }
    case 'corner': {
      const ds = args.map(n => cells.get(String(n))).filter(Boolean) as MeasuredCell[];
      if (ds.length !== 4) return null;
      return { sx: ds.reduce((s, d) => s + d.rect.left + d.rect.width / 2, 0) / 4, sy: ds.reduce((s, d) => s + d.rect.top + d.rect.height / 2, 0) / 4 };
    }
    case 'street': {
      // Chip at the top of the grid, inside the top-row cell
      const topNum = Math.floor((args[0] - 1) / 3) * 3 + 3;
      const d = cells.get(String(topNum)); if (!d) return null;
      return { sx: d.rect.left + d.rect.width / 2, sy: d.rect.top + d.rect.height * 0.25 };
    }
    case 'sixline': {
      // Chip at the top of the grid, between two columns, inside the cells
      const startCol = Math.floor((args[0] - 1) / 3);
      const d1 = cells.get(String(startCol * 3 + 3));
      const d2 = cells.get(String((startCol + 1) * 3 + 3));
      if (!d1 || !d2) return null;
      return { sx: (d1.rect.right + d2.rect.left) / 2, sy: d1.rect.top + d1.rect.height * 0.25 };
    }
    case 'five': {
      const d0 = cells.get('0'), d1 = cells.get('1');
      if (!d0 || !d1) return null;
      return { sx: (d0.rect.right + d1.rect.left) / 2, sy: d0.rect.top + d0.rect.height / 2 };
    }
    default: {
      const d = cells.get(betType); if (!d) return null;
      return { sx: d.rect.left + d.rect.width / 2, sy: d.rect.top + d.rect.height / 2 };
    }
  }
}

const cellStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#ffffff',
  fontWeight: 700,
  cursor: 'pointer',
  borderRadius: '3px',
  transition: 'filter 80ms',
  border: '1px solid rgba(255,255,255,0.15)',
  userSelect: 'none',
};

export default function BettingGrid({
  chips, players, phase, sessionId, selectedAmount, onPlaceBet, onRemoveBet, isMobile = false,
  dragState, onDrop, onDragCancel, onGridPointerDown, wasDragging, onChipPointerDown,
}: BettingGridProps) {
  const canBet = phase === 'BETTING' && sessionId != null;
  const gridRef = useRef<HTMLDivElement>(null);
  const [highlightedNumbers, setHighlightedNumbers] = useState<Set<number>>(new Set());
  const [dropPreview, setDropPreview] = useState<DropResult | null>(null);

  /* ---- Cell measurement ---- */
  const [cellMap, setCellMap] = useState<Map<string, MeasuredCell>>(new Map());
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const measure = () => {
      if (!gridRef.current) return;
      const cont = gridRef.current;
      setContainerRect(cont.getBoundingClientRect());
      const m = new Map<string, MeasuredCell>();
      cont.querySelectorAll('[data-number]').forEach(el => {
        const key = el.getAttribute('data-number')!;
        const row = Number(el.getAttribute('data-row') ?? '-1');
        const col = Number(el.getAttribute('data-col') ?? '-1');
        m.set(key, { rect: el.getBoundingClientRect(), row, col });
      });
      cont.querySelectorAll('[data-bet-type]').forEach(el => {
        m.set(el.getAttribute('data-bet-type')!, { rect: el.getBoundingClientRect(), row: -1, col: -1 });
      });
      setCellMap(m);
    };
    measure();
    const obs = new ResizeObserver(measure);
    if (gridRef.current) obs.observe(gridRef.current);
    window.addEventListener('resize', measure);
    return () => { obs.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  /* ---- Chip position (container-relative) ---- */
  const chipPos = useCallback((betType: string): { x: number; y: number } | null => {
    if (!containerRect) return null;
    const s = chipSnapScreen(betType, cellMap);
    if (!s) return null;
    return { x: s.sx - containerRect.left, y: s.sy - containerRect.top };
  }, [cellMap, containerRect]);

  /* ---- Drop-zone detection (screen coords, for drag) ---- */
  const computeCellRects = useCallback((): CellRect[] => {
    if (!gridRef.current) return [];
    return Array.from(gridRef.current.querySelectorAll('[data-number]')).map(el => {
      const r = el.getBoundingClientRect();
      return { number: Number(el.getAttribute('data-number')), row: Number(el.getAttribute('data-row')), col: Number(el.getAttribute('data-col')), x: r.left, y: r.top, width: r.width, height: r.height };
    });
  }, []);

  const computeZeroRects = useCallback(() => {
    if (!gridRef.current) return { zeroRect: undefined as any, doubleZeroRect: undefined as any };
    const z = gridRef.current.querySelector('[data-number="0"]');
    const dz = gridRef.current.querySelector('[data-number="37"]');
    return { zeroRect: z?.getBoundingClientRect(), doubleZeroRect: dz?.getBoundingClientRect() };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState?.isDragging) return;
    const cr = computeCellRects();
    const { zeroRect, doubleZeroRect } = computeZeroRects();
    const result = detectDropZone(e.clientX, e.clientY, cr, zeroRect, doubleZeroRect);
    if (result) { setHighlightedNumbers(new Set(result.coveredNumbers)); setDropPreview(result); }
    else { setHighlightedNumbers(new Set()); setDropPreview(null); }
  }, [dragState?.isDragging, computeCellRects, computeZeroRects]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragState?.isDragging) return;
    const cr = computeCellRects();
    const { zeroRect, doubleZeroRect } = computeZeroRects();
    const result = detectDropZone(e.clientX, e.clientY, cr, zeroRect, doubleZeroRect);
    setHighlightedNumbers(new Set()); setDropPreview(null);
    if (result && onDrop) onDrop(result.betType, dragState.amount);
    else if (onDragCancel) onDragCancel();
  }, [dragState, computeCellRects, computeZeroRects, onDrop, onDragCancel]);

  const handleNumberClick = (num: number) => {
    if (wasDragging?.()) return;
    if (dragState?.isDragging) return;
    if (!canBet || selectedAmount <= 0) return;
    onPlaceBet(`straight_${num}`, selectedAmount);
  };

  const handleOutsideBet = (betType: string) => {
    if (wasDragging?.()) return;
    if (dragState?.isDragging) return;
    if (!canBet || selectedAmount <= 0) return;
    onPlaceBet(betType, selectedAmount);
  };

  const handleChipPress = useCallback((e: React.PointerEvent, chip: ChipData, idx: number) => {
    e.stopPropagation();
    if (!canBet) return;
    onChipPointerDown?.(idx, chip.amount, chip.chipColor, e.clientX, e.clientY);
  }, [canBet, onChipPointerDown]);

  /* ---- Layout constants ---- */
  const topRow = Array.from({ length: 12 }, (_, i) => i * 3 + 3);
  const midRow = Array.from({ length: 12 }, (_, i) => i * 3 + 2);
  const botRow = Array.from({ length: 12 }, (_, i) => i * 3 + 1);

  const numSize: React.CSSProperties = isMobile
    ? { width: '56px', height: '44px', fontSize: '13px', minHeight: '44px' }
    : { width: '52px', height: '38px', fontSize: '11px' };

  const zeroW = isMobile ? '56px' : '52px';
  const gap = '3px';
  const isHighlighted = (num: number) => highlightedNumbers.has(num);
  const chipR = isMobile ? 13 : 11;
  const chipD = chipR * 2;

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={gridRef}
        data-grid
        onPointerDown={(e) => { if (canBet && selectedAmount > 0 && onGridPointerDown) onGridPointerDown(e.clientX, e.clientY); }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ display: 'flex', flexDirection: 'column', gap, userSelect: 'none', position: 'relative', zIndex: 0 }}
      >
        {/* Drop preview label */}
        {dragState?.isDragging && dropPreview && (
          <div style={{
            position: 'fixed', left: dropPreview.snapX, top: dropPreview.snapY - 30,
            transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.85)', color: '#fff',
            padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
            whiteSpace: 'nowrap', zIndex: 10000, pointerEvents: 'none',
          }}>
            {dropPreview.label} ({dropPreview.coveredNumbers.join(', ')})
          </div>
        )}

        {/* Main row: 0/00 | 3x12 grid | column bets */}
        <div style={{ display: 'flex', gap }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap }}>
            {[{ n: 0, label: '0' }, { n: 37, label: '00' }].map(({ n, label }) => (
              <div key={n} data-number={String(n)} onClick={() => handleNumberClick(n)}
                onMouseEnter={(e) => { if (!dragState?.isDragging) e.currentTarget.style.filter = 'brightness(1.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
                style={{ ...cellStyle, ...numSize, flex: 1, backgroundColor: numColor(n), width: zeroW,
                  ...(isHighlighted(n) ? { outline: '2px solid var(--accent-warm)', outlineOffset: '-1px', filter: 'brightness(1.4)' } : {}) }}
              >{label}</div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap, overflowX: isMobile ? 'auto' : undefined, WebkitOverflowScrolling: isMobile ? 'touch' : undefined }}>
            {[topRow, midRow, botRow].map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap }}>
                {row.map((num, ci) => (
                  <div key={num} data-number={String(num)} data-row={String(ri)} data-col={String(ci)}
                    onClick={() => handleNumberClick(num)}
                    onMouseEnter={(e) => { if (!dragState?.isDragging) e.currentTarget.style.filter = 'brightness(1.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
                    style={{ ...cellStyle, ...numSize, backgroundColor: numColor(num),
                      ...(isHighlighted(num) ? { outline: '2px solid var(--accent-warm)', outlineOffset: '-1px', filter: 'brightness(1.4)' } : {}) }}
                  >{displayNum(num)}</div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap }}>
            {['column_3', 'column_2', 'column_1'].map(bt => (
              <div key={bt} data-bet-type={bt} onClick={() => handleOutsideBet(bt)}
                onMouseEnter={(e) => { if (!dragState?.isDragging) e.currentTarget.style.filter = 'brightness(1.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
                style={{ ...cellStyle, ...numSize, backgroundColor: 'var(--surface-panel-raised)', color: 'var(--text-primary)' }}
              >2:1</div>
            ))}
          </div>
        </div>

        {/* Dozen bets */}
        <div style={{ display: 'flex', gap, marginLeft: `calc(${zeroW} + ${gap})` }}>
          {[{ l: '1st 12', bt: 'dozen_1' }, { l: '2nd 12', bt: 'dozen_2' }, { l: '3rd 12', bt: 'dozen_3' }].map(({ l, bt }) => (
            <div key={bt} data-bet-type={bt} onClick={() => handleOutsideBet(bt)}
              onMouseEnter={(e) => { if (!dragState?.isDragging) e.currentTarget.style.filter = 'brightness(1.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
              style={{ ...cellStyle, flex: 1, minWidth: '56px', backgroundColor: 'var(--surface-panel-raised)', color: 'var(--text-primary)',
                fontSize: isMobile ? '11px' : '10px', height: isMobile ? '36px' : '26px', fontWeight: 600 }}
            >{l}</div>
          ))}
        </div>

        {/* Even-money bets */}
        <div style={{ display: 'flex', gap, marginLeft: `calc(${zeroW} + ${gap})` }}>
          {[
            { l: '1-18', bt: 'low', bg: 'var(--surface-panel-raised)', fg: 'var(--text-primary)' },
            { l: 'EVEN', bt: 'even', bg: 'var(--surface-panel-raised)', fg: 'var(--text-primary)' },
            { l: 'RED', bt: 'red', bg: 'var(--roulette-red)', fg: '#fff' },
            { l: 'BLK', bt: 'black', bg: 'var(--roulette-black)', fg: '#fff' },
            { l: 'ODD', bt: 'odd', bg: 'var(--surface-panel-raised)', fg: 'var(--text-primary)' },
            { l: '19-36', bt: 'high', bg: 'var(--surface-panel-raised)', fg: 'var(--text-primary)' },
          ].map(({ l, bt, bg, fg }) => (
            <div key={bt} data-bet-type={bt} onClick={() => handleOutsideBet(bt)}
              onMouseEnter={(e) => { if (!dragState?.isDragging) e.currentTarget.style.filter = 'brightness(1.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
              style={{ ...cellStyle, flex: 1, minWidth: '56px', backgroundColor: bg, color: fg,
                fontSize: isMobile ? '11px' : '10px', height: isMobile ? '36px' : '26px', fontWeight: 600 }}
            >{l}</div>
          ))}
        </div>

        {/* ---- Chip overlay ---- */}
        {containerRect && (() => {
          // Aggregate chips by betType per player so each position shows the total bet
          const aggregated = new Map<string, { total: number; chipColor: number; playerId: string; firstIndex: number }>();
          chips.forEach((chip, i) => {
            const key = `${chip.playerId}:${chip.betType}`;
            const existing = aggregated.get(key);
            if (existing) {
              existing.total += chip.amount;
            } else {
              aggregated.set(key, { total: chip.amount, chipColor: chip.chipColor, playerId: chip.playerId, firstIndex: i });
            }
          });
          return (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
            {Array.from(aggregated.entries()).map(([key, { total, chipColor, playerId, firstIndex }]) => {
              const betType = key.split(':').slice(1).join(':');
              const pos = chipPos(betType);
              if (!pos) return null;
              const color = CHIP_COLORS.find(c => c.index === chipColor);
              const parsed = parseBet(betType);
              return (
                <div key={key}
                  onPointerDown={(e) => handleChipPress(e, chips[firstIndex], firstIndex)}
                  onClick={() => { if (!wasDragging?.()) onPlaceBet(betType, selectedAmount); }}
                  style={{
                    position: 'absolute', left: pos.x - chipR, top: pos.y - chipR,
                    width: chipD, height: chipD, borderRadius: '50%',
                    border: `2px solid ${chipBorderColor(parsed?.category)}`,
                    backgroundColor: color?.hex ?? '#888',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isMobile ? '9px' : '8px', fontWeight: 700, color: '#fff',
                    pointerEvents: canBet ? 'auto' : 'none',
                    cursor: canBet ? 'pointer' : 'default',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.35)', zIndex: 11,
                    transition: 'left 60ms ease-out, top 60ms ease-out',
                  }}
                  title={`${players.get(playerId)?.displayName}: $${total} (${betType})`}
                >{total}</div>
              );
            })}
          </div>
          );
        })()}
      </div>
    </div>
  );
}
