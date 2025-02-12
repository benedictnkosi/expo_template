import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useRouter, useSegments } from 'expo-router';
import { getLearner } from '@/services/api';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signOut: async () => { }
});

//const API_BASE_URL = 'https://prices.aluvefarm.co.za';
const API_BASE_URL = 'http://127.0.0.1:8000';

// Add function to create learner
async function createLearner(user: FirebaseUser) {
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
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          const learnerDoc = await getLearner(user.uid);
          if (!learnerDoc) {
            await createLearner(user);
          }
          setHasProfile(!!learnerDoc?.name && !!learnerDoc?.grade);
        }
        setUser(user);
      } catch (error) {
        console.error('Auth state change error:', error);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inLoginScreen = segments.join('/') === 'login';
    const inOnboarding = segments.join('/').includes('onboarding');

    if (!user && !inLoginScreen) {
      router.replace('/login');
    } else if (user && !hasProfile && !inOnboarding) {
      router.replace('/(auth)/onboarding/welcome');
    } else if (user && hasProfile && (inAuthGroup || inLoginScreen)) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments, hasProfile]);

  const authValue: AuthContextType = {
    user,
    isLoading,
    signOut: async () => {
      await firebaseSignOut(auth);
    }
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 