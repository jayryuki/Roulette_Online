// apps/web/src/components/ChipTray.tsx

interface ChipTrayProps {
  selectedAmount: number;
  onSelectAmount: (amount: number) => void;
  onClearBets: () => void;
  canBet: boolean;
}

const DENOMINATIONS = [1, 5, 25, 100, 500];

const CHIP_STYLES: Record<number, string> = {
  1: 'bg-white text-gray-900 border-gray-300',
  5: 'bg-red-600 text-white border-red-400',
  25: 'bg-green-600 text-white border-green-400',
  100: 'bg-gray-800 text-white border-gray-600',
  500: 'bg-purple-700 text-white border-purple-400',
};

export default function ChipTray({ selectedAmount, onSelectAmount, onClearBets, canBet }: ChipTrayProps) {
  return (
    <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
      <div className="flex gap-2">
        {DENOMINATIONS.map(denom => (
          <button
            key={denom}
            onClick={() => onSelectAmount(denom)}
            disabled={!canBet}
            className={`w-12 h-12 rounded-full border-2 font-bold text-sm transition-all ${
              CHIP_STYLES[denom]
            } ${
              selectedAmount === denom
                ? 'ring-2 ring-yellow-400 scale-110 shadow-lg'
                : 'hover:scale-105'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            ${denom}
          </button>
        ))}
      </div>
      <button
        onClick={onClearBets}
        disabled={!canBet}
        className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-gray-700 text-white rounded-lg text-sm font-semibold transition"
      >
        Clear Bets
      </button>
    </div>
  );
}
