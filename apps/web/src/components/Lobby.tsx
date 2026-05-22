// apps/web/src/components/Lobby.tsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRouletteRoom } from '../hooks/useRouletteRoom';

export default function Lobby() {
  const navigate = useNavigate();
  const { createRoom, joinRoom, error } = useRouletteRoom();
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setLoading(true);
    const data = await createRoom(displayName.trim());
    if (data) navigate(`/game/${data.roomCode}?name=${encodeURIComponent(displayName)}`);
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!displayName.trim() || !joinCode.trim()) return;
    setLoading(true);
    const room = await joinRoom(joinCode.trim().toUpperCase(), displayName.trim());
    if (room) navigate(`/game/${joinCode.trim().toUpperCase()}?name=${encodeURIComponent(displayName)}`);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full shadow-2xl border border-gray-700">
        <h1 className="text-3xl font-bold text-center mb-8 text-white">
          Roulette Online
        </h1>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={16}
              placeholder="Enter your name"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !displayName.trim()}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition"
          >
            Create New Room
          </button>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-600" />
            <span className="text-gray-400 text-sm">or join</span>
            <div className="flex-1 h-px bg-gray-600" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Room Code</label>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="ABC123"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono tracking-widest text-center"
            />
          </div>

          <button
            onClick={handleJoin}
            disabled={loading || !displayName.trim() || !joinCode.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition"
          >
            Join Room
          </button>
        </div>

        {error && (
          <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
