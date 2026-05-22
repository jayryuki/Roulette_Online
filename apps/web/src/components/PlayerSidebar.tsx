// apps/web/src/components/PlayerSidebar.tsx

import { CHIP_COLORS } from '@roulette/game-core';
import type { PlayerData } from '../types';
import HotColdPanel from './HotColdPanel';
import ChatBox from './ChatBox';

interface PlayerSidebarProps {
  players: Map<string, PlayerData>;
  sessionId: string | null;
  hostPlayerId: string;
  phase: string;
  lastResults: string[];
  chatMessages: any[];
  onSendChat: (text: string) => void;
  onToggleReady: () => void;
  onSwapColor: (index: number) => void;
  onStartRound: () => void;
  takenColors: Set<number>;
}

export default function PlayerSidebar({
  players, sessionId, hostPlayerId, phase, lastResults, chatMessages,
  onSendChat, onToggleReady, onSwapColor, onStartRound, takenColors,
}: PlayerSidebarProps) {
  const playerList = Array.from(players.values()).sort((a, b) => a.seatIndex - b.seatIndex);
  const myPlayer = sessionId ? players.get(sessionId) : null;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Players panel */}
      <div className="bg-gray-800 rounded-xl p-3">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Players</h3>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {playerList.map(p => {
            const color = CHIP_COLORS.find(c => c.index === p.chipColor);
            return (
              <div key={p.playerId} className={`flex items-center gap-2 px-2 py-1 rounded ${p.playerId === sessionId ? 'bg-gray-700' : ''}`}>
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color?.hex ?? '#888' }}
                />
                <span className="text-sm text-white flex-1 truncate">
                  {p.displayName}
                  {p.isHost && ' (Host)'}
                </span>
                <span className="text-xs text-green-400 font-mono">${p.bankroll}</span>
                {!p.isReady && phase === 'LOBBY' && (
                  <span className="text-xs text-yellow-400">Not ready</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Color swapper (for my player) */}
        {myPlayer && phase === 'LOBBY' && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <p className="text-xs text-gray-400 mb-1">Chip Color</p>
            <div className="flex gap-1 flex-wrap">
              {CHIP_COLORS.map(c => (
                <button
                  key={c.index}
                  onClick={() => onSwapColor(c.index)}
                  disabled={takenColors.has(c.index) && c.index !== myPlayer.chipColor}
                  className={`w-6 h-6 rounded-full border-2 transition ${
                    c.index === myPlayer.chipColor ? 'border-white scale-110' : 'border-transparent'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hot/Cold numbers */}
      <HotColdPanel lastResults={lastResults} />

      {/* Ready button (lobby) */}
      {phase === 'LOBBY' && myPlayer && (
        <button
          onClick={onToggleReady}
          className={`w-full py-2 rounded-lg font-semibold text-sm transition ${
            myPlayer.isReady
              ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
              : 'bg-green-600 hover:bg-green-500 text-white'
          }`}
        >
          {myPlayer.isReady ? 'Not Ready' : 'Ready'}
        </button>
      )}

      {/* Start button (host) */}
      {myPlayer?.isHost && (phase === 'LOBBY' || phase === 'ROUND_END') && (
        <button
          onClick={onStartRound}
          className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 rounded-lg font-bold text-sm"
        >
          Start Round
        </button>
      )}

      {/* Chat */}
      <div className="flex-1 min-h-0">
        <ChatBox messages={chatMessages} onSend={onSendChat} />
      </div>
    </div>
  );
}
