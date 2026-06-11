import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRouletteRoom } from '../hooks/useRouletteRoom';
import { useRouletteSolo } from '../hooks/useRouletteSolo';
import { useIsMobile } from '../hooks/useIsMobile';
import { useDragChip } from '../hooks/useDragChip';
import { detectDropZone } from '../lib/dropZones';
import { Button, useWinBurst, WinBurst } from '@games/ui';
import RouletteThemeToggle from './RouletteThemeToggle';
import Wheel2D from './Wheel2D';
import BettingGrid from './BettingGrid';
import ChipTray from './ChipTray';
import BankrollDisplay from './BankrollDisplay';
import PlayerSidebar from './PlayerSidebar';
import HotColdPanel from './HotColdPanel';
import { displayLabel, numberColor, CHIP_COLORS } from '@roulette/game-core';
import { playChipPlace, playWheelSpin, playWin, playLose, toggleMute, getMuteState } from '../lib/sounds.js';
import type { RouletteGameState } from '../types';

interface GameProps {
  isSolo?: boolean;
}

export default function Game({ isSolo = false }: GameProps) {
  const navigate = useNavigate();
  const displayName = (() => { try { return localStorage.getItem('roulette_displayName') || 'Player'; } catch { return 'Player'; } })();

  const multiHook = useRouletteRoom();
  const soloHook = useRouletteSolo();

  const hook = isSolo ? soloHook : multiHook;
  const { gameState, connected, error, autoJoin, send, leave, detachRoom, sessionId } = hook;

  const [selectedAmount, setSelectedAmount] = useState(25);
  const DENOMINATIONS = [1, 5, 25, 100, 500];
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [muted, setMuted] = useState(getMuteState);
  const prevPhaseRef = useRef<string>('');
  const { dragState, dragRef, startDrag, moveDrag, endDrag, wasDragging, isPending } = useDragChip();
  const repositionChipRef = useRef<number | null>(null);

  const roundResult = useMemo(() => {
    if (!gameState?.roundResult) return null;
    try { return JSON.parse(gameState.roundResult); } catch { return null; }
  }, [gameState?.roundResult]);

  useEffect(() => {
    if (!isSolo) {
      detachRoom();
      autoJoin(displayName);
    }
  }, [isSolo, autoJoin, displayName, detachRoom]);

  useEffect(() => {
    if (isSolo) {
      autoJoin(displayName);
    }
  }, [isSolo, autoJoin, displayName]);

  useEffect(() => {
    const phase = gameState?.phase;
    if (!phase) return;

    if (phase === 'SPINNING' && prevPhaseRef.current === 'BETTING') {
      playWheelSpin();
    }
    if (phase === 'SETTLEMENT' && prevPhaseRef.current === 'SPINNING') {
      const myResults = roundResult?.results?.filter((r: any) => r.playerId === sessionId);
      const anyWin = myResults?.some((r: any) => r.won);
      const anyLoss = myResults?.some((r: any) => !r.won);
      if (anyWin) playWin();
      else if (anyLoss) playLose();
    }
    prevPhaseRef.current = phase;
  }, [gameState?.phase, roundResult, sessionId]);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      let snapX = e.clientX;
      let snapY = e.clientY;
      if (dragRef.current?.isDragging || isPending()) {
        const gridEl = document.querySelector('[data-grid]');
        if (gridEl) {
          const r = gridEl.getBoundingClientRect();
          const margin = 40;
          const nearGrid = e.clientX >= r.left - margin && e.clientX <= r.right + margin && e.clientY >= r.top - margin && e.clientY <= r.bottom + margin;
          if (nearGrid) {
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
              snapX = result.snapX;
              snapY = result.snapY;
            }
          }
        }
      }
      moveDrag(e.clientX, e.clientY, snapX, snapY);
    };
    const handleUp = (e: PointerEvent) => {
      const current = dragRef.current;
      if (!current?.isDragging) {
        repositionChipRef.current = null;
        endDrag();
        return;
      }
      const gridEl = document.querySelector('[data-grid]');
      let overGrid = false;
      if (gridEl) {
        const r = gridEl.getBoundingClientRect();
        const margin = 40;
        overGrid = e.clientX >= r.left - margin && e.clientX <= r.right + margin && e.clientY >= r.top - margin && e.clientY <= r.bottom + margin;
      }
      if (overGrid && gridEl) {
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
          if (repositionChipRef.current !== null) {
            send('remove-bet', { chipIndex: repositionChipRef.current });
            repositionChipRef.current = null;
          }
          send('place-bet', { betType: result.betType, amount: current.amount });
        } else {
          repositionChipRef.current = null;
        }
      } else if (repositionChipRef.current !== null) {
        send('remove-bet', { chipIndex: repositionChipRef.current });
        repositionChipRef.current = null;
      }
      endDrag();
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveDrag, endDrag, send]);

  const handleLeave = useCallback(() => {
    try { leave(); } catch {}
    navigate('/');
  }, [leave, navigate]);

  const handleToggleMute = useCallback(() => {
    setMuted(toggleMute());
  }, []);

  const handleChangeName = useCallback((name: string) => {
    send('change-name', { displayName: name });
  }, [send]);

  const hookPhase = gameState?.phase ?? 'LOBBY';
  const hookMyRoundNet = roundResult?.results
    ?.filter((r: any) => r.playerId === sessionId)
    ?.reduce((sum: number, r: any) => sum + (r.won ? r.payout - r.amount : -r.amount), 0) ?? 0;
  const winBurst = useWinBurst(Boolean(gameState && connected && hookPhase === 'SETTLEMENT' && hookMyRoundNet > 0), hookMyRoundNet);

  if (!gameState || !connected) {
    return (
      <div className="game-loading">
        <div className="game-loading-text">
          {isSolo ? 'Starting solo game...' : 'Connecting...'}
        </div>
      </div>
    );
  }

  const players = gameState.players;
  const myPlayer = sessionId ? players.get(sessionId) : null;
  const phase = gameState.phase;
  const canBet = phase === 'BETTING' && myPlayer != null;
  let hasLastBets = false;
  try { hasLastBets = JSON.parse(myPlayer?.lastBets || '[]').length > 0; } catch { hasLastBets = false; }

  const takenColors = new Set<number>();
  for (const [, p] of players) {
    if (p.chipColor < 8) takenColors.add(p.chipColor);
  }

  const spinning = phase === 'SPINNING';
  const targetNumber = gameState.winningNumber >= 0 ? gameState.winningNumber : null;
  const showWinning = phase === 'SETTLEMENT' && targetNumber !== null;
  const winningDisplay = targetNumber !== null ? displayLabel(targetNumber) : '';
  const isGameOver = isSolo && gameState.status === 'finished';

  const soloBankroll = isSolo ? myPlayer?.bankroll ?? 0 : 0;
  const soloAvailableBankroll = isSolo ? soloBankroll - (myPlayer?.totalBetThisRound ?? 0) : 0;

  return (
    <div className="game-root">
      {/* Top bar */}
      <header className="game-topbar">
        <Button variant="ghost" onClick={handleLeave} className="game-btn-leave">
          ← Leave
        </Button>
        <div className="game-topbar-actions">
          {isSolo && phase === 'BETTING' && !isGameOver && (
            <button
              onClick={() => send('spin-now')}
              disabled={!canBet || (gameState.chips?.length ?? 0) === 0}
              className="game-btn-spin"
            >
              SPIN
            </button>
          )}

          {!isSolo && phase === 'BETTING' && (
            <>
              <button
                onClick={() => send('spin-now')}
                disabled={(gameState.chips?.length ?? 0) === 0}
                className="game-btn-spin"
              >
                SPIN
              </button>
              {gameState.timerSeconds > 0 ? (
                <span className="game-timer">{gameState.timerSeconds}</span>
              ) : (
                <span className="game-timer-label">PLACE YOUR BETS</span>
              )}
            </>
          )}

          {!isMobile && (
            <span className={`game-phase-badge game-phase-${phase.toLowerCase()}`}>
              {phase === 'BETTING' ? 'Place Bets' : phase === 'SPINNING' ? 'Spinning' : phase === 'SETTLEMENT' ? 'Result' : phase}
            </span>
          )}

          <button onClick={handleToggleMute} className="game-icon-btn" title={muted ? 'Unmute' : 'Mute'} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? '🔇' : '🔊'}
          </button>

          {isMobile && (
            <button onClick={() => setSidebarOpen(prev => !prev)} className="game-icon-btn" aria-label="Toggle sidebar">
              ☰
            </button>
          )}

          <RouletteThemeToggle style={isMobile ? { minHeight: "44px", minWidth: "44px" } : undefined} />
        </div>
      </header>

      {/* Main content */}
      <main className="game-main">
        {/* Left: Wheel + Grid area */}
        <section className="game-play-area">
          {/* Wheel */}
          <div className="game-wheel-wrap">
            <Wheel2D targetNumber={targetNumber} spinning={spinning} />
          </div>

          {/* Winning number banner */}
          {showWinning && (
            <div className="game-win-banner">
              <span
                className="game-win-dot"
                style={{
                  background: targetNumber !== null
                    ? numberColor(targetNumber) === 'red' ? 'var(--roulette-red)'
                      : numberColor(targetNumber) === 'green' ? 'var(--roulette-green)'
                      : 'var(--roulette-black)'
                    : 'transparent',
                }}
              />
              <span className="game-win-number">{winningDisplay}</span>
            </div>
          )}

          {/* Bankroll display */}
          <div className="game-bankroll-wrap">
            <BankrollDisplay
              bankroll={isSolo ? soloBankroll : (myPlayer?.bankroll ?? 0)}
              availableBankroll={isSolo ? soloAvailableBankroll : ((myPlayer?.bankroll ?? 0) - (myPlayer?.totalBetThisRound ?? 0))}
              roundHistory={myPlayer?.roundHistory ?? []}
              isMobile={isMobile}
            />
          </div>

          {/* Betting grid */}
          <div className="game-grid-wrap">
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
              wasDragging={wasDragging}
              onChipPointerDown={(chipIndex, amount, chipColor, x, y) => {
                repositionChipRef.current = chipIndex;
                startDrag(amount, chipColor, x, y);
              }}
            />
          </div>

          {/* Chip tray */}
          <div className="game-chip-tray-wrap">
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
            <div className="game-result-summary">
              {roundResult.results?.map((r: any, i: number) => (
                <div key={i} className={`game-result-row ${r.won ? 'win' : 'loss'}`}>
                  <span>{r.name} — {r.betType}</span>
                  <span className="game-result-amount">
                    {r.won ? `+$${r.payout - r.amount}` : `-$${r.amount}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="game-sidebar">
            {isSolo ? (
              <>
                <HotColdPanel lastResults={gameState.lastResults || []} />
                {isGameOver && (
                  <div className="game-over-panel">
                    <div className="game-over-title">Game Over</div>
                    <div className="game-over-msg">Your bankroll has hit $0.</div>
                    <Button onClick={() => send('restart-solo')} size="sm">Play Again</Button>
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
                onChangeName={handleChangeName}
                takenColors={takenColors}
                isMobile={isMobile}
              />
            )}
          </aside>
        )}
      </main>

      {/* Mobile sidebar drawer */}
      {isMobile && sidebarOpen && (
        <>
          <div className="game-drawer-backdrop" onClick={() => setSidebarOpen(false)} />
          <div className="game-drawer">
            <div className="game-drawer-header">
              <span>{isSolo ? 'Game Info' : 'Players & Chat'}</span>
              <button onClick={() => setSidebarOpen(false)} className="game-drawer-close" aria-label="Close sidebar">×</button>
            </div>
            <div className="game-drawer-content">
              {isSolo ? (
                <>
                  <HotColdPanel lastResults={gameState.lastResults || []} />
                  {isGameOver && (
                    <div className="game-over-panel">
                      <div className="game-over-title">Game Over</div>
                      <div className="game-over-msg">Your bankroll has hit $0.</div>
                      <Button onClick={() => send('restart-solo')} size="sm">Play Again</Button>
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
                  onChangeName={handleChangeName}
                  takenColors={takenColors}
                  isMobile={isMobile}
                />
              )}
            </div>
          </div>
        </>
      )}


      {/* Win burst animation */}
      {winBurst.shouldRender && <WinBurst containerRef={winBurst.containerRef} amount={winBurst.amount} />}

      {/* Ghost chip during drag */}
      {dragState?.isDragging && (
        <div
          className="game-ghost-chip"
          style={{
            left: dragState.snapX - 18,
            top: dragState.snapY - 18,
            backgroundColor: CHIP_COLORS[dragState.chipColorIndex]?.hex ?? '#888',
          }}
        >
          ${dragState.amount}
        </div>
      )}

      {/* Game over full overlay for solo mode */}
      {isGameOver && (
        <div className="game-over-overlay">
          <div className="game-over-modal">
            <div className="game-over-modal-title">Game Over</div>
            <div className="game-over-modal-msg">
              Your bankroll has hit $0.
              <br />
              Better luck next time!
            </div>
            <div className="game-over-modal-actions">
              <Button onClick={() => send('restart-solo')}>Play Again ($1,000)</Button>
              <Button variant="ghost" onClick={handleLeave}>Back to Lobby</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
