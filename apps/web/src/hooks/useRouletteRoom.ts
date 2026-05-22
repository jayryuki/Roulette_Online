// apps/web/src/hooks/useRouletteRoom.ts

import { useEffect, useRef, useState, useCallback } from 'react';
import { Client, Room } from 'colyseus.js';
import type { RouletteGameState } from '../types';

const ENDPOINT = window.location.hostname === 'localhost'
  ? 'ws://localhost:2500'
  : `wss://${window.location.hostname}:2500`;

export function useRouletteRoom() {
  const clientRef = useRef<Client | null>(null);
  const roomRef = useRef<Room<RouletteGameState> | null>(null);
  const [gameState, setGameState] = useState<RouletteGameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!clientRef.current) {
    clientRef.current = new Client(ENDPOINT);
  }

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
    try {
      setError(null);
      const lookup = await fetch(`/api/rooms/${roomCode}`);
      if (!lookup.ok) throw new Error('Room not found');
      const { roomId } = await lookup.json();

      const room = await clientRef.current!.joinById(roomId, { displayName });
      roomRef.current = room;
      setConnected(true);

      room.onStateChange((state: RouletteGameState) => {
        setGameState({ ...state });
      });

      room.onLeave(() => {
        setConnected(false);
        setGameState(null);
      });

      room.onError((code, msg) => {
        setError(`Room error: ${msg}`);
      });

      room.onMessage('place-your-bets', () => {});
      room.onMessage('spin-result', () => {});
      room.onMessage('round-result', () => {});
      room.onMessage('shuffling', () => {});

      return room;
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, []);

  const send = useCallback((type: string, data: any = {}) => {
    roomRef.current?.send(type, data);
  }, []);

  const leave = useCallback(() => {
    roomRef.current?.leave();
    roomRef.current = null;
    setConnected(false);
    setGameState(null);
  }, []);

  return {
    gameState,
    connected,
    error,
    createRoom,
    joinRoom,
    send,
    leave,
    sessionId: roomRef.current?.sessionId ?? null,
  };
}
