import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getLearner } from '@/services/api';

export function useProtectedRoute() {
  const { user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    async function checkProfile() {
      if (!user?.uid) return;

      try {
        const learner = await getLearner(user.uid);
        setHasProfile(!!learner.name && !!learner.grade);
      } catch (error) {
        console.error('Failed to fetch learner:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkProfile();
  }, [user]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)' || segments.join('/') === 'login';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && !hasProfile && !segments.join('/').includes('onboarding/welcome')) {
      console.log('Replacing to /(auth)/onboarding/welcome');
      router.replace('/(auth)/onboarding/welcome');
    } else if (user && hasProfile && inAuthGroup) {
      console.log('Replacing to /(tabs)');
      router.replace('/(tabs)');
    }
  }, [user, segments, isLoading, hasProfile]);
}

export default function AuthLayout() {
  useProtectedRoute();
  return null;
} 