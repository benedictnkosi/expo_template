import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import Toast from 'react-native-toast-message';
import { createLearner } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingData } from '../onboarding';
import { analytics } from '@/services/analytics';

interface RegisterFormProps {
    onboardingData: OnboardingData;
}

export default function RegisterForm({ onboardingData }: RegisterFormProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const { signUp } = useAuth();

    const logAnalyticsEvent = async (eventName: string, params: {
        user_id: string;
        email: string;
        error?: string;
    }) => {
        try {
            await analytics.track(eventName, params);
        } catch (error) {
            console.error('Analytics error:', error);
        }
    };

    const handleRegister = async () => {
        if (!name || !email || !password || !confirmPassword) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please fill in all fields',
                position: 'bottom'
            });
            return;
        }

        if (password.length < 6) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Password must be at least 6 characters',
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
                    name: name,
                    grade: parseInt(onboardingData.grade),
                    school: onboardingData.school,
                    school_address: onboardingData.school_address || '',
                    school_latitude: parseFloat(onboardingData.school_latitude as string) || 0,
                    school_longitude: parseFloat(onboardingData.school_longitude as string) || 0,
                    curriculum: onboardingData.curriculum,
                    terms: "1,2,3,4",
                    email: email,
                    avatar: onboardingData.avatar,
                };


                const learner = await createLearner(user.uid, learnerData);
                if (learner.status !== 'OK') {

                    Toast.show({
                        type: 'error',
                        text1: 'Warning',
                        text2: 'Account created but failed to save preferences',
                        position: 'bottom'
                    });

                    await logAnalyticsEvent('register_failed', {
                        user_id: user.uid,
                        email: email,
                        error: learner.status
                    });
                }
            }

            // Store auth token
            await SecureStore.setItemAsync('auth', JSON.stringify({ user }));

            await logAnalyticsEvent('register_success', {
                user_id: user.uid,
                email: email,
            });

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

    const handleCreateGmail = () => {
        Linking.openURL('https://accounts.google.com/signup');
    };

    return (
        <View style={styles.container} testID="register-form-container">
            <TextInput
                style={styles.input}
                placeholder="Name"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                testID="name-input"
                maxLength={50}
                accessibilityLabel="Full name input"
            />
            <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#94A3B8"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                testID="email-input"
                maxLength={50}
                accessibilityLabel="Email input"
            />
            <TouchableOpacity
                onPress={handleCreateGmail}
                style={styles.gmailLink}
                accessibilityLabel="Create a free Gmail account"
            >
                <ThemedText style={styles.gmailLinkText}>
                    Don't have an email? Create a free Gmail account
                </ThemedText>
            </TouchableOpacity>
            <View style={styles.inputContainer}>
                <View style={styles.passwordContainer}>
                    <TextInput
                        style={[styles.input, styles.passwordInput]}
                        placeholder="Password"
                        placeholderTextColor="#94A3B8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        testID="password-input"
                        maxLength={50}
                        accessibilityLabel="Password input"
                    />
                    <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                        testID="toggle-password-visibility"
                    >
                        <Ionicons
                            name={showPassword ? "eye-off" : "eye"}
                            size={24}
                            color="#94A3B8"
                        />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.passwordContainer}>
                <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Confirm Password"
                    placeholderTextColor="#94A3B8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    testID="confirm-password-input"
                    maxLength={50}
                    accessibilityLabel="Confirm password input"
                />
                <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    testID="toggle-confirm-password-visibility"
                >
                    <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={24}
                        color="#94A3B8"
                    />
                </TouchableOpacity>
            </View>
            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
                testID="register-button"
                accessibilityLabel="Create account button"
            >
                {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" testID="register-loading-indicator" />
                ) : (
                    <ThemedText style={styles.buttonText} testID="register-button-text">Create Account</ThemedText>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 16,
    },
    passwordContainer: {
        position: 'relative',
        width: '100%',
        marginBottom: 16,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 4,
        color: '#FFFFFF',
        fontSize: 16,
    },
    passwordInput: {
        paddingRight: 50, // Make room for the eye icon
        marginBottom: 0,
    },
    eyeIcon: {
        position: 'absolute',
        right: 12,
        top: 12,
        padding: 4,
    },
    helperText: {
        fontSize: 14,
        color: '#94A3B8',
        marginLeft: 4,
        marginTop: 4,
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
    gmailLink: {
        marginBottom: 16,
        padding: 8,
    },
    gmailLinkText: {
        color: '#FFFFFF',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
