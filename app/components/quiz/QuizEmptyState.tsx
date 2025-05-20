import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Paywall } from '../Paywall';
import { useAuth } from '@/contexts/AuthContext';

const NO_QUESTIONS_ILLUSTRATION = require('@/assets/images/illustrations/stressed.png');
const QUIZ_LIMIT_ILLUSTRATION = require('@/assets/images/illustrations/stressed.png'); // You might want to use a different illustration

interface QuizEmptyStateProps {
    onGoToProfile: () => void;
    onRestart: () => void;
    onGoBack: () => void;
    isQuizLimitReached?: boolean;
    mode?: 'quiz' | 'lessons' | 'practice';
    offerings?: any; // Add offerings prop
}

export function QuizEmptyState({
    onGoToProfile,
    onRestart,
    onGoBack,
    isQuizLimitReached = false,
    mode,
    offerings
}: QuizEmptyStateProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [isLoading, setIsLoading] = useState(true);
    const [showPaywall, setShowPaywall] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (isQuizLimitReached && offerings) {
            setShowPaywall(true);
        }
    }, [isQuizLimitReached, offerings]);

    if (isLoading) {
        return (
            <LinearGradient
                colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
                style={[styles.gradient, { paddingTop: insets.top }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={isDark ? colors.primary : '#4F46E5'} />
                </View>
            </LinearGradient>
        );
    }

    return (
        <>
            {showPaywall && (
                <Paywall
                    offerings={offerings}
                    onSuccess={onGoBack}
                    onClose={() => setShowPaywall(false)}
                />
            )}
            <LinearGradient
                colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
                style={[styles.gradient, { paddingTop: insets.top }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                testID="quiz-empty-state"
            >
                <ScrollView style={styles.container}>
                    <ThemedView style={[styles.noQuestionsContainer, {
                        backgroundColor: isDark ? colors.card : '#FFFFFF'
                    }]}>
                        <Image
                            source={isQuizLimitReached ? QUIZ_LIMIT_ILLUSTRATION : NO_QUESTIONS_ILLUSTRATION}
                            style={styles.noQuestionsIllustration}
                            resizeMode="contain"
                        />
                        <ThemedText style={[styles.noQuestionsTitle, { color: colors.text }]}>
                            {isQuizLimitReached
                                ? mode === 'quiz'
                                    ? "⏰ That's all the brain power we can handle for today! Come back tomorrow for more quizzes with Dimpo!"
                                    : "⏰ You've soaked up today's lesson! Dimpo says it's time to stretch and come back refreshed tomorrow!"
                                : "🚨 Whoa! Looks like the quiz bank is empty! Dimpo's off to fetch some new questions! 🏃‍♂️📚"
                            }
                        </ThemedText>
                        <ThemedText style={[styles.noQuestionsSubtitle, { color: colors.textSecondary }]}>
                            {isQuizLimitReached
                                ? mode === 'quiz'
                                    ? "Don't worry — your progress is safe! 📘 Why not dive into a lesson or enjoy a quick podcast with Dimpo while you recharge?"
                                    : "Don't worry — your progress is safe! 🎧 Try a fun quiz or tune into an episode of our learning podcast while you wait!"
                                : "Check your profile settings and make sure you've selected the right subjects and school terms so Dimpo can fetch the right quizzes! 🎯"
                            }
                        </ThemedText>

                        {!isQuizLimitReached && (
                            <TouchableOpacity
                                style={[styles.profileSettingsButton, {
                                    backgroundColor: isDark ? colors.primary : '#4F46E5'
                                }]}
                                onPress={onGoToProfile}
                            >
                                <View style={styles.buttonContent}>
                                    <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
                                    <ThemedText style={styles.buttonText}>Go to Profile Settings</ThemedText>
                                </View>
                            </TouchableOpacity>
                        )}

                        <View style={styles.buttonGroup}>
                            {!isQuizLimitReached && (
                                <TouchableOpacity
                                    style={[styles.restartButton, {
                                        backgroundColor: isDark ? '#DC2626' : '#EF4444'
                                    }]}
                                    onPress={onRestart}
                                >
                                    <View style={styles.buttonContent}>
                                        <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                                        <ThemedText style={styles.buttonText}>Restart Subject</ThemedText>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {isQuizLimitReached && (
                                <TouchableOpacity
                                    style={[styles.upgradeButton]}
                                    onPress={() => setShowPaywall(true)}
                                >
                                    <LinearGradient
                                        colors={isDark ? ['#7C3AED', '#4F46E5'] : ['#9333EA', '#4F46E5']}
                                        style={styles.upgradeButtonGradient}
                                    >
                                        <View style={styles.buttonContent}>
                                            <Ionicons name="star-outline" size={20} color="#FFFFFF" />
                                            <ThemedText style={styles.buttonText}>✨ Upgrade to Pro</ThemedText>
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.goHomeButton, {
                                    backgroundColor: isDark ? colors.surface : '#64748B',
                                    flex: isQuizLimitReached ? 1 : undefined
                                }]}
                                onPress={onGoBack}
                            >
                                <View style={styles.buttonContent}>
                                    <Ionicons name="menu-outline" size={20} color="#FFFFFF" />
                                    <ThemedText style={styles.buttonText}>Go Back</ThemedText>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </ThemedView>
                </ScrollView>
            </LinearGradient>
        </>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    noQuestionsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    noQuestionsIllustration: {
        width: 280,
        height: 280,
        marginBottom: 32,
    },
    noQuestionsTitle: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 32,
        paddingHorizontal: 20,
    },
    noQuestionsSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    profileSettingsButton: {
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        width: '100%',
        marginBottom: 24,
    },
    buttonGroup: {
        width: '100%',
        gap: 12,
    },
    restartButton: {
        width: '100%',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    upgradeButton: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    upgradeButtonGradient: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    goHomeButton: {
        width: '100%',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
}); 