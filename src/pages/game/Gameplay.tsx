import React, { useState, useMemo } from 'react';
import { DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../../contexts/AuthContext';

const functions = getFunctions();
const useToolCallable = httpsCallable(functions, 'useTool');

// --- Helper Components ---

const SystemIntegrityBar = ({ integrity }: { integrity: number }) => {
  const width = Math.max(0, Math.min(100, integrity));
  const color = integrity > 60 ? 'bg-accent' : integrity > 30 ? 'bg-yellow-500' : 'bg-red-600';
  return (
    <div className="w-full bg-gray-700 rounded-full h-6 border-2 border-gray-500">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${width}%` }}
      >
        <span className="text-sm font-bold text-black pl-2">{integrity}%</span>
      </div>
    </div>
  );
};

const ToolButton = ({ toolName, onClick, disabled }: { toolName: string, onClick: () => void, disabled: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-full p-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-center hover:border-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-gray-600"
  >
    <p className="font-bold text-lg">{toolName}</p>
  </button>
);


// --- Main Gameplay Component ---

interface GameplayProps {
  room: DocumentData;
}

const Gameplay: React.FC<GameplayProps> = ({ room }) => {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { player, opponent } = useMemo(() => {
    if (!currentUser || !room.gameData) return { player: null, opponent: null };
    const opponentId = room.players.find((p: any) => p.uid !== currentUser.uid)?.uid;
    return {
      player: { id: currentUser.uid, ...room.gameData[currentUser.uid], ...room.players.find((p:any) => p.uid === currentUser.uid) },
      opponent: opponentId ? { id: opponentId, ...room.gameData[opponentId], ...room.players.find((p:any) => p.uid === opponentId) } : null,
    };
  }, [room, currentUser]);

  const handleUseTool = async (toolName: string) => {
    if (isSubmitting) return;
    setIsSubmitting(toolName);
    setError('');
    try {
      await useToolCallable({ roomCode: room.code, toolName });
    } catch (err: any) {
      setError(err.message || "Failed to use tool.");
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSubmitting(null);
    }
  };

  if (!player || !opponent) {
    return <p className="text-center text-red-500">Error loading player data.</p>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <header className="text-center mb-8">
        <h1 className="text-4xl text-red-500 font-bold animate-pulse">ENGAGED</h1>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </header>

      <div className="grid md:grid-cols-2 gap-4 md:gap-8">
        {/* Player Panel */}
        <div className="bg-gray-900 border-2 border-green-500/50 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-accent">{player.username} (You)</h2>
          <p className="text-sm text-gray-400 mb-4">{player.status}</p>
          <SystemIntegrityBar integrity={player.systemIntegrity} />
          <div className="mt-6">
            <h3 className="font-bold text-lg mb-2 text-green-400">Defense Grid</h3>
            <div className="grid grid-cols-2 gap-4">
              {player.loadout.defense.map((tool: string) => (
                <ToolButton key={tool} toolName={tool} onClick={() => handleUseTool(tool)} disabled={!!isSubmitting} />
              ))}
            </div>
            <h3 className="font-bold text-lg mt-4 mb-2 text-red-400">Attack Tools</h3>
            <div className="grid grid-cols-2 gap-4">
              {player.loadout.attack.map((tool: string) => (
                <ToolButton key={tool} toolName={tool} onClick={() => handleUseTool(tool)} disabled={!!isSubmitting} />
              ))}
            </div>
          </div>
        </div>

        {/* Opponent Panel */}
        <div className="bg-gray-900 border-2 border-gray-700 rounded-lg p-6">
          <h2 className="text-2xl font-bold">{opponent.username}</h2>
          <p className="text-sm text-gray-400 mb-4">{opponent.status}</p>
          <SystemIntegrityBar integrity={opponent.systemIntegrity} />
           <div className="mt-6 opacity-30">
            <h3 className="font-bold text-lg mb-2 text-gray-500">Opponent Grid</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-800 border-2 border-gray-600 rounded-lg h-16 animate-pulse"></div>
                <div className="p-3 bg-gray-800 border-2 border-gray-600 rounded-lg h-16 animate-pulse"></div>
                <div className="p-3 bg-gray-800 border-2 border-gray-600 rounded-lg h-16 animate-pulse"></div>
                <div className="p-3 bg-gray-800 border-2 border-gray-600 rounded-lg h-16 animate-pulse"></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Gameplay;
