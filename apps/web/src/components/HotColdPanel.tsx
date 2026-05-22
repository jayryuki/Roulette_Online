// apps/web/src/components/HotColdPanel.tsx

import { useMemo } from 'react';
import { displayLabel } from '@roulette/game-core';

interface HotColdPanelProps {
  lastResults: string[];
}

export default function HotColdPanel({ lastResults }: HotColdPanelProps) {
  const frequencies = useMemo(() => {
    const freq = new Map<number, number>();
    for (const s of lastResults) {
      const n = parseInt(s, 10);
      freq.set(n, (freq.get(n) || 0) + 1);
    }

    const entries = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1] || a[0] - b[0]);

    if (entries.length === 0) return [];
    return entries;
  }, [lastResults]);

  if (frequencies.length === 0) return null;

  const maxFreq = frequencies[0]?.[1] ?? 1;
  const hotThreshold = maxFreq;
  const coldThreshold = 1;

  return (
    <div className="bg-gray-800 rounded-xl p-3">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Hot / Cold</h3>
      <div className="flex flex-wrap gap-1">
        {frequencies.map(([num, count]) => {
          const isHot = count >= hotThreshold && count > 1;
          const isCold = count <= coldThreshold && frequencies.length > 5;
          return (
            <span
              key={num}
              className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${
                isHot ? 'bg-red-700 text-red-200' :
                isCold ? 'bg-blue-900 text-blue-200' :
                'bg-gray-700 text-gray-300'
              }`}
              title={`${count} hits`}
            >
              {displayLabel(num)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
