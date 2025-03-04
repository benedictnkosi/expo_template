import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import Toast from 'react-native-toast-message';
import { updateLearner } from '@/services/api';

interface OnboardingData {
    grade: string;
    school: string;
    school_address: string;
    school_latitude: string;
    school_longitude: string;
    curriculum: string;
    difficultSubject: string;
    selectedPlan?: string;
}

interface RegisterFormProps {
    onboardingData?: OnboardingData;
}

export default function RegisterForm({ onboardingData }: RegisterFormProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { signUp } = useAuth();

    const handleRegister = async () => {
        if (!email || !password || !confirmPassword) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please fill in all fields',
                position: 'bottom'
            });
            return;
        }

        if (password !== confirmPassword) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Passwords do not match',
                position: 'bottom'
            });
            return;
        }

        setIsLoading(true);
        try {
            // Register the user
            const user = await signUp(email, password);

            // If we have onboarding data, update the learner profile
            if (onboardingData) {
                const learnerData = {
                    name: email.split('@')[0], // Use email username as initial name
                    grade: parseInt(onboardingData.grade),
                    school: onboardingData.school,
                    school_address: onboardingData.school_address || '',
                    school_latitude: parseFloat(onboardingData.school_latitude as string) || 0,
                    school_longitude: parseFloat(onboardingData.school_longitude as string) || 0,
                    curriculum: onboardingData.curriculum,
                    terms: "1,2,3,4",
                    email: email,
                };


                const learner = await updateLearner(user.uid, learnerData);
                if (learner.status !== 'OK') {
                    Toast.show({
                        type: 'error',
                        text1: 'Warning',
                        text2: 'Account created but failed to save preferences',
                        position: 'bottom'
                    });
                }
            }

            // Store auth token
            await SecureStore.setItemAsync('auth', JSON.stringify({ user }));

            // Navigate to tabs
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Registration error:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to create account',
                position: 'bottom'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />
            <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#94A3B8"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
            />
            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <ThemedText style={styles.buttonText}>Create Account</ThemedText>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        color: '#FFFFFF',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#4F46E5',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
}); 