import { createContext, useContext, useEffect, useState } from 'react';
import { User, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useRouter, useSegments } from 'expo-router';
import { getLearner } from '@/services/api';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { identifyUser } from '@/services/mixpanel';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signOut: async () => { },
  signUp: async () => { throw new Error('AuthContext not initialized'); }
});

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
    // Check for stored session on mount
    AsyncStorage.getItem('user').then(savedUser => {
      if (savedUser) setUser(JSON.parse(savedUser));
    });

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
      if (user) {
        AsyncStorage.setItem('user', JSON.stringify(user));
        identifyUser(user.uid, {
          email: user.email,
          name: user.displayName
        });
      } else {
        AsyncStorage.removeItem('user');
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inLoginScreen = segments.join('/') === 'login';
    const inRegisterScreen = segments.join('/') === 'register';
    const inForgotPasswordScreen = segments.join('/') === 'forgot-password';
    const inOnboardingScreen = segments.join('/') === 'onboarding';

    if (!user && !inLoginScreen && !inRegisterScreen && !inForgotPasswordScreen && !inOnboardingScreen) {
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

  const signUp = async (email: string, password: string) => {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    return user;
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut, signUp }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 