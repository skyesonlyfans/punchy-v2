import React from 'react';
import { Link } from 'react-router-dom';

const gameModes = [
  { title: 'PvP (Private Match)', description: 'Challenge a friend directly.', path: '/play/pvp' },
  { title: 'Quick Play ($$$)', description: 'Risk your $BTC in a 1v1 match.', path: '/play/quick-money' },
  { title: 'Quick Play (Casual)', description: 'Hone your skills without the risk.', path: '/play/quick-casual' },
  { title: 'PvA (Botnet Battle)', description: 'A free-for-all against 2+ opponents.', path: '/play/pva' },
  { title: 'CtF ($$$)', description: 'Solve a persistent puzzle for a growing reward.', path: '/play/ctf' },
];

const Play = () => {
  return (
    <div className="flex flex-col items-center min-h-screen p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <Link to="/" className="text-accent hover:underline">
            &lt; Back to Menu
          </Link>
          <h1 className="text-3xl font-bold text-center">Select Mode</h1>
          <div className="w-24"></div> {/* Spacer */}
        </header>

        {/* Game Mode Selection */}
        <main className="space-y-4">
          {gameModes.map((mode) => (
            <Link
              key={mode.title}
              to={mode.path}
              className="block p-6 bg-gray-900 border-2 border-gray-700 rounded-lg hover:border-accent hover:bg-gray-800 transition-all duration-200"
            >
              <h2 className="text-2xl font-bold text-accent">{mode.title}</h2>
              <p className="text-gray-400 mt-1">{mode.description}</p>
            </Link>
          ))}
        </main>
      </div>
    </div>
  );
};

export default Play;
