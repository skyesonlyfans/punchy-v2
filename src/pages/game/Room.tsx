import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import Loadout from '../../components/game/Loadout';
import Gameplay from '../../components/game/Gameplay';

const functions = getFunctions();
const startGameCallable = httpsCallable(functions, 'startGame');

const RoomLobby = ({ room, isHost }: { room: DocumentData, isHost: boolean }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();

  const handleStartGame = async () => {
    if (!isHost || isLoading) return;
    setIsLoading(true);
    try {
      await startGameCallable({ roomCode: room.code });
    } catch (error: any) {
      console.error("Failed to start game:", error);
      alert(`Error starting game: ${error.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Private Room</h1>
        <p className="text-gray-400">Game Mode: {room.gameMode}</p>
        <div className="mt-4">
          <p className="text-gray-500">Share this code with a friend:</p>
          <p className="text-4xl font-bold text-accent tracking-[0.2em] bg-gray-900 p-3 rounded-lg inline-block">
            {room.code}
          </p>
        </div>
      </header>
      <main className="bg-gray-900 border-2 border-gray-700 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">Players ({room.players.length}/{room.maxPlayers})</h2>
        <div className="space-y-4">
          {room.players.map((player: any, index: number) => (
            <div key={player.uid} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-accent font-bold text-lg">{index + 1}.</span>
                <div>
                  <p className="text-xl">{player.username} {player.uid === room.hostId && '(Host)'}</p>
                  <p className="text-sm text-gray-400">{player.status}</p>
                </div>
              </div>
               {currentUser?.uid === player.uid && <span className="text-xs text-accent">[You]</span>}
            </div>
          ))}
          {Array.from({ length: room.maxPlayers - room.players.length }).map((_, index) => (
            <div key={`waiting-${index}`} className="flex items-center p-4 bg-gray-800 rounded-lg opacity-50">
              <p className="text-gray-500 animate-pulse">Waiting for player...</p>
            </div>
          ))}
        </div>
      </main>
      <footer className="mt-8 text-center">
        {isHost && room.players.length === room.maxPlayers && (
          <button
            onClick={handleStartGame}
            disabled={isLoading}
            className="px-12 py-4 bg-accent text-black text-2xl font-bold rounded-lg shadow-[0_0_15px_rgba(0,255,0,0.5)] hover:bg-white transition-all disabled:bg-gray-600"
          >
            {isLoading ? 'Starting...' : 'Start Game'}
          </button>
        )}
        {isHost && room.players.length < room.maxPlayers && (
          <p className="text-gray-500">Waiting for all players to join before starting...</p>
        )}
        {!isHost && (
          <p className="text-gray-500">Waiting for the host to start the game...</p>
        )}
      </footer>
    </div>
  );
};

const Room = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<DocumentData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roomCode || !currentUser) {
      if (!currentUser) navigate('/');
      else navigate('/play');
      return;
    }

    const upperCaseRoomCode = roomCode.toUpperCase();
    const roomRef = doc(db, 'game_rooms', upperCaseRoomCode);
    const unsubscribe = onSnapshot(roomRef, (docSnap) => {
      if (docSnap.exists()) {
        setRoom(docSnap.data());
        setError('');
      } else {
        setError('Room not found. It may have been closed or never existed.');
        setRoom(null);
      }
    }, (err) => {
      console.error("Error listening to room:", err);
      setError('Failed to connect to the room.');
    });

    return () => unsubscribe();
  }, [roomCode, navigate, currentUser]);

  const renderContent = () => {
    if (!room || !roomCode || !currentUser) return null;
    
    if (room.state === 'finished') {
        const winnerId = room.winnerId;
        const winner = room.players.find((p:any) => p.uid === winnerId);
        const isWinner = currentUser.uid === winnerId;
        return (
            <div className="text-center">
                <h1 className="text-5xl font-bold mb-4">{isWinner ? <span className="text-accent">VICTORY</span> : <span className="text-red-500">DEFEAT</span>}</h1>
                <p className="text-2xl">Winner: <span className="text-accent font-bold">{winner?.username || 'Unknown'}</span></p>
                <p className="text-gray-400 mt-2">{room.winReason}</p>
                <Link to="/play" className="mt-8 inline-block px-8 py-3 bg-accent text-black font-bold rounded-lg hover:bg-white transition-colors">
                    Back to Game Modes
                </Link>
            </div>
        )
    }

    switch (room.state) {
      case 'waiting':
        return <RoomLobby room={room} isHost={currentUser.uid === room.hostId} />;
      case 'loadout':
        const playerGameData = room.gameData?.[currentUser.uid];
        if (playerGameData?.loadout) {
            return <div className="text-center p-8 bg-gray-900 rounded-lg"><p className="text-2xl text-accent animate-pulse">Loadout confirmed. Waiting for opponent...</p></div>;
        }
        return <Loadout roomCode={roomCode} />;
      case 'in_progress':
        return <Gameplay room={room} />;
      default:
        return <p>Unknown room state: {room.state}</p>;
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <p className="text-red-500 text-xl mb-4">{error}</p>
        <Link to="/play/pvp" className="px-6 py-2 bg-accent text-black font-bold rounded-md hover:bg-white transition-colors">
          Back to Lobby
        </Link>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-accent text-xl animate-pulse">Connecting to room...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8 w-full">
      {renderContent()}
    </div>
  );
};

export default Room;
