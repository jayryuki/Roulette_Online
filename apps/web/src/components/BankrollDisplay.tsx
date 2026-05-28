interface BankrollDisplayProps {
  bankroll: number;
  availableBankroll: number;
  roundHistory: number[];
  isMobile?: boolean;
}

export default function BankrollDisplay({ bankroll, availableBankroll, roundHistory, isMobile = false }: BankrollDisplayProps) {
  const hasBets = availableBankroll !== bankroll;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.25rem',
      padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
    }}>
      {/* Main bankroll */}
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontWeight: 700,
        fontSize: isMobile ? '1.5rem' : '2rem',
        color: bankroll > 0 ? 'var(--success)' : 'var(--danger)',
        lineHeight: 1,
      }}>
        ${bankroll.toLocaleString()}
      </div>

      {/* Available when bets placed */}
      {hasBets && (
        <div style={{
          fontSize: '0.6875rem',
          color: 'var(--text-muted)',
          fontFamily: "'Inter', sans-serif",
        }}>
          ${availableBankroll.toLocaleString()} available
        </div>
      )}

      {/* Win/Loss history */}
      {roundHistory.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '0.25rem',
          overflowX: 'auto',
          maxWidth: '100%',
          padding: '0.125rem 0',
        }}>
          {roundHistory.map((profit, i) => (
            <span key={i} style={{
              fontSize: '0.6875rem',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              padding: '0.125rem 0.375rem',
              borderRadius: '4px',
              background: profit >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: profit >= 0 ? 'var(--success)' : 'var(--danger)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {profit >= 0 ? `+$${profit}` : `-$${Math.abs(profit)}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
