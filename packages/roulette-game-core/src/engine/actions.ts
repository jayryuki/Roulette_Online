// packages/roulette-game-core/src/engine/actions.ts

export type PlayerAction =
  | { type: 'PLACE_BET'; betType: string; amount: number }
  | { type: 'REMOVE_BET'; chipIndex: number }
  | { type: 'CLEAR_BETS' }
  | { type: 'SPIN_NOW' }
  | { type: 'TOGGLE_READY' }
  | { type: 'CHOOSE_SEAT'; seatIndex: number }
  | { type: 'SWAP_COLOR'; targetIndex: number }
  | { type: 'START_ROUND' }
  | { type: 'UPDATE_SETTINGS'; minBet?: number; maxBet?: number; maxPlayers?: number; betTime?: number }
  | { type: 'CHAT'; text: string };
