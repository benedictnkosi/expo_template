import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { identifyUser } from '@/services/mixpanel';
import * as SecureStore from 'expo-secure-store';

export interface GoogleUser {
  id: string;
  uid: string;
  email: string;
  name: string;
  picture?: string;
  role?: 'admin' | 'learner';
}

interface AuthContextType {
  user: GoogleUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signOut: async () => { }
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for stored auth on mount
    SecureStore.getItemAsync('auth').then(savedAuth => {
      if (savedAuth) {
        const { userInfo } = JSON.parse(savedAuth);
        setUser({
          id: userInfo.id,
          uid: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          role: userInfo.email.endsWith('@admin.com') ? 'admin' : 'learner' // Simple role check based on email
        });
        identifyUser(userInfo.id, {
          email: userInfo.email,
          name: userInfo.name,
          role: userInfo.email.endsWith('@admin.com') ? 'admin' : 'learner'
        });
      }
      setIsLoading(false);
    });
  }, []);

  const signOut = async () => {
    try {
      await SecureStore.deleteItemAsync('auth');
      setUser(null);
      router.replace('/login');
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