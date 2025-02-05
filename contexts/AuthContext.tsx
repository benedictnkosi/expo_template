import { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getLearner } from '@/services/api';

interface AuthContextType {
  user: FirebaseUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true, signOut: async () => { } });

const API_BASE_URL = 'https://prices.aluvefarm.co.za';

// Add function to create learner
async function createLearner(uid: string, router: any) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/public/learn/learner/create`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create learner');
    }

    router.replace('/(tabs)');
  } catch (error) {
    console.error('Error creating learner:', error);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Create learner when user signs in
        await createLearner(user.uid, router);
      }
      setUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [router]);

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error; // Re-throw to handle in the UI
    }
  };

  // Don't render children until we've checked auth state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6B4EFF" />
      </View>
    );
  }

  return <AuthContext.Provider value={{ user, isLoading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
} 