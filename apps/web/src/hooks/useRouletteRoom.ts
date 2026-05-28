import { useRef, useState, useCallback } from 'react';
import { Client, Room } from 'colyseus.js';
import type { RouletteGameState } from '../types';

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const ENDPOINT = `${protocol}//${window.location.host}`;

const SS_ROOM_CODE = 'roulette_roomCode';
const SS_RECONNECTION_TOKEN = 'roulette_reconnectionToken';
const SS_DISPLAY_NAME = 'roulette_displayName';

// Module-level client singleton — survives React StrictMode remounts
let sharedClient: Client | null = null;
let connectingLock = false;

function getClient(): Client {
  if (!sharedClient) {
    sharedClient = new Client(ENDPOINT);
  }
  return sharedClient;
}

function parseState(state: any): RouletteGameState {
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

function storeSession(roomCode: string, reconnectionToken: string, displayName: string) {
  try {
    sessionStorage.setItem(SS_ROOM_CODE, roomCode);
    sessionStorage.setItem(SS_RECONNECTION_TOKEN, reconnectionToken);
    sessionStorage.setItem(SS_DISPLAY_NAME, displayName);
  } catch {}
}

function clearSession() {
  try {
    sessionStorage.removeItem(SS_ROOM_CODE);
    sessionStorage.removeItem(SS_RECONNECTION_TOKEN);
    sessionStorage.removeItem(SS_DISPLAY_NAME);
  } catch {}
}

function getStoredSession(): { roomCode: string; reconnectionToken: string; displayName: string } | null {
  try {
    const roomCode = sessionStorage.getItem(SS_ROOM_CODE);
    const reconnectionToken = sessionStorage.getItem(SS_RECONNECTION_TOKEN);
    const displayName = sessionStorage.getItem(SS_DISPLAY_NAME) || '';
    if (roomCode && reconnectionToken) {
      return { roomCode, reconnectionToken, displayName };
    }
  } catch {}
  return null;
}

export function useRouletteRoom() {
  const roomRef = useRef<Room<RouletteGameState> | null>(null);
  const [gameState, setGameState] = useState<RouletteGameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const setupRoomListeners = useCallback((room: Room<RouletteGameState>) => {
    room.onStateChange((state: any) => {
      setGameState(parseState(state));
    });

    room.onLeave(() => {
      clearSession();
      setConnected(false);
      setGameState(null);
      setSessionId(null);
      roomRef.current = null;
    });

    room.onError((code, msg) => {
      setError(`Room error: ${msg}`);
    });
  }, []);

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

      // Try reconnection first if we have a stored session for this room
      const stored = getStoredSession();
      if (stored && stored.roomCode === roomCode) {
        try {
          const client = getClient();
          const room = await client.reconnect(stored.reconnectionToken);
          roomRef.current = room;
          setConnected(true);
          setSessionId(room.sessionId);
          storeSession(roomCode, room.reconnectionToken, stored.displayName);
          setupRoomListeners(room);
          // Force initial state parse
          setGameState(parseState(room.state));
          return room;
        } catch {
          // Reconnect failed, clear stored session and fall through to normal join
          clearSession();
        }
      }

      const lookup = await fetch(`/api/rooms/${roomCode}`);
      if (!lookup.ok) throw new Error('Room not found');
      const { roomId } = await lookup.json();

      const client = getClient();
      const room = await client.joinById(roomId, { displayName });
      roomRef.current = room;
      setConnected(true);
      setSessionId(room.sessionId);
      storeSession(roomCode, room.reconnectionToken, displayName);
      setupRoomListeners(room);
      // Force initial state parse
      setGameState(parseState(room.state));

      return room;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      connectingLock = false;
    }
  }, [setupRoomListeners]);

  const send = useCallback((type: string, data: any = {}) => {
    roomRef.current?.send(type, data);
  }, []);

  const leave = useCallback(() => {
    clearSession();
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
