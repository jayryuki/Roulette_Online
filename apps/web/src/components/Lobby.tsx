import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ThemeToggle } from '@games/ui';
import { useRouletteRoom } from '../hooks/useRouletteRoom';
import { useIsMobile } from '../hooks/useIsMobile';

const ADJECTIVES = ['Swift', 'Calm', 'Bright', 'Keen', 'Bold', 'Fair', 'Warm', 'Cool', 'Wise', 'Lucky'];
const NOUNS = ['Ace', 'Spin', 'Chip', 'Zero', 'Ball', 'Red', 'Black', 'Wheel', 'Bet', 'Gold'];

function randomName(): string {
  return ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] + NOUNS[Math.floor(Math.random() * NOUNS.length)] + Math.floor(Math.random() * 99);
}

const LS_NAME_KEY = 'roulette_displayName';

export default function Lobby() {
  const navigate = useNavigate();
  const { autoJoin, error: roomError } = useRouletteRoom();
  const [playerName, setPlayerName] = useState(() => {
    try { return localStorage.getItem(LS_NAME_KEY) || ''; } catch { return ''; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

  const getName = () => {
    const name = playerName.trim() || randomName();
    try { localStorage.setItem(LS_NAME_KEY, name); } catch {}
    return name;
  };

  const handlePlay = async () => {
    const name = getName();
    setLoading(true);
    setError('');
    try {
      const room = await autoJoin(name);
      if (room) navigate('/game');
    } catch {
      setError('Failed to connect');
    }
    setLoading(false);
  };

  const handlePlaySolo = () => {
    const name = getName();
    navigate(`/solo?name=${encodeURIComponent(name)}`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: isMobile ? '1rem' : '1.5rem',
      padding: isMobile ? '1rem' : '2rem',
      maxWidth: '100vw',
      overflowX: 'hidden',
    }}>
      <h1 style={{
        fontFamily: "'Newsreader', Georgia, serif",
        fontSize: isMobile ? '2.25rem' : '3rem',
        fontWeight: 500,
        letterSpacing: '-0.03em',
        color: 'var(--text-primary)',
        margin: 0,
      }}>
        Roulette
      </h1>
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: isMobile ? '1rem' : '1.125rem',
        fontStyle: 'italic',
        fontFamily: "'Newsreader', Georgia, serif",
        margin: 0,
        textAlign: 'center',
      }}>
        Place your bets. Watch the wheel.
      </p>

      {/* Name input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: '360px' }}>
        <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', flexShrink: 0 }}>Name</label>
        <input
          value={playerName}
          onChange={(e) => { setPlayerName(e.target.value); setError(''); }}
          onKeyDown={(e) => { if (e.key === 'Enter') handlePlay(); }}
          placeholder="Leave blank for a random name"
          style={{
            flex: 1,
            padding: isMobile ? '0.625rem 0.75rem' : '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-panel)',
            color: 'var(--text-primary)',
            fontSize: '0.875rem',
            outline: 'none',
            minHeight: isMobile ? '44px' : undefined,
          }}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button size="lg" onClick={handlePlay} disabled={loading} style={isMobile ? { minHeight: '44px' } : undefined}>Play</Button>
        <Button size="lg" variant="secondary" onClick={handlePlaySolo} disabled={loading} style={isMobile ? { minHeight: '44px' } : undefined}>Play Solo</Button>
        <ThemeToggle style={isMobile ? { minHeight: '44px', minWidth: '44px' } : undefined} />
      </div>

      {(error || roomError) && <div style={{ color: 'var(--danger)', fontSize: '0.8125rem' }}>{error || roomError}</div>}
    </div>
  );
}
