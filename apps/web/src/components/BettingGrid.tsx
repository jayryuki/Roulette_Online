// apps/web/src/components/BettingGrid.tsx

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
}

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function numberBg(n: number): string {
  if (n === 0 || n === 37) return 'bg-green-700';
  return RED_NUMBERS.has(n) ? 'bg-red-700' : 'bg-gray-900';
}

function displayNum(n: number): string {
  return n === 37 ? '00' : String(n);
}

export default function BettingGrid({
  chips, players, phase, sessionId, selectedAmount, onPlaceBet, onRemoveBet,
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
      <div className="absolute inset-0 flex flex-wrap items-center justify-center pointer-events-none gap-0.5 p-0.5">
        {cellChips.map((chip, i) => {
          const color = CHIP_COLORS.find(c => c.index === chip.chipColor);
          return (
            <div
              key={i}
              className="w-5 h-5 rounded-full border-2 border-white text-[8px] flex items-center justify-center font-bold shadow-sm"
              style={{ backgroundColor: color?.hex ?? '#888' }}
              title={`${players.get(chip.playerId)?.displayName}: $${chip.amount}`}
            >
              {chip.amount}
            </div>
          );
        })}
      </div>
    );
  };

  // Build number grid rows: 3 columns per row (1-3, 4-6, ..., 34-36)
  const numberRows: number[][] = [];
  for (let row = 0; row < 12; row++) {
    numberRows.push([row * 3 + 1, row * 3 + 2, row * 3 + 3]);
  }

  return (
    <div className="select-none">
      {/* 0 and 00 */}
      <div className="grid grid-cols-2 gap-0.5 mb-0.5">
        <div
          onClick={() => handleNumberClick(0)}
          className="relative bg-green-700 hover:bg-green-600 cursor-pointer rounded py-2 flex items-center justify-center text-white font-bold text-sm"
        >
          0
          {renderChipsOnCell('straight_0')}
        </div>
        <div
          onClick={() => handleNumberClick(37)}
          className="relative bg-green-700 hover:bg-green-600 cursor-pointer rounded py-2 flex items-center justify-center text-white font-bold text-sm"
        >
          00
          {renderChipsOnCell('straight_37')}
        </div>
      </div>

      {/* Number grid */}
      <div className="grid grid-cols-3 gap-0.5 mb-0.5">
        {numberRows.flat().map(num => (
          <div
            key={num}
            onClick={() => handleNumberClick(num)}
            className={`relative ${numberBg(num)} hover:brightness-125 cursor-pointer rounded aspect-square flex items-center justify-center text-white font-bold text-sm transition`}
          >
            {displayNum(num)}
            {renderChipsOnCell(`straight_${num}`)}
          </div>
        ))}
      </div>

      {/* Outside bets */}
      <div className="grid grid-cols-3 gap-0.5 mb-0.5">
        {[
          { label: '1st 12', betType: 'dozen_1' },
          { label: '2nd 12', betType: 'dozen_2' },
          { label: '3rd 12', betType: 'dozen_3' },
        ].map(({ label, betType }) => (
          <div
            key={betType}
            onClick={() => handleOutsideBet(betType)}
            className="relative bg-gray-700 hover:bg-gray-600 cursor-pointer rounded py-1.5 flex items-center justify-center text-white text-xs font-semibold"
          >
            {label}
            {renderChipsOnCell(betType)}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-0.5">
        {[
          { label: '1-18', betType: 'low' },
          { label: 'EVEN', betType: 'even' },
          { label: 'RED', betType: 'red' },
          { label: 'BLK', betType: 'black' },
          { label: 'ODD', betType: 'odd' },
          { label: '19-36', betType: 'high' },
        ].map(({ label, betType }) => (
          <div
            key={betType}
            onClick={() => handleOutsideBet(betType)}
            className={`relative ${
              betType === 'red' ? 'bg-red-700 hover:bg-red-600' :
              betType === 'black' ? 'bg-gray-900 hover:bg-gray-800' :
              'bg-gray-700 hover:bg-gray-600'
            } cursor-pointer rounded py-1.5 flex items-center justify-center text-white text-xs font-semibold`}
          >
            {label}
            {renderChipsOnCell(betType)}
          </div>
        ))}
      </div>
    </div>
  );
}
