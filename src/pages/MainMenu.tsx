import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from '../components/LoginModal';

const MainMenu = () => {
  const { currentUser, logout } = useAuth();
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/'); // Navigate to home to refresh state if needed
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const isGuest = currentUser?.isGuest ?? false;

  return (
    <>
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setLoginModalOpen(false)} />
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        {/* Auth Status */}
        <div className="absolute top-4 right-4 text-right">
          {currentUser ? (
            <div>
              <p className="text-accent">{currentUser.username}</p>
              <p className="text-xs text-gray-400">{currentUser.status}</p>
              <button onClick={handleLogout} className="mt-1 text-xs text-red-500 hover:underline">
                [Logout]
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLoginModalOpen(true)}
              className="px-4 py-2 border border-accent text-accent rounded-md hover:bg-accent hover:text-black transition-colors"
            >
              Login
            </button>
          )}
        </div>

        {/* Game Title */}
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold">
            Punchy V2™ 🥊📱 by Skye &lt;3
          </h1>
        </header>

        {/* Main Actions */}
        <main className="flex flex-col items-center space-y-6">
          <Link
            to="/play"
            className="w-64 text-center px-8 py-4 bg-accent text-black text-2xl font-bold rounded-lg shadow-[0_0_15px_rgba(0,255,0,0.5)] hover:bg-white hover:shadow-[0_0_25px_rgba(0,255,0,0.8)] transition-all duration-300"
          >
            Play
          </Link>
          <Link
            to={isGuest ? '#' : '/wallet'}
            className={`w-64 flex items-center justify-between px-6 py-3 bg-gray-800 border border-gray-600 rounded-lg transition-colors ${
              isGuest
                ? 'cursor-not-allowed opacity-50'
                : 'hover:border-accent'
            }`}
            onClick={(e) => {
              if (isGuest) {
                e.preventDefault();
                alert('Guests cannot have a wallet. Please create an account.');
              }
            }}
          >
            <span className="font-semibold text-lg">BTC Wallet</span>
            <span className="text-2xl">💳</span>
          </Link>
        </main>

        <footer className="absolute bottom-4 text-xs text-gray-600">
          <p>v1.0.0 // Alpha</p>
        </footer>
      </div>
    </>
  );
};

export default MainMenu;
