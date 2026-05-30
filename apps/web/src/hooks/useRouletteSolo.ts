import { useState, useRef, useCallback, useEffect } from 'react';
import {
  calculatePayouts,
  calculateNetProfit,
  validateBet,
} from '@roulette/game-core';
import type { RouletteGameState, ChipData, PlayerData } from '../types';

const SOLO_SESSION_ID = 'solo-player';
const INITIAL_BANKROLL = 1000;
const SPIN_DURATION_MS = 4000;
const SETTLEMENT_DISPLAY_MS = 4000;

export function useRouletteSolo() {
  const [gameState, setGameState] = useState<RouletteGameState | null>(null);
  const [connected, setConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mutable game state stored in refs for consistent access in callbacks
  const stateRef = useRef({
    bankroll: INITIAL_BANKROLL,
    totalBetThisRound: 0,
    chips: [] as ChipData[],
    phase: 'BETTING' as string,
    lastResults: [] as string[],
    winningNumber: -1,
    roundResult: '',
    displayName: 'Player',
    gameOver: false,
    roundHistory: [] as number[],
    lastBets: [] as Array<{ betType: string; amount: number }>,
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rebuildState = useCallback((): RouletteGameState => {
    const s = stateRef.current;
    const players = new Map<string, PlayerData>();
    players.set(SOLO_SESSION_ID, {
      playerId: SOLO_SESSION_ID,
      displayName: s.displayName,
      seatIndex: 0,
      isConnected: true,
      isReady: true,
      isHost: true,
      bankroll: s.bankroll,
      chipColor: 0,
      totalBetThisRound: s.totalBetThisRound,
      roundHistory: s.roundHistory,
      lastBets: s.lastBets.length > 0 ? JSON.stringify(s.lastBets) : '',
    });

    return {
      roomId: 'solo',
      roomCode: 'SOLO',
      status: s.gameOver ? 'finished' : 'in-progress',
      hostPlayerId: SOLO_SESSION_ID,
      phase: s.phase,
      winningNumber: s.winningNumber,
      timerSeconds: 0,
      minBet: 1,
      maxBet: 1000,
      betTime: 0,
      maxPlayers: 1,
      players,
      chips: [...s.chips],
      chatMessages: [],
      lastResults: [...s.lastResults],
      roundResult: s.roundResult,
    };
  }, []);

  const refresh = useCallback(() => {
    setGameState(rebuildState());
  }, [rebuildState]);

  // Initialize state on mount; clean up timers on unmount
  useEffect(() => {
    refresh();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createRoom = useCallback(async (displayName: string) => {
    stateRef.current.displayName = displayName || 'Player';
    refresh();
    return { roomCode: 'SOLO', roomId: 'solo', hostPlayerId: SOLO_SESSION_ID };
  }, [refresh]);

  const joinRoom = useCallback(async (_roomCode: string, displayName: string) => {
    stateRef.current.displayName = displayName || 'Player';
    setConnected(true);
    refresh();
    return { sessionId: SOLO_SESSION_ID };
  }, [refresh]);

  const startNextRound = useCallback(() => {
    const s = stateRef.current;
    // Snapshot last bets before clearing
    if (s.chips.length > 0) {
      s.lastBets = s.chips.map(c => ({ betType: c.betType, amount: c.amount }));
    }
    s.phase = 'BETTING';
    s.chips = [];
    s.winningNumber = -1;
    s.roundResult = '';
    s.totalBetThisRound = 0;
    refresh();
  }, [refresh]);

  const settleRound = useCallback((winningNumber: number) => {
    const s = stateRef.current;
    s.phase = 'SETTLEMENT';

    const chips = s.chips.map(c => ({
      playerId: c.playerId,
      betType: c.betType,
      amount: c.amount,
    }));

    const results = calculatePayouts(chips, winningNumber);
    const netProfit = calculateNetProfit(results, SOLO_SESSION_ID);

    s.bankroll += netProfit;
    if (s.bankroll < 0) s.bankroll = 0;

    s.totalBetThisRound = 0;

    // Track round history
    s.roundHistory.push(netProfit);
    if (s.roundHistory.length > 10) s.roundHistory = s.roundHistory.slice(-10);

    const resultSummary = results.map(r => ({
      playerId: r.playerId,
      name: s.displayName,
      betType: r.betType,
      amount: r.amount,
      won: r.won,
      payout: r.payout,
    }));

    s.roundResult = JSON.stringify({
      winningNumber,
      results: resultSummary,
    });

    s.lastResults.push(String(winningNumber));
    if (s.lastResults.length > 20) {
      s.lastResults.shift();
    }

    refresh();

    // Check for game over
    if (s.bankroll <= 0) {
      s.gameOver = true;
      refresh();
      return;
    }

    // After display time, start next round
    timerRef.current = setTimeout(() => {
      startNextRound();
    }, SETTLEMENT_DISPLAY_MS);
  }, [refresh, startNextRound]);

  const send = useCallback((type: string, data: any = {}) => {
    const s = stateRef.current;

    if (s.gameOver && type !== 'restart-solo') return;

    switch (type) {
      case 'place-bet': {
        if (s.phase !== 'BETTING') return;
        const { betType, amount } = data;
        const betAmount = Math.floor(amount);
        if (betAmount < 1 || !validateBet(betType)) return;
        const available = s.bankroll - s.totalBetThisRound;
        if (betAmount > available) return;

        s.totalBetThisRound += betAmount;
        s.chips.push({
          playerId: SOLO_SESSION_ID,
          chipColor: 0,
          amount: betAmount,
          betType,
        });
        refresh();
        break;
      }

      case 'remove-bet': {
        if (s.phase !== 'BETTING') return;
        const { chipIndex } = data;
        const chip = s.chips[chipIndex];
        if (!chip || chip.playerId !== SOLO_SESSION_ID) return;
        s.totalBetThisRound -= chip.amount;
        s.chips.splice(chipIndex, 1);
        refresh();
        break;
      }

      case 'clear-bets': {
        if (s.phase !== 'BETTING') return;
        s.chips = [];
        s.totalBetThisRound = 0;
        refresh();
        break;
      }

      case 'repeat-last-bet': {
        if (s.phase !== 'BETTING' || s.lastBets.length === 0) return;
        for (const bet of s.lastBets) {
          const available = s.bankroll - s.totalBetThisRound;
          if (bet.amount > available) continue;
          if (!validateBet(bet.betType)) continue;
          s.totalBetThisRound += bet.amount;
          s.chips.push({
            playerId: SOLO_SESSION_ID,
            chipColor: 0,
            amount: bet.amount,
            betType: bet.betType,
          });
        }
        refresh();
        break;
      }

      case 'spin-now': {
        if (s.phase !== 'BETTING') return;
        if (s.chips.length === 0) return;

        s.phase = 'SPINNING';

        // Generate winning number using crypto RNG
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        const winningNumber = array[0] % 38;
        s.winningNumber = winningNumber;

        refresh();

        // After spin animation, settle
        timerRef.current = setTimeout(() => {
          settleRound(winningNumber);
        }, SPIN_DURATION_MS);
        break;
      }

      case 'restart-solo': {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        stateRef.current = {
          bankroll: INITIAL_BANKROLL,
          totalBetThisRound: 0,
          chips: [],
          phase: 'BETTING',
          lastResults: [],
          winningNumber: -1,
          roundResult: '',
          displayName: stateRef.current.displayName,
          gameOver: false,
          roundHistory: [],
          lastBets: [],
        };
        refresh();
        break;
      }

      // No-ops for solo mode
      case 'chat':
      case 'swap-color':
      case 'update-settings':
        break;
    }
  }, [refresh, settleRound]);

  const leave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setConnected(false);
    setGameState(null);
  }, []);

  const autoJoin = useCallback((displayName: string) => joinRoom('SOLO', displayName), [joinRoom]);

  const detachRoom = useCallback(() => {}, []);

  return {
    gameState,
    connected,
    error,
    createRoom,
    autoJoin,
    send,
    leave,
    detachRoom,
    sessionId: SOLO_SESSION_ID,
  };
}
