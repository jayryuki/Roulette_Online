import { useMemo } from 'react';
import { displayLabel, numberColor } from '@roulette/game-core';

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

  const sortedResults = useMemo(() => {
    // Show last 20 in chronological order (oldest to newest)
    return lastResults.slice(-20);
  }, [lastResults]);

  if (frequencies.length === 0) return null;

  const maxFreq = frequencies[0]?.[1] ?? 1;
  const minFreq = frequencies[frequencies.length - 1]?.[1] ?? 1;
  const medianFreq = frequencies[Math.floor(frequencies.length / 2)]?.[1] ?? 1;

  const hotNumbers = new Set<number>();
  const coldNumbers = new Set<number>();
  for (const [num, count] of frequencies) {
    if (count >= maxFreq && count > 1) hotNumbers.add(num);
    if (count <= minFreq && frequencies.length > 3) coldNumbers.add(num);
  }

  return (
    <div style={{
      background: 'var(--surface-panel)',
      borderRadius: '10px',
      padding: '0.75rem',
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
        Last 20 Spins
      </div>

      {/* Sequence strip */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.25rem',
        marginBottom: '0.625rem',
        maxHeight: '72px',
        overflowY: 'auto',
      }}>
        {sortedResults.map((s, i) => {
          const n = parseInt(s, 10);
          const col = numberColor(n);
          const bg = col === 'red' ? 'var(--roulette-red)' : col === 'green' ? 'var(--roulette-green)' : 'var(--roulette-black)';
          return (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                fontSize: '0.625rem',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                background: bg,
                color: '#ffffff',
                flexShrink: 0,
              }}
              title={`Spin ${i + 1}: ${displayLabel(n)}`}
            >
              {displayLabel(n)}
            </span>
          );
        })}
      </div>

      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
        Hot / Cold
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
        {frequencies.map(([num, count]) => {
          const isHot = hotNumbers.has(num);
          const isCold = coldNumbers.has(num) && !isHot;
          return (
            <span
              key={num}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.125rem',
                padding: '0.125rem 0.375rem',
                borderRadius: '3px',
                fontSize: '0.6875rem',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 600,
                background: isHot ? 'rgba(196,90,90,0.15)' : isCold ? 'rgba(74,122,189,0.15)' : 'var(--surface-panel-raised)',
                color: isHot ? 'var(--danger)' : isCold ? '#4a7abd' : 'var(--text-secondary)',
              }}
              title={`${count} hit${count > 1 ? 's' : ''}`}
            >
              {displayLabel(num)}
              <span style={{ fontSize: '0.5625rem', opacity: 0.7 }}>{count}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
