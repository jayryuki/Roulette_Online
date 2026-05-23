import { useRef, useState, useCallback } from 'react';
import { Client, Room } from 'colyseus.js';
import type { RouletteGameState } from '../types';

const ENDPOINT = window.location.hostname === 'localhost'
  ? 'ws://localhost:2500'
  : `wss://${window.location.hostname}:2500`;

// Module-level client singleton — survives React StrictMode remounts
let sharedClient: Client | null = null;
let connectingLock = false;

function getClient(): Client {
  if (!sharedClient) {
    sharedClient = new Client(ENDPOINT);
  }
  return sharedClient;
}

export function useRouletteRoom() {
  const roomRef = useRef<Room<RouletteGameState> | null>(null);
  const [gameState, setGameState] = useState<RouletteGameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const createRoom = useCallback(async (displayName: string) => {
    try {
      setError(null);
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, game: 'roulette' }),
      });
      if (!res.ok) throw new Error('Failed to create room');
      return await res.json();
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, []);

  const joinRoom = useCallback(async (roomCode: string, displayName: string) => {
    // Prevent double-join from React StrictMode remount
    if (connectingLock) return null;
    // Already connected to this room
    if (roomRef.current) return roomRef.current;

    connectingLock = true;
    try {
      setError(null);

      const lookup = await fetch(`/api/rooms/${roomCode}`);
      if (!lookup.ok) throw new Error('Room not found');
      const { roomId } = await lookup.json();

      const client = getClient();
      const room = await client.joinById(roomId, { displayName });
      roomRef.current = room;
      setConnected(true);
      setSessionId(room.sessionId);

      room.onStateChange((state: any) => {
        const playersMap = new Map<string, any>();
        if (state.players) {
          for (const [key, value] of state.players.entries()) {
            playersMap.set(key, { ...value });
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

        const gs: RouletteGameState = {
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

        setGameState(gs);
      });

      room.onLeave(() => {
        setConnected(false);
        setGameState(null);
        setSessionId(null);
        roomRef.current = null;
      });

      room.onError((code, msg) => {
        setError(`Room error: ${msg}`);
      });

      return room;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      connectingLock = false;
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
    setConnected(false);
    setGameState(null);
    setSessionId(null);
  }, []);

  return {
    gameState,
    connected,
    error,
    createRoom,
    joinRoom,
    send,
    leave,
    sessionId,
  };
}
