import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const selectLoadoutCallable = httpsCallable(functions, 'selectLoadout');

const attackToolsList = ['Worm', 'Trojan', 'BruteForce', 'DDoS'];
const defenseToolsList = ['Firewall', 'HoneyPot', 'AntiVirus', 'Encryption'];

interface LoadoutProps {
  roomCode: string;
}

const Loadout: React.FC<LoadoutProps> = ({ roomCode }) => {
  const [selectedAttack, setSelectedAttack] = useState<string[]>([]);
  const [selectedDefense, setSelectedDefense] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleToolSelect = (tool: string, type: 'attack' | 'defense') => {
    const list = type === 'attack' ? selectedAttack : selectedDefense;
    const setList = type === 'attack' ? setSelectedAttack : setSelectedDefense;
    
    if (list.includes(tool)) {
      setList(list.filter(t => t !== tool));
    } else if (list.length < 2) {
      setList([...list, tool]);
    }
  };

  const handleSubmitLoadout = async () => {
    if (selectedAttack.length !== 2 || selectedDefense.length !== 2) {
      setError('You must select exactly 2 attack and 2 defense tools.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
        const result = await selectLoadoutCallable({
            roomCode,
            attackTools: selectedAttack,
            defenseTools: selectedDefense,
        });
        setFeedback((result.data as any).message);
    } catch (err: any) {
        setError(err.message || 'Failed to submit loadout.');
        setIsSubmitting(false);
    }
  };

  const renderToolList = (tools: string[], selected: string[], type: 'attack' | 'defense') => (
    <div className="grid grid-cols-2 gap-4">
      {tools.map(tool => {
        const isSelected = selected.includes(tool);
        return (
          <button
            key={tool}
            onClick={() => handleToolSelect(tool, type)}
            disabled={isSubmitting || feedback !== ''}
            className={`p-4 border-2 rounded-lg text-center transition-all ${
              isSelected
                ? 'bg-accent text-black border-accent'
                : 'bg-gray-800 border-gray-600 hover:border-accent'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <p className="font-bold">{tool}</p>
          </button>
        );
      })}
    </div>
  );

  if (feedback) {
      return (
        <div className="text-center p-8 bg-gray-900 rounded-lg">
            <p className="text-2xl text-accent animate-pulse">{feedback}</p>
        </div>
      )
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">Select Loadout</h1>
        <p className="text-gray-400 text-center mb-8">Choose your weapons for the upcoming battle.</p>
        
        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-900 p-6 rounded-lg border-2 border-red-500/50">
                <h2 className="text-xl font-bold mb-4 text-red-400">Attack Tools (Choose 2)</h2>
                {renderToolList(attackToolsList, selectedAttack, 'attack')}
            </div>
            <div className="bg-gray-900 p-6 rounded-lg border-2 border-green-500/50">
                <h2 className="text-xl font-bold mb-4 text-green-400">Defense Tools (Choose 2)</h2>
                {renderToolList(defenseToolsList, selectedDefense, 'defense')}
            </div>
        </div>

        <div className="mt-8 text-center">
            <button
                onClick={handleSubmitLoadout}
                disabled={selectedAttack.length !== 2 || selectedDefense.length !== 2 || isSubmitting}
                className="px-12 py-4 bg-accent text-black text-xl font-bold rounded-lg shadow-[0_0_15px_rgba(0,255,0,0.5)] hover:bg-white transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                Confirm Loadout & Engage
            </button>
        </div>
    </div>
  );
};

export default Loadout;
