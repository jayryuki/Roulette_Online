// apps/web/src/components/Game.tsx

import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useRouletteRoom } from '../hooks/useRouletteRoom';
import Wheel3D from './Wheel3D';
import BettingGrid from './BettingGrid';
import ChipTray from './ChipTray';
import PlayerSidebar from './PlayerSidebar';
import { CHIP_COLORS } from '@roulette/game-core';

export default function Game() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const displayName = searchParams.get('name') || 'Player';

  const { gameState, connected, error, joinRoom, send, leave, sessionId } = useRouletteRoom();
  const [selectedAmount, setSelectedAmount] = useState(25);
  const [joined, setJoined] = useState(false);

  // All hooks must be called before any early returns
  const roundResult = useMemo(() => {
    if (!gameState?.roundResult) return null;
    try { return JSON.parse(gameState.roundResult); } catch { return null; }
  }, [gameState?.roundResult]);

  useEffect(() => {
    if (roomCode && !joined) {
      joinRoom(roomCode, displayName).then(room => {
        if (!room) navigate('/');
        setJoined(true);
      });
    }
  }, [roomCode]);

  useEffect(() => {
    return () => { leave(); };
  }, []);

  if (!gameState || !connected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <p>Connecting to room {roomCode}...</p>
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

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">Roulette</h1>
          <span className="text-sm text-gray-400 font-mono">{gameState.roomCode}</span>
        </div>
        <div className="flex items-center gap-3">
          {phase === 'BETTING' && (
            <span className="text-sm font-mono bg-gray-700 px-2 py-0.5 rounded">
              {gameState.timerSeconds}s
            </span>
          )}
          <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
            phase === 'SPINNING' ? 'bg-yellow-600' :
            phase === 'SETTLEMENT' ? 'bg-green-600' :
            'bg-gray-600'
          }`}>
            {phase}
          </span>
          <button
            onClick={() => { leave(); navigate('/'); }}
            className="text-sm text-red-400 hover:text-red-300"
          >
            Leave
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 max-w-7xl mx-auto w-full">
        {/* Wheel + Grid */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {/* Wheel */}
          <Wheel3D targetNumber={targetNumber} spinning={spinning} />

          {/* Winning number display */}
          {phase === 'SETTLEMENT' && targetNumber !== null && (
            <div className="text-center py-2 bg-green-800 rounded-lg">
              <span className="text-2xl font-bold">
                Winning: {targetNumber === 37 ? '00' : targetNumber}
              </span>
            </div>
          )}

          {/* Round result summary */}
          {roundResult && phase === 'SETTLEMENT' && (
            <div className="bg-gray-800 rounded-xl p-3 text-sm max-h-36 overflow-y-auto">
              <h3 className="font-semibold mb-1">Results</h3>
              {roundResult.results?.map((r: any, i: number) => (
                <div key={i} className={`flex justify-between ${r.won ? 'text-green-400' : 'text-red-400'}`}>
                  <span>{r.name} — {r.betType}</span>
                  <span className="font-mono">{r.won ? `+$${r.payout - r.amount}` : `-$${r.amount}`}</span>
                </div>
              ))}
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

          {/* Chip tray + Spin Now */}
          <div className="flex items-center gap-3">
            <ChipTray
              selectedAmount={selectedAmount}
              onSelectAmount={setSelectedAmount}
              onClearBets={() => send('clear-bets')}
              canBet={canBet}
            />
            {myPlayer?.isHost && phase === 'BETTING' && (
              <button
                onClick={() => send('spin-now')}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-xl font-bold text-sm transition"
              >
                Spin Now
              </button>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <PlayerSidebar
            players={players}
            sessionId={sessionId}
            hostPlayerId={gameState.hostPlayerId}
            phase={phase}
            lastResults={gameState.lastResults || []}
            chatMessages={gameState.chatMessages || []}
            onSendChat={(text) => send('chat', { text })}
            onToggleReady={() => send('toggle-ready')}
            onSwapColor={(index) => send('swap-color', { targetIndex: index })}
            onStartRound={() => send('start-round')}
            takenColors={takenColors}
          />
        </div>
      </div>
    </div>
  );
}
