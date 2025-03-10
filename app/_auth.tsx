import { useEffect, useState } from 'react';
import { useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { getLearner } from '@/services/api';

export function useProtectedRoute() {
  const { user } = useAuth();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    async function checkProfile() {
      if (!user?.uid) return;

      try {
        const learner = await getLearner(user.uid);
        setHasProfile(!!learner.name && !!learner.grade);
      } catch (error) {
        console.log('Failed to fetch learner:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkProfile();
  }, [user]);

  useEffect(() => {
    if (isLoading) return;
  }, [user, segments, isLoading, hasProfile]);
}

export default function AuthLayout() {
  useProtectedRoute();
  return null;
} 