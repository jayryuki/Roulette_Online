import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useRouletteRoom } from '../hooks/useRouletteRoom';
import { useRouletteSolo } from '../hooks/useRouletteSolo';
import { useIsMobile } from '../hooks/useIsMobile';
import { useDragChip } from '../hooks/useDragChip';
import { detectDropZone } from '../lib/dropZones';
import { Button, ThemeToggle } from '@games/ui';
import Wheel2D from './Wheel2D';
import BettingGrid from './BettingGrid';
import ChipTray from './ChipTray';
import BankrollDisplay from './BankrollDisplay';
import PlayerSidebar from './PlayerSidebar';
import HotColdPanel from './HotColdPanel';
import SettingsPanel from './SettingsPanel';
import { displayLabel, numberColor, CHIP_COLORS } from '@roulette/game-core';
import { playChipPlace, playWheelSpin, playWin, playLose, toggleMute, getMuteState } from '../lib/sounds.js';
import type { RouletteGameState } from '../types';

interface GameProps {
  isSolo?: boolean;
}

export default function Game({ isSolo = false }: GameProps) {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const displayName = searchParams.get('name') || (() => { try { return sessionStorage.getItem('roulette_displayName') || 'Player'; } catch { return 'Player'; } })();

  // Both hooks are always called (React rules of hooks), but only one is used based on mode
  const multiHook = useRouletteRoom();
  const soloHook = useRouletteSolo();

  const hook = isSolo ? soloHook : multiHook;
  const { gameState, connected, error, joinRoom, send, leave, detachRoom, sessionId } = hook;

  const [selectedAmount, setSelectedAmount] = useState(25);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [muted, setMuted] = useState(getMuteState);
  const prevPhaseRef = useRef<string>('');
  const { dragState, dragRef, startDrag, moveDrag, endDrag, wasDragging } = useDragChip();

  const roundResult = useMemo(() => {
    if (!gameState?.roundResult) return null;
    try { return JSON.parse(gameState.roundResult); } catch { return null; }
  }, [gameState?.roundResult]);

  // Multiplayer: join room on mount
  useEffect(() => {
    if (!isSolo && roomCode) {
      detachRoom(); // prevent unmount from leaving the room
      joinRoom(roomCode, displayName).then(room => {
        if (!room) navigate('/');
      });
    }
  }, [isSolo, roomCode, joinRoom, displayName, navigate, detachRoom]);

  // Solo: initialize on mount
  useEffect(() => {
    if (isSolo) {
      joinRoom('SOLO', displayName);
    }
  }, [isSolo, joinRoom, displayName]);

  // NOTE: We intentionally do NOT call leave() on beforeunload.
  // leave() is only called on explicit "Leave" button click.

  // Sound effects
  useEffect(() => {
    const phase = gameState?.phase;
    if (!phase) return;

    if (phase === 'SPINNING' && prevPhaseRef.current === 'BETTING') {
      playWheelSpin();
    }
    if (phase === 'SETTLEMENT' && prevPhaseRef.current === 'SPINNING') {
      // Determine if current player won or lost
      const myResults = roundResult?.results?.filter((r: any) => r.playerId === sessionId);
      const anyWin = myResults?.some((r: any) => r.won);
      const anyLoss = myResults?.some((r: any) => !r.won);
      if (anyWin) playWin();
      else if (anyLoss) playLose();
    }
    prevPhaseRef.current = phase;
  }, [gameState?.phase, roundResult, sessionId]);

  // Global pointer handlers for drag-and-drop
  useEffect(() => {
    const handleMove = (e: PointerEvent) => moveDrag(e.clientX, e.clientY);
    const handleUp = (e: PointerEvent) => {
      // Use dragRef (not dragState) to avoid stale closure
      const current = dragRef.current;
      if (!current?.isDragging) {
        endDrag();
        return;
      }
      // Detect drop zone from the grid
      const gridEl = document.querySelector('[data-grid]');
      if (gridEl) {
        const cells = gridEl.querySelectorAll('[data-number]');
        const cellRects = Array.from(cells).map(el => {
          const rect = el.getBoundingClientRect();
          return {
            number: Number(el.getAttribute('data-number')),
            row: Number(el.getAttribute('data-row')),
            col: Number(el.getAttribute('data-col')),
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          };
        });
        const zeroEl = gridEl.querySelector('[data-number="0"]');
        const doubleZeroEl = gridEl.querySelector('[data-number="37"]');
        const zeroRect = zeroEl ? zeroEl.getBoundingClientRect() : undefined;
        const doubleZeroRect = doubleZeroEl ? doubleZeroEl.getBoundingClientRect() : undefined;
        const result = detectDropZone(e.clientX, e.clientY, cellRects, zeroRect, doubleZeroRect);
        if (result) {
          playChipPlace();
          send('place-bet', { betType: result.betType, amount: current.amount });
        }
      }
      endDrag();
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragState, moveDrag, endDrag, send]);



  const handleLeave = useCallback(() => {
    leave();
    navigate('/');
  }, [leave, navigate]);

  const handleToggleMute = useCallback(() => {
    setMuted(toggleMute());
  }, []);

  const handleUpdateSettings = useCallback((settings: Partial<{ minBet: number; maxBet: number; betTime: number; maxPlayers: number }>) => {
    send('update-settings', settings);
  }, [send]);

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
  const hasLastBets = myPlayer ? (() => { try { return JSON.parse(myPlayer.lastBets).length > 0; } catch { return false; } })() : false;

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

          {/* Multiplayer: Spin button + Timer during betting phase */}
          {!isSolo && phase === 'BETTING' && (
            <>
              <button
                onClick={() => send('spin-now')}
                disabled={(gameState.chips?.length ?? 0) === 0}
                style={{
                  padding: isMobile ? '0.5rem 1rem' : '0.375rem 1.25rem',
                  background: 'var(--accent-warm)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: (gameState.chips?.length ?? 0) > 0 ? 'pointer' : 'not-allowed',
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '0.05em',
                  opacity: (gameState.chips?.length ?? 0) > 0 ? 1 : 0.5,
                  transition: 'opacity 120ms',
                  minHeight: isMobile ? '44px' : undefined,
                }}
              >
                SPIN
              </button>
              {gameState.timerSeconds > 0 ? (
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
              ) : (
                <span style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: 'var(--success)',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '0.25rem 0.625rem',
                  borderRadius: '6px',
                  letterSpacing: '0.05em',
                }}>
                  PLACE YOUR BETS
                </span>
              )}
            </>
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

          {/* Settings gear — multiplayer only */}
          {!isSolo && myPlayer && (
            <button
              onClick={() => setSettingsOpen(true)}
              style={{
                width: isMobile ? '44px' : '32px',
                height: isMobile ? '44px' : '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: isMobile ? '1.125rem' : '0.9375rem',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title="Room Settings"
              aria-label="Room Settings"
            >
              ⚙
            </button>
          )}

          {/* Mute toggle */}
          <button
            onClick={handleToggleMute}
            style={{
              width: isMobile ? '44px' : '32px',
              height: isMobile ? '44px' : '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '8px',
              color: 'rgba(255,255,255,0.8)',
              fontSize: isMobile ? '1.125rem' : '0.9375rem',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            title={muted ? 'Unmute' : 'Mute'}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>

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

          <ThemeToggle style={isMobile ? { minHeight: '44px', minWidth: '44px' } : undefined} />
        </div>
      </div>

      {/* Settings panel overlay */}
      {settingsOpen && gameState && (
        <SettingsPanel
          current={{
            minBet: gameState.minBet,
            maxBet: gameState.maxBet,
            betTime: gameState.betTime,
            maxPlayers: gameState.maxPlayers,
          }}
          isHost={!!myPlayer?.isHost}
          onUpdate={handleUpdateSettings}
          onClose={() => setSettingsOpen(false)}
          isMobile={isMobile}
        />
      )}

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

          {/* Bankroll display */}
          <BankrollDisplay
            bankroll={isSolo ? soloBankroll : (myPlayer?.bankroll ?? 0)}
            availableBankroll={isSolo ? soloAvailableBankroll : ((myPlayer?.bankroll ?? 0) - (myPlayer?.totalBetThisRound ?? 0))}
            roundHistory={myPlayer?.roundHistory ?? []}
            isMobile={isMobile}
          />

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
              onPlaceBet={(betType, amount) => {
                playChipPlace();
                send('place-bet', { betType, amount });
              }}
              onRemoveBet={(chipIndex) => send('remove-bet', { chipIndex })}
              isMobile={isMobile}
              dragState={dragState}
              onDrop={() => {}}
              onDragCancel={() => {}}
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
              onRepeatBet={() => send('repeat-last-bet')}
              canBet={canBet}
              hasLastBets={hasLastBets}
              isMobile={isMobile}
              onStartDrag={(amount, chipColorIndex, x, y) => startDrag(amount, chipColorIndex, x, y)}
              wasDragging={wasDragging}
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
                isMobile={isMobile}
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
                  isMobile={isMobile}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Ghost chip during drag */}
      {dragState?.isDragging && (
        <div style={{
          position: 'fixed',
          left: dragState.currentX - 18,
          top: dragState.currentY - 18,
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '2px solid white',
          backgroundColor: CHIP_COLORS[dragState.chipColorIndex]?.hex ?? '#888',
          color: '#fff',
          fontWeight: 700,
          fontSize: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          opacity: 0.9,
        }}>
          ${dragState.amount}
        </div>
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
