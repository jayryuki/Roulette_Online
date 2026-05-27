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

  // Traditional roulette layout: 3 columns, 12 rows
  // Numbers arranged as: 3,6,9,...,36 | 2,5,8,...,35 | 1,4,7,...,34
  const col3 = Array.from({ length: 12 }, (_, i) => i * 3 + 3); // rightmost
  const col2 = Array.from({ length: 12 }, (_, i) => i * 3 + 2); // middle
  const col1 = Array.from({ length: 12 }, (_, i) => i * 3 + 1); // leftmost

  const numCellSize: React.CSSProperties = isMobile
    ? { width: '100%', height: '44px', fontSize: '12px', minHeight: '44px' }
    : { width: '32px', height: '22px', fontSize: '10px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', userSelect: 'none' }}>
      {/* 0 and 00 */}
      <div style={{ display: 'flex', gap: '2px' }}>
        <div
          onClick={() => handleNumberClick(0)}
          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
          style={{ ...cellStyle, ...numCellSize, flex: 1, backgroundColor: numColor(0), height: isMobile ? '44px' : '24px' }}
        >
          0
          {renderChipsOnCell('straight_0')}
        </div>
        <div
          onClick={() => handleNumberClick(37)}
          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
          style={{ ...cellStyle, ...numCellSize, flex: 1, backgroundColor: numColor(37), height: isMobile ? '44px' : '24px' }}
        >
          00
          {renderChipsOnCell('straight_37')}
        </div>
      </div>

      {/* Number grid: 12 rows x 3 columns (traditional layout) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
        {Array.from({ length: 12 }, (_, row) => (
          <div key={row} style={{ display: 'flex', gap: '1px' }}>
            {[col1[row], col2[row], col3[row]].map(num => (
              <div
                key={num}
                onClick={() => handleNumberClick(num)}
                onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
                style={{ ...cellStyle, ...numCellSize, backgroundColor: numColor(num), flex: 1 }}
              >
                {displayNum(num)}
                {renderChipsOnCell(`straight_${num}`)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Dozen bets */}
      <div style={{
        display: 'flex',
        gap: '2px',
        overflowX: isMobile ? 'auto' : undefined,
        WebkitOverflowScrolling: isMobile ? 'touch' : undefined,
      }}>
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
              flex: isMobile ? '0 0 auto' : 1,
              minWidth: '44px',
              backgroundColor: 'var(--surface-panel-raised)',
              color: 'var(--text-primary)',
              fontSize: isMobile ? '10px' : '9px',
              height: isMobile ? '44px' : '22px',
              fontWeight: 600,
            }}
          >
            {label}
            {renderChipsOnCell(betType)}
          </div>
        ))}
      </div>

      {/* Even money bets */}
      <div style={{
        display: 'flex',
        gap: '2px',
        overflowX: isMobile ? 'auto' : undefined,
        WebkitOverflowScrolling: isMobile ? 'touch' : undefined,
      }}>
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
              flex: isMobile ? '0 0 auto' : 1,
              minWidth: '44px',
              backgroundColor: bg,
              color: fg,
              fontSize: isMobile ? '10px' : '9px',
              height: isMobile ? '44px' : '22px',
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
