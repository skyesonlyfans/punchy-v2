import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Define the shape of our user data in Firestore
export interface UserProfile {
  uid: string;
  username: string;
  status: string;
  prestige: number;
  btc_balance: number;
  isGuest: boolean;
  createdAt: any; // Using 'any' for serverTimestamp flexibility
}

// Define the shape of the context value
interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  signupWithEmail: (email: string, password: string) => Promise<any>;
  loginWithEmail: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to create a user profile in Firestore
  const createUserProfile = async (user: User, username: string, isGuest: boolean = false) => {
    const userRef = doc(db, 'users', user.uid);
    const userProfile: UserProfile = {
      uid: user.uid,
      username: username,
      status: 'Skid 🎓',
      prestige: 0,
      btc_balance: 0,
      isGuest: isGuest,
      createdAt: serverTimestamp(),
    };
    await setDoc(userRef, userProfile);
    return userProfile;
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google login failed:", error);
      throw error;
    }
  };
  
  const loginAsGuest = async () => {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Guest login failed:", error);
      throw error;
    }
  };

  const signupWithEmail = async (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithEmail = async (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
          setCurrentUser(docSnap.data() as UserProfile);
        } else {
          const username = user.isAnonymous 
            ? `Guest-${user.uid.substring(0, 6)}` 
            : user.email?.split('@')[0] || `User-${user.uid.substring(0, 6)}`;
          const newUserProfile = await createUserProfile(user, username, user.isAnonymous);
          setCurrentUser(newUserProfile);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    loading,
    loginWithGoogle,
    loginAsGuest,
    signupWithEmail,
    loginWithEmail,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
