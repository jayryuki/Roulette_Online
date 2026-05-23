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

  return (
    <div style={{
      background: 'var(--surface-panel)',
      borderRadius: '10px',
      padding: '0.75rem',
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
        Hot / Cold
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
        {frequencies.map(([num, count]) => {
          const isHot = count >= maxFreq && count > 1;
          const isCold = count <= 1 && frequencies.length > 5;
          return (
            <span
              key={num}
              style={{
                display: 'inline-block',
                padding: '0.125rem 0.375rem',
                borderRadius: '3px',
                fontSize: '0.6875rem',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                background: isHot ? 'rgba(196,90,90,0.15)' : isCold ? 'rgba(74,122,189,0.15)' : 'var(--surface-panel-raised)',
                color: isHot ? 'var(--danger)' : isCold ? '#4a7abd' : 'var(--text-secondary)',
              }}
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
