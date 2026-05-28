import { useMemo } from 'react';
import type { ChipData, PlayerData } from '../types';
import { CHIP_COLORS } from '@roulette/game-core';

interface BettingGridProps {
  chips: ChipData[];
  players: Map<string, PlayerData>;
  phase: string;
  sessionId: string | null;
  selectedAmount: number;
  onPlaceBet: (betType: string, amount: number) => void;
  onRemoveBet: (chipIndex: number) => void;
  isMobile?: boolean;
}

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function numColor(n: number): string {
  if (n === 0 || n === 37) return 'var(--roulette-green)';
  return RED_NUMBERS.has(n) ? 'var(--roulette-red)' : 'var(--roulette-black)';
}

function displayNum(n: number): string {
  return n === 37 ? '00' : String(n);
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
}: BettingGridProps) {
  const canBet = phase === 'BETTING' && sessionId != null;

  const chipMap = useMemo(() => {
    const map = new Map<string, ChipData[]>();
    for (const chip of chips) {
      const existing = map.get(chip.betType) || [];
      existing.push(chip);
      map.set(chip.betType, existing);
    }
    return map;
  }, [chips]);

  const handleNumberClick = (num: number) => {
    if (!canBet || selectedAmount <= 0) return;
    onPlaceBet(`straight_${num}`, selectedAmount);
  };

  const handleOutsideBet = (betType: string) => {
    if (!canBet || selectedAmount <= 0) return;
    onPlaceBet(betType, selectedAmount);
  };

  const renderChipsOnCell = (betType: string) => {
    const cellChips = chipMap.get(betType);
    if (!cellChips || cellChips.length === 0) return null;
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: '1px', padding: '1px' }}>
        {cellChips.map((chip, i) => {
          const color = CHIP_COLORS.find(c => c.index === chip.chipColor);
          return (
            <div
              key={i}
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                border: '2px solid white',
                fontSize: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                backgroundColor: color?.hex ?? '#888',
                boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
              title={`${players.get(chip.playerId)?.displayName}: $${chip.amount}`}
            >
              {chip.amount}
            </div>
          );
        })}
      </div>
    );
  };

  // Horizontal roulette layout: 3 rows x 12 columns
  // Top row:    3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
  // Middle row: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
  // Bottom row: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
  const topRow = Array.from({ length: 12 }, (_, i) => i * 3 + 3);
  const midRow = Array.from({ length: 12 }, (_, i) => i * 3 + 2);
  const botRow = Array.from({ length: 12 }, (_, i) => i * 3 + 1);

  const numCellSize: React.CSSProperties = isMobile
    ? { width: '44px', height: '36px', fontSize: '12px', minHeight: '36px' }
    : { width: '36px', height: '28px', fontSize: '10px' };

  const zeroCellWidth = isMobile ? '44px' : '36px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', userSelect: 'none' }}>
      {/* Main area: 0/00 | number grid | column bets */}
      <div style={{ display: 'flex', gap: '1px' }}>
        {/* 0 and 00 on the left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <div
            onClick={() => handleNumberClick(0)}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
            style={{ ...cellStyle, ...numCellSize, flex: 1, backgroundColor: numColor(0), width: zeroCellWidth }}
          >
            0
            {renderChipsOnCell('straight_0')}
          </div>
          <div
            onClick={() => handleNumberClick(37)}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
            style={{ ...cellStyle, ...numCellSize, flex: 1, backgroundColor: numColor(37), width: zeroCellWidth }}
          >
            00
            {renderChipsOnCell('straight_37')}
          </div>
        </div>

        {/* Number grid: 3 rows x 12 cols */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', overflowX: isMobile ? 'auto' : undefined, WebkitOverflowScrolling: isMobile ? 'touch' : undefined }}>
          {[topRow, midRow, botRow].map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: '1px' }}>
              {row.map(num => (
                <div
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
                  style={{ ...cellStyle, ...numCellSize, backgroundColor: numColor(num) }}
                >
                  {displayNum(num)}
                  {renderChipsOnCell(`straight_${num}`)}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Column bets on right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {['column_3', 'column_2', 'column_1'].map(betType => (
            <div
              key={betType}
              onClick={() => handleOutsideBet(betType)}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
              style={{ ...cellStyle, ...numCellSize, backgroundColor: 'var(--surface-panel-raised)', color: 'var(--text-primary)' }}
            >
              2:1
              {renderChipsOnCell(betType)}
            </div>
          ))}
        </div>
      </div>

      {/* Dozen bets - aligned with number grid (offset by 0/00 width) */}
      <div style={{ display: 'flex', gap: '1px', marginLeft: `calc(${zeroCellWidth} + 1px)` }}>
        {[
          { label: '1st 12', betType: 'dozen_1' },
          { label: '2nd 12', betType: 'dozen_2' },
          { label: '3rd 12', betType: 'dozen_3' },
        ].map(({ label, betType }) => (
          <div
            key={betType}
            onClick={() => handleOutsideBet(betType)}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
            style={{
              ...cellStyle,
              flex: 1,
              minWidth: '44px',
              backgroundColor: 'var(--surface-panel-raised)',
              color: 'var(--text-primary)',
              fontSize: isMobile ? '10px' : '9px',
              height: isMobile ? '36px' : '22px',
              fontWeight: 600,
            }}
          >
            {label}
            {renderChipsOnCell(betType)}
          </div>
        ))}
      </div>

      {/* Even money bets - aligned with number grid (offset by 0/00 width) */}
      <div style={{ display: 'flex', gap: '1px', marginLeft: `calc(${zeroCellWidth} + 1px)` }}>
        {[
          { label: '1-18', betType: 'low', bg: 'var(--surface-panel-raised)', fg: 'var(--text-primary)' },
          { label: 'EVEN', betType: 'even', bg: 'var(--surface-panel-raised)', fg: 'var(--text-primary)' },
          { label: 'RED', betType: 'red', bg: 'var(--roulette-red)', fg: '#fff' },
          { label: 'BLK', betType: 'black', bg: 'var(--roulette-black)', fg: '#fff' },
          { label: 'ODD', betType: 'odd', bg: 'var(--surface-panel-raised)', fg: 'var(--text-primary)' },
          { label: '19-36', betType: 'high', bg: 'var(--surface-panel-raised)', fg: 'var(--text-primary)' },
        ].map(({ label, betType, bg, fg }) => (
          <div
            key={betType}
            onClick={() => handleOutsideBet(betType)}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
            style={{
              ...cellStyle,
              flex: 1,
              minWidth: '44px',
              backgroundColor: bg,
              color: fg,
              fontSize: isMobile ? '10px' : '9px',
              height: isMobile ? '36px' : '22px',
              fontWeight: 600,
            }}
          >
            {label}
            {renderChipsOnCell(betType)}
          </div>
        ))}
      </div>
    </div>
  );
}
