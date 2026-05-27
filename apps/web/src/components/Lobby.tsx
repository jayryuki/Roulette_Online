import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, ThemeToggle } from '@games/ui';
import { useRouletteRoom } from '../hooks/useRouletteRoom';
import { useIsMobile } from '../hooks/useIsMobile';

interface RoomInfo {
  roomId: string;
  roomCode: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  openSlots: number;
  status: 'lobby' | 'in-progress' | 'finished';
}

const ADJECTIVES = ['Swift', 'Calm', 'Bright', 'Keen', 'Bold', 'Fair', 'Warm', 'Cool', 'Wise', 'Lucky'];
const NOUNS = ['Ace', 'Spin', 'Chip', 'Zero', 'Ball', 'Red', 'Black', 'Wheel', 'Bet', 'Gold'];

function randomName(): string {
  return ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)] + NOUNS[Math.floor(Math.random() * NOUNS.length)] + Math.floor(Math.random() * 99);
}

export default function Lobby() {
  const navigate = useNavigate();
  const { createRoom, joinRoom, error: roomError } = useRouletteRoom();
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [error, setError] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch('/api/rooms?game=roulette')
      .then(res => res.ok ? res.json() : [])
      .then(data => setRooms(data))
      .catch(() => {});
  }, []);

  const getName = () => playerName.trim() || randomName();

  const handleCreateRoom = async () => {
    const name = getName();
    setLoading(true);
    setError('');
    try {
      const data = await createRoom(name);
      if (data) {
        navigate(`/game/${data.roomCode}?name=${encodeURIComponent(name)}`);
      }
    } catch {
      setError('Failed to create room');
    }
    setLoading(false);
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) return;
    const name = getName();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/rooms/${joinCode.toUpperCase()}`);
      if (!res.ok) {
        setError('Room not found');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.game !== 'roulette') {
        setError('That room is not a roulette game');
        setLoading(false);
        return;
      }
      const room = await joinRoom(joinCode.toUpperCase(), name);
      if (room) navigate(`/game/${joinCode.toUpperCase()}?name=${encodeURIComponent(name)}`);
    } catch {
      setError('Failed to connect');
    }
    setLoading(false);
  };

  const handleJoinRoom = async (room: RoomInfo) => {
    const name = getName();
    const joined = await joinRoom(room.roomCode, name);
    if (joined) navigate(`/game/${room.roomCode}?name=${encodeURIComponent(name)}`);
  };

  const handlePlaySolo = () => {
    const name = getName();
    navigate(`/solo?name=${encodeURIComponent(name)}`);
  };

  const activeRooms = rooms.filter(r => r.status !== 'finished');

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

      {/* Your name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: '360px' }}>
        <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)', flexShrink: 0 }}>Name</label>
        <input
          value={playerName}
          onChange={(e) => { setPlayerName(e.target.value); setError(''); }}
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
        <Button size="lg" onClick={handleCreateRoom} disabled={loading} style={isMobile ? { minHeight: '44px' } : undefined}>Create Room</Button>
        <Button size="lg" variant="secondary" onClick={handlePlaySolo} disabled={loading} style={isMobile ? { minHeight: '44px' } : undefined}>Play Solo</Button>
        <ThemeToggle />
      </div>

      {/* Join by code */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '360px' }}>
        <input
          value={joinCode}
          onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
          placeholder="ROOM CODE"
          maxLength={6}
          style={{
            flex: 1,
            padding: isMobile ? '0.625rem 0.75rem' : '0.5rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-panel)',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            letterSpacing: '0.15em',
            textAlign: 'center',
            textTransform: 'uppercase',
            outline: 'none',
            minHeight: isMobile ? '44px' : undefined,
          }}
        />
        <Button size="sm" onClick={handleJoinByCode} disabled={!joinCode.trim() || loading} style={isMobile ? { minHeight: '44px' } : undefined}>Join</Button>
      </div>

      {(error || roomError) && <div style={{ color: 'var(--danger)', fontSize: '0.8125rem' }}>{error || roomError}</div>}

      {/* Active rooms list */}
      {activeRooms.length > 0 && (
        <div style={{ width: '100%', maxWidth: isMobile ? '100%' : '480px', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: isMobile ? '0 0.5rem' : undefined }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', fontWeight: 600 }}>
            Active Rooms
          </div>
          {activeRooms.map((room) => (
            <button
              key={room.roomId}
              onClick={() => handleJoinRoom(room)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: isMobile ? '0.75rem' : '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-panel)',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'border-color 120ms, background 120ms',
                minHeight: isMobile ? '44px' : undefined,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-warm)'; e.currentTarget.style.background = 'var(--surface-panel-raised)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.background = 'var(--surface-panel)'; }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {room.hostName || 'Unknown'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: "'Inter', sans-serif", letterSpacing: '0.1em' }}>
                  {room.roomCode}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                <span style={{
                  fontSize: '0.75rem',
                  color: room.openSlots > 0 ? 'var(--success)' : 'var(--text-muted)',
                  fontWeight: 500,
                }}>
                  {room.openSlots > 0 ? `${room.openSlots} open slot${room.openSlots > 1 ? 's' : ''}` : 'Full'}
                </span>
                <div style={{
                  fontSize: '0.625rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  background: room.status === 'lobby' ? 'rgba(34,197,94,0.12)' : 'rgba(184,92,58,0.12)',
                  color: room.status === 'lobby' ? 'var(--success)' : 'var(--accent-warm)',
                }}>
                  {room.status === 'lobby' ? 'Lobby' : 'In Progress'}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
