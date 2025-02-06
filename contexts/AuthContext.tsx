import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getLearner } from '@/services/api';
import { router } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true, signOut: async () => { } });

const API_BASE_URL = 'https://prices.aluvefarm.co.za';

// Add function to create learner
async function createLearner(user: FirebaseUser) {
  try {
    await addDoc(collection(db, 'learners'), {
      uid: user.uid,
      email: user.email,
      createdAt: new Date(),
    });
    // Don't navigate here - let the auth state change handler handle navigation
  } catch (error) {
    console.error('Error creating learner:', error);
    throw error;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    // Initialize auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // User is signed in
          const learnerDoc = await getLearner(user.uid);
          if (!learnerDoc) {
            await createLearner(user);
          }
          setUser(user);
          setIsReady(true);
          // Use setTimeout to ensure layout is mounted
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 0);
        } else {
          // User is signed out
          setUser(null);
          setIsReady(true);
          setTimeout(() => {
            router.replace('/login');
          }, 0);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setIsReady(true);
      }
    });

    return unsubscribe;
  }, []);

  const authValue: AuthContextType = {
    user,
    isLoading: !isReady,
    signOut: async () => {
      await firebaseSignOut(auth);
    }
  };

  if (!isReady) return null;

  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 