import { useState } from 'react';
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
  onSwapColor: (index: number) => void;
  onChangeName: (name: string) => void;
  takenColors: Set<number>;
  isMobile?: boolean;
}

export default function PlayerSidebar({
  players, sessionId, hostPlayerId, phase, lastResults, chatMessages,
  onSendChat, onSwapColor, onChangeName, takenColors, isMobile = false,
}: PlayerSidebarProps) {
  const playerList = Array.from(players.values()).sort((a, b) => a.seatIndex - b.seatIndex);
  const myPlayer = sessionId ? players.get(sessionId) : null;
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%' }}>
      {/* Players panel */}
      <div style={{
        background: 'var(--surface-panel)',
        borderRadius: '10px',
        padding: '0.75rem',
        border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
          Players
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '160px', overflowY: 'auto' }}>
          {playerList.map(p => {
            const color = CHIP_COLORS.find(c => c.index === p.chipColor);
            const isMe = p.playerId === sessionId;
            return (
              <div key={p.playerId} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px',
                background: isMe ? 'var(--surface-panel-raised)' : 'transparent',
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: color?.hex ?? '#888',
                  flexShrink: 0,
                }} />
                {isMe ? (
                  editingName ? (
                    <input
                      autoFocus
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onBlur={() => {
                        const trimmed = nameInput.trim().slice(0, 20);
                        if (trimmed && trimmed !== myPlayer?.displayName) {
                          onChangeName(trimmed);
                          try { localStorage.setItem('roulette_displayName', trimmed); } catch {}
                        }
                        setEditingName(false);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); }
                        if (e.key === 'Escape') { setEditingName(false); }
                      }}
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        background: 'var(--surface-panel-raised)',
                        border: '1px solid var(--accent-warm)',
                        borderRadius: '4px',
                        padding: '0 0.25rem',
                        outline: 'none',
                        width: '100%',
                        maxWidth: '120px',
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '0.8125rem',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderBottom: '1px dashed var(--text-muted)',
                      }}
                      onClick={() => { setNameInput(p.displayName); setEditingName(true); }}
                      title="Click to change name"
                    >
                      {p.displayName} ✎
                    </span>
                  )
                ) : (
                  <span style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {p.displayName}
                  </span>
                )}
                <span style={{
                  fontSize: '0.6875rem',
                  color: 'var(--success)',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 600,
                }}>
                  ${p.bankroll}
                </span>
              </div>
            );
          })}
        </div>

        {/* Color swapper */}
        {myPlayer && (
          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--rule-subtle)' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>Chip Color</div>
            <div style={{ display: 'flex', gap: isMobile ? '0.125rem' : '0.25rem', flexWrap: 'wrap' }}>
              {CHIP_COLORS.map(c => (
                <button
                  key={c.index}
                  onClick={() => onSwapColor(c.index)}
                  disabled={takenColors.has(c.index) && c.index !== myPlayer.chipColor}
                  style={{
                    width: isMobile ? '44px' : '20px',
                    height: isMobile ? '44px' : '20px',
                    borderRadius: '50%',
                    border: c.index === myPlayer.chipColor ? '2px solid var(--accent-warm)' : '2px solid transparent',
                    backgroundColor: c.hex,
                    cursor: 'pointer',
                    opacity: (takenColors.has(c.index) && c.index !== myPlayer.chipColor) ? 0.3 : 1,
                    transition: 'transform 80ms',
                    transform: c.index === myPlayer.chipColor ? 'scale(1.15)' : 'scale(1)',
                    flexShrink: 0,
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hot/Cold */}
      <HotColdPanel lastResults={lastResults} />

      {/* Chat */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ChatBox messages={chatMessages} onSend={onSendChat} />
      </div>
    </div>
  );
}
