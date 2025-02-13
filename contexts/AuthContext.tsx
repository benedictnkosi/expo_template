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
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signOut: async () => { },
  refreshProfile: async () => { }
});

const API_BASE_URL = 'https://api.examquiz.co.za';
//const API_BASE_URL = 'http://127.0.0.1:8000';

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

  // Add function to check profile
  const checkProfile = async (uid: string) => {
    try {
      const learnerDoc = await getLearner(uid);
      setHasProfile(!!learnerDoc?.name && !!learnerDoc?.grade);
    } catch (error) {
      console.error('Failed to check profile:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          await checkProfile(user.uid);
        } else {
          setHasProfile(false);
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

  // Export checkProfile to be used after profile updates
  const authValue = {
    user,
    isLoading,
    signOut: async () => {
      await firebaseSignOut(auth);
    },
    refreshProfile: async () => {
      if (user?.uid) {
        await checkProfile(user.uid);
      }
    }
  };

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 