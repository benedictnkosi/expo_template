import { router } from 'expo-router';

export async function handleAuthNavigation() {
    try {
        // TODO: Replace with your actual auth check
        const isAuthenticated = false; // temporary default value

        if (isAuthenticated) {
            setTimeout(() => {
                router.replace('/(tabs)');
            }, 0);
        } else {
            setTimeout(() => {
                router.replace('/login');
            }, 0);
        }
    } catch (error) {
        console.error('Error during navigation:', error);
    }
} 