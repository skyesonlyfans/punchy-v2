import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createPrivateRoomCallable = httpsCallable(functions, 'createPrivateRoom');
const joinPrivateRoomCallable = httpsCallable(functions, 'joinPrivateRoom');

const PvpLobby = () => {
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await createPrivateRoomCallable();
      const { roomCode } = result.data as { roomCode: string };
      navigate(`/room/${roomCode}`);
    } catch (err: any) {
      console.error("Failed to create room:", err);
      setError(err.message || 'An unknown error occurred.');
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || joinCode.length < 6) {
      setError('Please enter a valid 6-character room code.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const result = await joinPrivateRoomCallable({ roomCode: joinCode });
      const { roomCode: joinedCode } = result.data as { roomCode: string };
      navigate(`/room/${joinedCode}`);
    } catch (err: any) {
      console.error("Failed to join room:", err);
      setError(err.message || 'An unknown error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md">
        <header className="flex items-center justify-between mb-12">
          <Link to="/play" className="text-accent hover:underline">
            &lt; Back to Modes
          </Link>
          <h1 className="text-2xl font-bold text-center">Private Match</h1>
          <div className="w-28"></div> {/* Spacer */}
        </header>

        {error && (
          <div className="p-4 mb-6 text-center rounded-lg bg-red-900 text-red-200">
            {error}
          </div>
        )}

        <main className="space-y-8">
          {/* Create Room Section */}
          <section className="bg-gray-900 border-2 border-gray-700 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold mb-4">Create a New Room</h2>
            <p className="text-gray-400 mb-6">Generate a unique code to invite a friend.</p>
            <button
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="w-full px-8 py-3 bg-accent text-black text-lg font-bold rounded-lg hover:bg-white transition-colors disabled:bg-gray-600"
            >
              {isLoading ? 'Creating...' : 'Create Room'}
            </button>
          </section>

          <div className="flex items-center">
            <hr className="flex-grow border-gray-600" />
            <span className="mx-4 text-gray-400">OR</span>
            <hr className="flex-grow border-gray-600" />
          </div>

          {/* Join Room Section */}
          <section className="bg-gray-900 border-2 border-gray-700 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold mb-4">Join an Existing Room</h2>
            <form onSubmit={handleJoinRoom}>
              <input
                type="text"
                placeholder="ENTER 6-CHARACTER CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full p-4 mb-4 text-center text-xl tracking-[0.2em] font-bold bg-gray-800 border-2 border-gray-600 rounded-md focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={isLoading || joinCode.length < 6}
                className="w-full px-8 py-3 bg-accent text-black text-lg font-bold rounded-lg hover:bg-white transition-colors disabled:bg-gray-600"
              >
                {isLoading ? 'Joining...' : 'Join Room'}
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
};

export default PvpLobby;
