interface ChipTrayProps {
  selectedAmount: number;
  onSelectAmount: (amount: number) => void;
  onClearBets: () => void;
  onRepeatBet: () => void;
  canBet: boolean;
  hasLastBets: boolean;
  isMobile?: boolean;
}

const DENOMINATIONS = [1, 5, 25, 100, 500];

const CHIP_STYLES: Record<number, { bg: string; text: string; border: string }> = {
  1:   { bg: '#ffffff', text: '#2B2926', border: '#D9D2C8' },
  5:   { bg: 'var(--roulette-red)', text: '#ffffff', border: '#c45a5a' },
  25:  { bg: 'var(--roulette-green)', text: '#ffffff', border: '#5a9e6e' },
  100: { bg: 'var(--roulette-black)', text: '#ffffff', border: '#4a4a52' },
  500: { bg: 'var(--accent-warm)', text: '#ffffff', border: '#B85C3A' },
};

export default function ChipTray({ selectedAmount, onSelectAmount, onClearBets, onRepeatBet, canBet, hasLastBets, isMobile = false }: ChipTrayProps) {
  const chipSize = isMobile ? 44 : 36;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '0.25rem' : '0.5rem',
      background: 'var(--surface-panel)',
      borderRadius: '10px',
      padding: isMobile ? '0.375rem 0.5rem' : '0.5rem 0.75rem',
      border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', gap: isMobile ? '0.25rem' : '0.375rem' }}>
        {DENOMINATIONS.map(denom => {
          const style = CHIP_STYLES[denom];
          const isSelected = selectedAmount === denom;
          return (
            <button
              key={denom}
              onClick={() => onSelectAmount(denom)}
              disabled={!canBet}
              style={{
                width: `${chipSize}px`,
                height: `${chipSize}px`,
                borderRadius: '50%',
                border: `2px solid ${style.border}`,
                backgroundColor: style.bg,
                color: style.text,
                fontWeight: 700,
                fontSize: isMobile ? '11px' : '10px',
                cursor: canBet ? 'pointer' : 'not-allowed',
                transition: 'transform 80ms, box-shadow 80ms',
                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                boxShadow: isSelected ? '0 0 0 2px var(--accent-warm), 0 2px 8px rgba(0,0,0,0.2)' : 'none',
                opacity: canBet ? 1 : 0.5,
                outline: 'none',
              }}
            >
              ${denom}
            </button>
          );
        })}
      </div>
      {hasLastBets && (
        <button
          onClick={onRepeatBet}
          disabled={!canBet}
          style={{
            padding: isMobile ? '0.5rem 0.75rem' : '0.375rem 0.75rem',
            background: 'var(--accent-warm)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: isMobile ? '0.8125rem' : '0.75rem',
            fontWeight: 600,
            cursor: canBet ? 'pointer' : 'not-allowed',
            opacity: canBet ? 1 : 0.5,
            fontFamily: "'Inter', sans-serif",
            minHeight: isMobile ? '44px' : undefined,
          }}
        >
          Repeat
        </button>
      )}
      <button
        onClick={onClearBets}
        disabled={!canBet}
        style={{
          padding: isMobile ? '0.5rem 0.75rem' : '0.375rem 0.75rem',
          background: 'var(--danger)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontSize: isMobile ? '0.8125rem' : '0.75rem',
          fontWeight: 600,
          cursor: canBet ? 'pointer' : 'not-allowed',
          opacity: canBet ? 1 : 0.5,
          fontFamily: "'Inter', sans-serif",
          minHeight: isMobile ? '44px' : undefined,
        }}
      >
        Clear
      </button>
    </div>
  );
}
