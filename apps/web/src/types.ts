// apps/web/src/types.ts

export interface ChipData {
  playerId: string;
  chipColor: number;
  amount: number;
  betType: string;
}

export interface PlayerData {
  playerId: string;
  displayName: string;
  seatIndex: number;
  isConnected: boolean;
  isReady: boolean;
  isHost: boolean;
  bankroll: number;
  chipColor: number;
  totalBetThisRound: number;
  roundHistory: number[];
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface RouletteGameState {
  roomId: string;
  roomCode: string;
  status: string;
  hostPlayerId: string;
  phase: string;
  winningNumber: number;
  timerSeconds: number;
  minBet: number;
  maxBet: number;
  betTime: number;
  maxPlayers: number;
  players: Map<string, PlayerData>;
  chips: ChipData[];
  chatMessages: ChatMessage[];
  lastResults: string[];
  roundResult: string;
}
