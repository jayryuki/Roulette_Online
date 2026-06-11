interface ChipTrayProps {
  selectedAmount: number;
  onSelectAmount: (amount: number) => void;
  onClearBets: () => void;
  onRepeatBet: () => void;
  canBet: boolean;
  hasLastBets: boolean;
  isMobile?: boolean;
  onStartDrag?: (amount: number, chipColorIndex: number, x: number, y: number) => void;
  wasDragging?: () => boolean;
}

const DENOMINATIONS = [1, 5, 25, 100, 500];

const CHIP_STYLES: Record<number, { bg: string; text: string; border: string }> = {
  1:   { bg: 'var(--chip-1-bg)', text: 'var(--chip-1-text)', border: 'var(--chip-1-border)' },
  5:   { bg: 'var(--chip-5-bg)', text: 'var(--chip-5-text)', border: 'var(--chip-5-border)' },
  25:  { bg: 'var(--chip-25-bg)', text: 'var(--chip-25-text)', border: 'var(--chip-25-border)' },
  100: { bg: 'var(--chip-100-bg)', text: 'var(--chip-100-text)', border: 'var(--chip-100-border)' },
  500: { bg: 'var(--chip-500-bg)', text: 'var(--chip-500-text)', border: 'var(--chip-500-border)' },
};

export default function ChipTray({ selectedAmount, onSelectAmount, onClearBets, onRepeatBet, canBet, hasLastBets, isMobile = false, onStartDrag, wasDragging }: ChipTrayProps) {
  const chipSize = isMobile ? 44 : 38;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '0.375rem' : '0.5rem',
      background: 'var(--surface-panel)',
      borderRadius: '12px',
      padding: isMobile ? '0.375rem 0.625rem' : '0.5rem 0.875rem',
      border: '1px solid var(--border-subtle)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      <div style={{ display: 'flex', gap: isMobile ? '0.25rem' : '0.375rem' }}>
        {DENOMINATIONS.map(denom => {
          const style = CHIP_STYLES[denom];
          const isSelected = selectedAmount === denom;
          return (
            <button
              key={denom}
              onPointerDown={(e) => {
                if (canBet && onStartDrag) {
                  const colorIndex = DENOMINATIONS.indexOf(denom);
                  onStartDrag(denom, colorIndex, e.clientX, e.clientY);
                }
              }}
              onClick={() => {
                if (wasDragging && wasDragging()) return;
                onSelectAmount(denom);
              }}
              disabled={!canBet}
              style={{
                width: `${chipSize}px`,
                height: `${chipSize}px`,
                borderRadius: '50%',
                border: `2px solid ${isSelected ? 'var(--accent-warm)' : style.border}`,
                backgroundColor: style.bg,
                color: style.text,
                textShadow: 'var(--game-text-outline-shadow)',
                fontWeight: 700,
                fontSize: isMobile ? '11px' : '10px',
                cursor: canBet ? 'pointer' : 'not-allowed',
                transition: 'transform 100ms ease, box-shadow 100ms ease',
                transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                boxShadow: isSelected
                  ? '0 0 0 3px rgba(184,92,58,0.25), 0 4px 10px rgba(0,0,0,0.2)'
                  : '0 2px 4px rgba(0,0,0,0.15), inset 0 -1px 2px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.15)',
                opacity: canBet ? 1 : 0.45,
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                padding: 0,
              }}
            >
              ${denom}
            </button>
          );
        })}
      </div>
      <button
        onClick={onRepeatBet}
        disabled={!canBet || !hasLastBets}
        style={{
          padding: isMobile ? '0.5rem 0.75rem' : '0.4375rem 0.875rem',
          background: 'var(--accent-warm)',
          color: 'var(--game-on-table-text)',
          textShadow: 'var(--game-text-outline-shadow)',
          border: 'none',
          borderRadius: '8px',
          fontSize: isMobile ? '0.8125rem' : '0.75rem',
          fontWeight: 600,
          cursor: canBet && hasLastBets ? 'pointer' : 'not-allowed',
          opacity: canBet && hasLastBets ? 1 : 0.4,
          fontFamily: "'Inter', sans-serif",
          minHeight: isMobile ? '40px' : '36px',
          transition: 'transform 80ms, box-shadow 120ms',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}
      >
        Repeat
      </button>
      <button
        onClick={onClearBets}
        disabled={!canBet}
        style={{
          padding: isMobile ? '0.5rem 0.75rem' : '0.4375rem 0.875rem',
          background: 'var(--danger)',
          color: 'var(--game-on-table-text)',
          textShadow: 'var(--game-text-outline-shadow)',
          border: 'none',
          borderRadius: '8px',
          fontSize: isMobile ? '0.8125rem' : '0.75rem',
          fontWeight: 600,
          cursor: canBet ? 'pointer' : 'not-allowed',
          opacity: canBet ? 1 : 0.4,
          fontFamily: "'Inter', sans-serif",
          minHeight: isMobile ? '40px' : '36px',
          transition: 'transform 80ms, box-shadow 120ms',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
        }}
      >
        Clear
      </button>
    </div>
  );
}
