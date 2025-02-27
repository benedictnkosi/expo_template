import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';


export function useProtectedRoute() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    async function checkAuth() {
      try {
        const authData = await SecureStore.getItemAsync('auth');
        const inAuthGroup = segments[0] === 'login'

        if (!authData && !inAuthGroup) {
          console.log('No auth data, redirecting to login');
          router.replace('/login');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    }

    checkAuth();
  }, [segments]);

  return null;
}

export default function AuthLayout() {
  useProtectedRoute();
  return null;
} 