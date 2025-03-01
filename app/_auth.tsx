import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';


export function useProtectedRoute() {
  const router = useRouter();
  const segments = useSegments();

  return null;
}

export default function AuthLayout() {
  useProtectedRoute();
  return null;
} 