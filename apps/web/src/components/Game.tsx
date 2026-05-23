import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useRouletteRoom } from '../hooks/useRouletteRoom';
import { Button } from './common/Button';
import { ThemeToggle } from './common/ThemeToggle';
import Wheel2D from './Wheel2D';
import BettingGrid from './BettingGrid';
import ChipTray from './ChipTray';
import PlayerSidebar from './PlayerSidebar';
import { displayLabel } from '@roulette/game-core';

export default function Game() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const displayName = searchParams.get('name') || 'Player';

  const { gameState, connected, error, joinRoom, send, leave, sessionId } = useRouletteRoom();
  const [selectedAmount, setSelectedAmount] = useState(25);
  const hasJoinedRef = useRef(false);

  const roundResult = useMemo(() => {
    if (!gameState?.roundResult) return null;
    try { return JSON.parse(gameState.roundResult); } catch { return null; }
  }, [gameState?.roundResult]);

  useEffect(() => {
    if (roomCode && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinRoom(roomCode, displayName).then(room => {
        if (!room) navigate('/');
      });
    }
  }, [roomCode, joinRoom, displayName, navigate]);

  useEffect(() => {
    const handleBeforeUnload = () => { leave(); };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, [leave]);

  const handleLeave = useCallback(() => {
    leave();
    navigate('/');
  }, [leave, navigate]);

  if (!gameState || !connected) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-table)' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>Connecting to room {roomCode}...</div>
      </div>
    );
  }

  const players = gameState.players;
  const myPlayer = sessionId ? players.get(sessionId) : null;
  const phase = gameState.phase;
  const canBet = phase === 'BETTING' && myPlayer != null;

  const takenColors = new Set<number>();
  for (const [, p] of players) {
    if (p.chipColor < 8) takenColors.add(p.chipColor);
  }

  const spinning = phase === 'SPINNING';
  const targetNumber = gameState.winningNumber >= 0 ? gameState.winningNumber : null;
  const showWinning = phase === 'SETTLEMENT' && targetNumber !== null;
  const winningDisplay = targetNumber !== null ? displayLabel(targetNumber) : '';

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-table)',
      overflow: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 1rem',
        background: 'rgba(0,0,0,0.2)',
        flexShrink: 0,
      }}>
        <Button variant="ghost" onClick={handleLeave} style={{ color: 'rgba(255,255,255,0.7)' }}>
          &larr; Leave
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Timer — always visible during betting */}
          {phase === 'BETTING' && (
            <span style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.95)',
              background: 'rgba(0,0,0,0.3)',
              padding: '0.25rem 0.625rem',
              borderRadius: '6px',
              minWidth: '2.5rem',
              textAlign: 'center',
            }}>
              {gameState.timerSeconds}
            </span>
          )}
          <div style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            letterSpacing: '0.15em',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.875rem',
          }}>
            {gameState.roomCode}
          </div>
          {/* Phase badge */}
          <span style={{
            fontSize: '0.625rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            background: phase === 'BETTING' ? 'rgba(90,158,110,0.25)' :
                        phase === 'SPINNING' ? 'rgba(196,165,116,0.25)' :
                        phase === 'SETTLEMENT' ? 'rgba(90,158,110,0.25)' :
                        'rgba(255,255,255,0.08)',
            color: phase === 'BETTING' ? '#5ae07a' :
                   phase === 'SPINNING' ? 'var(--accent-warm)' :
                   phase === 'SETTLEMENT' ? 'var(--success)' :
                   'rgba(255,255,255,0.4)',
          }}>
            {phase === 'BETTING' ? 'Place Bets' : phase === 'SPINNING' ? 'Spinning' : phase === 'SETTLEMENT' ? 'Result' : phase}
          </span>
          <ThemeToggle />
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: '0.75rem',
        padding: '0.5rem',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {/* Left: Wheel + Grid + Chips */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
          minHeight: 0,
        }}>
          {/* Wheel */}
          <Wheel2D targetNumber={targetNumber} spinning={spinning} />

          {/* Winning number banner */}
          {showWinning && (
            <div style={{
              textAlign: 'center',
              padding: '0.375rem 1.5rem',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '8px',
              animation: 'fadeInUp 0.3s ease-out',
            }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
                {winningDisplay}
              </span>
            </div>
          )}

          {/* Betting grid */}
          <BettingGrid
            chips={gameState.chips || []}
            players={players}
            phase={phase}
            sessionId={sessionId}
            selectedAmount={selectedAmount}
            onPlaceBet={(betType, amount) => send('place-bet', { betType, amount })}
            onRemoveBet={(chipIndex) => send('remove-bet', { chipIndex })}
          />

          {/* Chip tray */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ChipTray
              selectedAmount={selectedAmount}
              onSelectAmount={setSelectedAmount}
              onClearBets={() => send('clear-bets')}
              canBet={canBet}
            />
          </div>

          {/* Round result summary */}
          {roundResult && phase === 'SETTLEMENT' && (
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              fontSize: '0.75rem',
              maxHeight: '80px',
              overflowY: 'auto',
              width: '100%',
              maxWidth: '400px',
              animation: 'fadeInUp 0.3s ease-out',
            }}>
              {roundResult.results?.map((r: any, i: number) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: r.won ? 'var(--success)' : 'var(--danger)',
                  fontSize: '0.6875rem',
                }}>
                  <span>{r.name} — {r.betType}</span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600 }}>
                    {r.won ? `+$${r.payout - r.amount}` : `-$${r.amount}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{
          width: '240px',
          flexShrink: 0,
          overflowY: 'auto',
        }}>
          <PlayerSidebar
            players={players}
            sessionId={sessionId}
            hostPlayerId={gameState.hostPlayerId}
            phase={phase}
            lastResults={gameState.lastResults || []}
            chatMessages={gameState.chatMessages || []}
            onSendChat={(text) => send('chat', { text })}
            onSwapColor={(index) => send('swap-color', { targetIndex: index })}
            takenColors={takenColors}
          />
        </div>
      </div>
    </div>
  );
}
