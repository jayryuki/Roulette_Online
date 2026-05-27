import { useState } from 'react';

interface Settings {
  minBet: number;
  maxBet: number;
  betTime: number;
  maxPlayers: number;
}

interface SettingsPanelProps {
  current: Settings;
  isHost: boolean;
  onUpdate: (settings: Partial<Settings>) => void;
  onClose: () => void;
  isMobile?: boolean;
}

export default function SettingsPanel({ current, isHost, onUpdate, onClose, isMobile = false }: SettingsPanelProps) {
  const [values, setValues] = useState<Settings>(current);

  const handleChange = (key: keyof Settings, val: number) => {
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const handleBlur = (key: keyof Settings) => {
    onUpdate({ [key]: values[key] });
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'flex-start' : 'center',
    justifyContent: 'space-between',
    gap: isMobile ? '0.375rem' : '0.75rem',
    padding: '0.5rem 0',
    borderBottom: '1px solid var(--border-subtle)',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--text-secondary)',
    flexShrink: 0,
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.375rem 0.625rem',
    borderRadius: '6px',
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-panel-raised)',
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    width: isMobile ? '100%' : '80px',
    textAlign: isMobile ? 'left' : 'right',
    outline: 'none',
    minHeight: '36px',
  };

  const readOnlyStyle: React.CSSProperties = {
    ...inputStyle,
    opacity: 0.7,
    cursor: 'default',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '1rem' : '2rem',
        animation: 'fadeInUp 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface-app)',
          borderRadius: '12px',
          padding: isMobile ? '1rem' : '1.25rem 1.5rem',
          width: '100%',
          maxWidth: '380px',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          animation: 'fadeInUp 0.25s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Newsreader', Georgia, serif" }}>
            Room Settings
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '1.25rem',
              cursor: 'pointer',
            }}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        {!isHost && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontStyle: 'italic' }}>
            Only the host can change settings.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={rowStyle}>
            <span style={labelStyle}>Min Bet</span>
            {isHost ? (
              <input
                type="number"
                min={1}
                max={values.maxBet}
                value={values.minBet}
                onChange={e => handleChange('minBet', Math.max(1, Math.min(values.maxBet, Number(e.target.value))))}
                onBlur={() => handleBlur('minBet')}
                style={inputStyle}
              />
            ) : (
              <span style={readOnlyStyle}>${values.minBet}</span>
            )}
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>Max Bet</span>
            {isHost ? (
              <input
                type="number"
                min={values.minBet}
                max={10000}
                value={values.maxBet}
                onChange={e => handleChange('maxBet', Math.max(values.minBet, Math.min(10000, Number(e.target.value))))}
                onBlur={() => handleBlur('maxBet')}
                style={inputStyle}
              />
            ) : (
              <span style={readOnlyStyle}>${values.maxBet}</span>
            )}
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>Timer (seconds)</span>
            {isHost ? (
              <input
                type="number"
                min={10}
                max={120}
                value={values.betTime}
                onChange={e => handleChange('betTime', Math.max(10, Math.min(120, Number(e.target.value))))}
                onBlur={() => handleBlur('betTime')}
                style={inputStyle}
              />
            ) : (
              <span style={readOnlyStyle}>{values.betTime}s</span>
            )}
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>Max Players</span>
            {isHost ? (
              <input
                type="number"
                min={2}
                max={8}
                value={values.maxPlayers}
                onChange={e => handleChange('maxPlayers', Math.max(2, Math.min(8, Number(e.target.value))))}
                onBlur={() => handleBlur('maxPlayers')}
                style={inputStyle}
              />
            ) : (
              <span style={readOnlyStyle}>{values.maxPlayers}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
