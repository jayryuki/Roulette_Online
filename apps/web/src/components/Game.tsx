import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useRouletteRoom } from '../hooks/useRouletteRoom';
import { useRouletteSolo } from '../hooks/useRouletteSolo';
import { useIsMobile } from '../hooks/useIsMobile';
import { Button, ThemeToggle } from '@games/ui';
import Wheel2D from './Wheel2D';
import BettingGrid from './BettingGrid';
import ChipTray from './ChipTray';
import PlayerSidebar from './PlayerSidebar';
import HotColdPanel from './HotColdPanel';
import { displayLabel, numberColor } from '@roulette/game-core';
import type { RouletteGameState } from '../types';

interface GameProps {
  isSolo?: boolean;
}

export default function Game({ isSolo = false }: GameProps) {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const displayName = searchParams.get('name') || 'Player';

  // Both hooks are always called (React rules of hooks), but only one is used based on mode
  const multiHook = useRouletteRoom();
  const soloHook = useRouletteSolo();

  const hook = isSolo ? soloHook : multiHook;
  const { gameState, connected, error, joinRoom, send, leave, sessionId } = hook;

  const [selectedAmount, setSelectedAmount] = useState(25);
  const hasJoinedRef = useRef(false);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const roundResult = useMemo(() => {
    if (!gameState?.roundResult) return null;
    try { return JSON.parse(gameState.roundResult); } catch { return null; }
  }, [gameState?.roundResult]);

  // Multiplayer: join room on mount
  useEffect(() => {
    if (!isSolo && roomCode && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinRoom(roomCode, displayName).then(room => {
        if (!room) navigate('/');
      });
    }
  }, [isSolo, roomCode, joinRoom, displayName, navigate]);

  // Solo: initialize on mount
  useEffect(() => {
    if (isSolo && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinRoom('SOLO', displayName);
    }
  }, [isSolo, joinRoom, displayName]);

  useEffect(() => {
    const handleBeforeUnload = () => { leave(); };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, [leave]);

  const handleLeave = useCallback(() => {
    leave();
    navigate('/');
  }, [leave, navigate]);

  // Loading/connecting state
  if (!gameState || !connected) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-table)' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
          {isSolo ? 'Starting solo game...' : `Connecting to room ${roomCode}...`}
        </div>
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
  const isGameOver = isSolo && gameState.status === 'finished';

  // Solo mode bankroll display
  const soloBankroll = isSolo ? myPlayer?.bankroll ?? 0 : 0;
  const soloAvailableBankroll = isSolo ? soloBankroll - (myPlayer?.totalBetThisRound ?? 0) : 0;

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-table)',
      overflow: 'hidden',
      maxWidth: '100vw',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '0.375rem 0.5rem' : '0.5rem 1rem',
        background: 'rgba(0,0,0,0.2)',
        flexShrink: 0,
        minHeight: isMobile ? '44px' : undefined,
      }}>
        <Button variant="ghost" onClick={handleLeave} style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.8125rem' : undefined, minHeight: isMobile ? '44px' : undefined, padding: isMobile ? '0.25rem 0.5rem' : undefined }}>
          &larr; Leave
        </Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.375rem' : '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Solo: Spin button during betting phase */}
          {isSolo && phase === 'BETTING' && !isGameOver && (
            <button
              onClick={() => send('spin-now')}
              disabled={!canBet || (gameState.chips?.length ?? 0) === 0}
              style={{
                padding: isMobile ? '0.5rem 1rem' : '0.375rem 1.25rem',
                background: 'var(--accent-warm)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: canBet && (gameState.chips?.length ?? 0) > 0 ? 'pointer' : 'not-allowed',
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.05em',
                opacity: canBet && (gameState.chips?.length ?? 0) > 0 ? 1 : 0.5,
                transition: 'opacity 120ms',
                minHeight: isMobile ? '44px' : undefined,
              }}
            >
              SPIN
            </button>
          )}

          {/* Multiplayer: Timer during betting phase */}
          {!isSolo && phase === 'BETTING' && (
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

          {/* Solo: Bankroll display */}
          {isSolo && (
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: isMobile ? '0.875rem' : '1rem',
              color: '#ffffff',
              background: 'rgba(0,0,0,0.3)',
              padding: isMobile ? '0.25rem 0.5rem' : '0.25rem 0.75rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}>
              <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>$</span>
              <span>{soloBankroll.toLocaleString()}</span>
              {myPlayer && myPlayer.totalBetThisRound > 0 && (
                <span style={{ fontSize: '0.6875rem', opacity: 0.5 }}>
                  (−${myPlayer.totalBetThisRound})
                </span>
              )}
            </div>
          )}

          {/* Room code */}
          {!isSolo && (
            <div style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.15em',
              color: 'rgba(255,255,255,0.9)',
              fontSize: '0.875rem',
            }}>
              {gameState.roomCode}
            </div>
          )}

          {/* Phase badge */}
          {!isMobile && (
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
          )}

          {/* Mobile: sidebar toggle button */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              style={{
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '1.25rem',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>
          )}

          <ThemeToggle />
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '0' : '0.75rem',
        padding: isMobile ? '0' : '0.5rem',
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Left: Wheel + Grid area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: isMobile ? '0.25rem' : '0.5rem',
          minHeight: 0,
          overflow: isMobile ? 'hidden' : undefined,
        }}>
          {/* Wheel */}
          <Wheel2D targetNumber={targetNumber} spinning={spinning} size={isMobile ? Math.min(200, window.innerWidth - 32) : 280} />

          {/* Winning number banner */}
          {showWinning && (
            <div style={{
              textAlign: 'center',
              padding: isMobile ? '0.25rem 1rem' : '0.375rem 1.5rem',
              background: 'rgba(0,0,0,0.4)',
              borderRadius: '8px',
              animation: 'fadeInUp 0.3s ease-out',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <span style={{
                display: 'inline-block',
                width: isMobile ? '20px' : '24px',
                height: isMobile ? '20px' : '24px',
                borderRadius: '50%',
                background: targetNumber !== null
                  ? numberColor(targetNumber) === 'red' ? 'var(--roulette-red)'
                    : numberColor(targetNumber) === 'green' ? 'var(--roulette-green)'
                    : 'var(--roulette-black)'
                  : 'transparent',
                border: '2px solid rgba(255,255,255,0.5)',
              }} />
              <span style={{ fontSize: isMobile ? '1rem' : '1.25rem', fontWeight: 700, color: '#ffffff' }}>
                {winningDisplay}
              </span>
            </div>
          )}

          {/* Betting grid - scrollable on mobile */}
          <div style={{
            flex: 1,
            minHeight: 0,
            overflowY: isMobile ? 'auto' : undefined,
            overflowX: isMobile ? 'auto' : undefined,
            WebkitOverflowScrolling: 'touch',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            paddingBottom: isMobile ? '0.25rem' : undefined,
          }}>
            <BettingGrid
              chips={gameState.chips || []}
              players={players}
              phase={phase}
              sessionId={sessionId}
              selectedAmount={selectedAmount}
              onPlaceBet={(betType, amount) => send('place-bet', { betType, amount })}
              onRemoveBet={(chipIndex) => send('remove-bet', { chipIndex })}
              isMobile={isMobile}
            />
          </div>

          {/* Chip tray */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            flexShrink: 0,
            padding: isMobile ? '0.25rem 0.5rem' : undefined,
            background: isMobile ? 'var(--surface-table)' : undefined,
            borderTop: isMobile ? '1px solid rgba(255,255,255,0.1)' : undefined,
          }}>
            <ChipTray
              selectedAmount={selectedAmount}
              onSelectAmount={setSelectedAmount}
              onClearBets={() => send('clear-bets')}
              canBet={canBet}
              isMobile={isMobile}
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

        {/* Desktop sidebar */}
        {!isMobile && (
          isSolo ? (
            <div style={{
              width: '200px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}>
              {/* Solo bankroll card */}
              <div style={{
                background: 'var(--surface-panel)',
                borderRadius: '10px',
                padding: '0.75rem',
                border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
                  Bankroll
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  fontFamily: "'Inter', sans-serif",
                  color: soloBankroll > 0 ? 'var(--success)' : 'var(--danger)',
                }}>
                  ${soloBankroll.toLocaleString()}
                </div>
                {myPlayer && myPlayer.totalBetThisRound > 0 && (
                  <div style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.25rem',
                  }}>
                    ${soloAvailableBankroll.toLocaleString()} available
                  </div>
                )}
              </div>

              {/* Hot/Cold panel */}
              <HotColdPanel lastResults={gameState.lastResults || []} />

              {/* Game Over overlay */}
              {isGameOver && (
                <div style={{
                  background: 'var(--surface-panel)',
                  borderRadius: '10px',
                  padding: '1rem',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center',
                  animation: 'fadeInUp 0.4s ease-out',
                }}>
                  <div style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: 'var(--danger)',
                    fontFamily: "'Newsreader', Georgia, serif",
                    marginBottom: '0.5rem',
                  }}>
                    Game Over
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.75rem',
                  }}>
                    Your bankroll has hit $0.
                  </div>
                  <Button onClick={() => send('restart-solo')} size="sm">
                    Play Again
                  </Button>
                </div>
              )}
            </div>
          ) : (
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
          )
        )}
      </div>

      {/* Mobile sidebar drawer overlay */}
      {isMobile && sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 40,
            }}
          />
          {/* Drawer */}
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 'min(300px, 85vw)',
            background: 'var(--surface-app)',
            borderLeft: '1px solid var(--border-subtle)',
            zIndex: 41,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            animation: 'slideInRight 0.25s ease-out',
            boxShadow: '-4px 0 16px rgba(0,0,0,0.3)',
          }}>
            {/* Drawer header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--border-subtle)',
              minHeight: '44px',
            }}>
              <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                {isSolo ? 'Game Info' : 'Players & Chat'}
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                style={{
                  width: '44px',
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                }}
                aria-label="Close sidebar"
              >
                ×
              </button>
            </div>

            {/* Drawer content */}
            <div style={{ flex: 1, padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {isSolo ? (
                <>
                  {/* Solo bankroll card */}
                  <div style={{
                    background: 'var(--surface-panel)',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    border: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
                      Bankroll
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      fontFamily: "'Inter', sans-serif",
                      color: soloBankroll > 0 ? 'var(--success)' : 'var(--danger)',
                    }}>
                      ${soloBankroll.toLocaleString()}
                    </div>
                    {myPlayer && myPlayer.totalBetThisRound > 0 && (
                      <div style={{
                        fontSize: '0.6875rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.25rem',
                      }}>
                        ${soloAvailableBankroll.toLocaleString()} available
                      </div>
                    )}
                  </div>

                  {/* Hot/Cold panel */}
                  <HotColdPanel lastResults={gameState.lastResults || []} />

                  {/* Game Over in drawer */}
                  {isGameOver && (
                    <div style={{
                      background: 'var(--surface-panel)',
                      borderRadius: '10px',
                      padding: '1rem',
                      border: '1px solid var(--border-subtle)',
                      textAlign: 'center',
                      animation: 'fadeInUp 0.4s ease-out',
                    }}>
                      <div style={{
                        fontSize: '1.125rem',
                        fontWeight: 700,
                        color: 'var(--danger)',
                        fontFamily: "'Newsreader', Georgia, serif",
                        marginBottom: '0.5rem',
                      }}>
                        Game Over
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '0.75rem',
                      }}>
                        Your bankroll has hit $0.
                      </div>
                      <Button onClick={() => send('restart-solo')} size="sm">
                        Play Again
                      </Button>
                    </div>
                  )}
                </>
              ) : (
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
              )}
            </div>
          </div>
        </>
      )}

      {/* Game over full overlay for solo mode */}
      {isGameOver && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          animation: 'fadeInUp 0.4s ease-out',
        }}>
          <div style={{
            background: 'var(--surface-panel)',
            borderRadius: '16px',
            padding: isMobile ? '1.5rem' : '2rem 2.5rem',
            border: '1px solid var(--border-subtle)',
            textAlign: 'center',
            maxWidth: isMobile ? 'calc(100vw - 2rem)' : '320px',
          }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--danger)',
              fontFamily: "'Newsreader', Georgia, serif",
              marginBottom: '0.5rem',
            }}>
              Game Over
            </div>
            <div style={{
              fontSize: '0.9375rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.5rem',
            }}>
              Your bankroll has hit $0.
              <br />
              Better luck next time!
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Button onClick={() => send('restart-solo')}>
                Play Again ($1,000)
              </Button>
              <Button variant="ghost" onClick={handleLeave}>
                Back to Lobby
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
