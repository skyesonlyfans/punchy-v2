import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FirebaseError } from 'firebase/app';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { 
    loginWithGoogle, 
    loginAsGuest, 
    signupWithEmail, 
    loginWithEmail 
  } = useAuth();
  
  const [isCreateAccount, setIsCreateAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleAction = async (action: () => Promise<any>) => {
    setError('');
    setIsProcessing(true);
    try {
      await action();
      onClose();
    } catch (e) {
      if (e instanceof FirebaseError) {
        setError(e.message.replace('Firebase: ', '').replace(`(${e.code})`, ''));
      } else {
        setError('An unexpected error occurred.');
      }
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const action = isCreateAccount 
      ? () => signupWithEmail(email, password) 
      : () => loginWithEmail(email, password);
    handleAction(action);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 border-2 border-accent rounded-lg p-8 w-full max-w-sm m-4 text-white shadow-[0_0_20px_rgba(0,255,0,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-center mb-6">{isCreateAccount ? 'Create Account' : 'Login'}</h2>

        <div className="space-y-4 mb-6">
          <button 
            onClick={() => handleAction(loginWithGoogle)}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gray-800 border border-gray-600 rounded-lg hover:border-accent transition-colors disabled:opacity-50"
          >
            Sign in with Google
          </button>
          <button 
            onClick={() => handleAction(loginAsGuest)}
            disabled={isProcessing}
            className="w-full py-3 px-4 bg-gray-800 border border-gray-600 rounded-lg hover:border-accent transition-colors disabled:opacity-50"
          >
            Play as Guest
          </button>
        </div>

        <div className="flex items-center my-6">
          <hr className="flex-grow border-gray-600" />
          <span className="mx-4 text-gray-400">OR</span>
          <hr className="flex-grow border-gray-600" />
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <input 
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:border-accent"
            required
          />
          <input 
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:border-accent"
            required
          />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button 
            type="submit"
            disabled={isProcessing}
            className="w-full py-3 bg-accent text-black font-bold rounded-md hover:bg-white transition-colors disabled:bg-gray-600"
          >
            {isProcessing ? 'Processing...' : (isCreateAccount ? 'Create Account' : 'Login')}
          </button>
        </form>

        <p className="text-center mt-6 text-sm">
          {isCreateAccount ? 'Already have an account? ' : "Don't have an account? "}
          <button 
            onClick={() => {
              setIsCreateAccount(!isCreateAccount);
              setError('');
            }} 
            className="text-accent hover:underline"
            disabled={isProcessing}
          >
            {isCreateAccount ? 'Login' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginModal;
