import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useRouter, useSegments } from 'expo-router';
import { getLearner } from '@/services/api';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signOut: async () => {}
});

const API_BASE_URL = 'https://api.examquiz.co.za';
//const API_BASE_URL = 'http://127.0.0.1:8000';

// Add function to create learner
async function createLearner(user: User) {
  try {
    await addDoc(collection(db, 'learners'), {
      uid: user.uid,
      email: user.email,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error creating learner:', error);
    throw error;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inLoginScreen = segments.join('/') === 'login';
    const inRegisterScreen = segments.join('/') === 'register';
    const inForgotPasswordScreen = segments.join('/') === 'forgot-password';

    if (!user && !inLoginScreen && !inRegisterScreen && !inForgotPasswordScreen) {
      router.replace('/login');
    } else if (user && (inAuthGroup || inLoginScreen || inRegisterScreen || inForgotPasswordScreen)) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  const signOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 