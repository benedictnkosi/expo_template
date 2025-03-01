import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export interface GoogleUser {
    id: string;
    uid: string;
    email: string;
    name: string;
    picture?: string;
}

interface AuthContextType {
    user: GoogleUser | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<GoogleUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadUser();
    }, []);

    async function loadUser() {
        try {
            const authData = await SecureStore.getItemAsync('auth');
            if (authData) {
                const parsed = JSON.parse(authData);
                setUser(parsed.userInfo);
            }
        } catch (error) {
            console.error('Error loading user:', error);
        } finally {
            setIsLoading(false);
        }
    }

    async function signOut() {
        try {
            await SecureStore.deleteItemAsync('auth');
            setUser(null);
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }

    return (
        <AuthContext.Provider value={{ user, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
} 