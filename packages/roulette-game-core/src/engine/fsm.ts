// packages/roulette-game-core/src/engine/fsm.ts

export type PhaseType = 'LOBBY' | 'BETTING' | 'SPINNING' | 'SETTLEMENT' | 'ROUND_END';

export interface LobbyPhase { type: 'LOBBY'; }
export interface BettingPhase {
  type: 'BETTING';
  timerStartedAt: number;
  timerDurationMs: number;
}
export interface SpinningPhase { type: 'SPINNING'; }
export interface SettlementPhase { type: 'SETTLEMENT'; }
export interface RoundEndPhase { type: 'ROUND_END'; }

export type GamePhase =
  | LobbyPhase
  | BettingPhase
  | SpinningPhase
  | SettlementPhase
  | RoundEndPhase;

export const VALID_TRANSITIONS: Record<PhaseType, PhaseType[]> = {
  LOBBY:      ['BETTING'],
  BETTING:    ['SPINNING'],
  SPINNING:   ['SETTLEMENT'],
  SETTLEMENT: ['ROUND_END'],
  ROUND_END:  ['BETTING', 'LOBBY'],
};

export function canTransition(from: PhaseType, to: PhaseType): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function phaseType(phase: GamePhase): PhaseType {
  return phase.type;
}
