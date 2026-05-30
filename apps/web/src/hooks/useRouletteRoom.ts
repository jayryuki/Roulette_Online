import { useState, useCallback, useRef } from 'react';
import { Client, Room } from 'colyseus.js';
import type { RouletteGameState } from '../types';

const colyseusUrl = import.meta.env.DEV
  ? 'ws://localhost:2500'
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

const colyseusClient = new Client(colyseusUrl);

function parseState(state: any): RouletteGameState {
  const playersMap = new Map<string, any>();
  if (state.players) {
    for (const [key, value] of state.players.entries()) {
      playersMap.set(key, {
        ...value,
        roundHistory: (() => { try { return JSON.parse(value.roundHistory || '[]'); } catch { return []; } })(),
        lastBets: value.lastBets || '',
      });
    }
  }

  const chipsArray: any[] = [];
  if (state.chips) {
    for (let i = 0; i < state.chips.length; i++) {
      chipsArray.push({ ...state.chips[i] });
    }
  }

  const chatArray: any[] = [];
  if (state.chatMessages) {
    for (let i = 0; i < state.chatMessages.length; i++) {
      chatArray.push({ ...state.chatMessages[i] });
    }
  }

  const resultsArray: string[] = [];
  if (state.lastResults) {
    for (let i = 0; i < state.lastResults.length; i++) {
      resultsArray.push(state.lastResults[i]);
    }
  }

  return {
    roomId: state.roomId ?? '',
    roomCode: state.roomCode ?? '',
    status: state.status ?? 'lobby',
    hostPlayerId: state.hostPlayerId ?? '',
    phase: state.phase ?? 'LOBBY',
    winningNumber: state.winningNumber ?? -1,
    timerSeconds: state.timerSeconds ?? 0,
    minBet: state.minBet ?? 1,
    maxBet: state.maxBet ?? 1000,
    betTime: state.betTime ?? 30,
    maxPlayers: state.maxPlayers ?? 8,
    players: playersMap,
    chips: chipsArray,
    chatMessages: chatArray,
    lastResults: resultsArray,
    roundResult: state.roundResult ?? '',
  };
}

export function useRouletteRoom() {
  const [gameState, setGameState] = useState<RouletteGameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const roomRef = useRef<Room<RouletteGameState> | null>(null);
  const joinedRef = useRef(false);

  const autoJoin = useCallback(async (displayName: string) => {
    if (joinedRef.current) return roomRef.current;
    joinedRef.current = true;

    try {
      setError(null);

      // Ask server to find or create a table
      const res = await fetch('/api/roulette/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) throw new Error('Failed to join table');
      const { roomId } = await res.json();

      const room = await colyseusClient.joinById(roomId, { displayName });
      roomRef.current = room;
      setConnected(true);
      setSessionId(room.sessionId);

      room.onStateChange((state: any) => {
        setGameState(parseState(state));
      });

      room.onError((code: number, msg?: string) => {
        setError(`Room error: ${msg}`);
      });

      // Force initial state parse
      setGameState(parseState(room.state));

      return room;
    } catch (e: any) {
      joinedRef.current = false;
      setError(e.message);
      return null;
    }
  }, []);

  const send = useCallback((type: string, data: any = {}) => {
    roomRef.current?.send(type, data);
  }, []);

  const leave = useCallback(() => {
    if (roomRef.current) {
      try { roomRef.current.leave(); } catch {}
      roomRef.current = null;
    }
    joinedRef.current = false;
    setConnected(false);
    setGameState(null);
    setSessionId(null);
  }, []);

  // Detach room ref so unmount doesn't leave the room.
  // Used when navigating from lobby to game screen.
  const detachRoom = useCallback(() => {
    roomRef.current = null;
  }, []);

  return {
    gameState,
    connected,
    error,
    autoJoin,
    send,
    leave,
    detachRoom,
    sessionId,
  };
}
