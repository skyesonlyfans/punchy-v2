import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const purchaseStatusCallable = httpsCallable(functions, 'purchaseStatus');

const statusTiers = [
  { name: 'Skid 🎓', cost: 0, description: 'I’m sure you have lots of $BS tokens :3' },
  { name: 'Greyhat 💻', cost: 1, description: 'you’re getting it, fs.' },
  { name: 'Dev 🔏', cost: 10, description: 'Mom!!! He’s hacking!' },
  { name: 'Blackhat 🎩', cost: 50, description: 'The CIA is knocking, son.' },
  { name: '+1 Prestige', cost: 100, description: 'Call me… (555) 555-SKYE <3' },
];

const Wallet = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const walletAddress = React.useMemo(() => '0x' + [...Array(40)].map(() => Math.floor(Math.random() * 16).toString(16)).join(''), []);

  useEffect(() => {
    if (!loading && !currentUser) {
      navigate('/');
    }
  }, [currentUser, loading, navigate]);

  const handlePurchase = async (itemName: string, cost: number) => {
    if (!currentUser || isProcessing) return;

    setIsProcessing(itemName);
    setFeedback(null);

    try {
      const result = await purchaseStatusCallable({ itemName, cost });
      setFeedback({ type: 'success', message: (result.data as any).message });
      // Note: Firestore listeners should update the UI automatically.
      // No need to manually update state here.
    } catch (error: any) {
      console.error("Purchase failed:", error);
      setFeedback({ type: 'error', message: error.message || 'An unknown error occurred.' });
    } finally {
      setIsProcessing(null);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-accent text-xl">Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-4xl">
        <header className="flex items-center justify-between mb-8">
          <Link to="/" className="text-accent hover:underline">
            &lt; Back to Menu
          </Link>
          <h1 className="text-3xl font-bold text-center">BTC Wallet 💳</h1>
          <div className="w-24"></div>
        </header>

        {feedback && (
          <div className={`p-4 mb-4 text-center rounded-lg ${feedback.type === 'success' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
            {feedback.message}
          </div>
        )}

        <section className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl text-accent">{currentUser.username}</h2>
              <p className="text-gray-400">{currentUser.status} {currentUser.prestige > 0 && `+${currentUser.prestige}`}</p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-gray-400 text-sm">Balance</p>
              <p className="text-3xl font-bold">{currentUser.btc_balance.toFixed(4)} $BTC</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500">Wallet Address</p>
            <p className="text-sm text-gray-300 break-all">{walletAddress}</p>
          </div>
        </section>

        <section>
          <h3 className="text-2xl font-bold mb-4 text-center">Status Store</h3>
          <div className="space-y-4">
            {statusTiers.map((item) => (
              <div key={item.name} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between">
                <div className="flex-1 mb-4 sm:mb-0">
                  <p className="text-xl font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-400 italic">"{item.description}"</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-lg text-accent font-bold w-24 text-right">{item.cost > 0 ? `${item.cost} $BTC` : 'Owned'}</p>
                  <button
                    onClick={() => handlePurchase(item.name, item.cost)}
                    disabled={item.cost === 0 || currentUser.isGuest || currentUser.btc_balance < item.cost || !!isProcessing}
                    className="px-6 py-2 w-32 text-center bg-accent text-black font-bold rounded-md disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-white transition-colors"
                  >
                    {isProcessing === item.name ? '...' : 'Purchase'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Wallet;
