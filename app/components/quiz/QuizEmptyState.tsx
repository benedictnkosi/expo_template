import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NO_QUESTIONS_ILLUSTRATION = require('@/assets/images/illustrations/stressed.png');
const QUIZ_LIMIT_ILLUSTRATION = require('@/assets/images/illustrations/stressed.png'); // You might want to use a different illustration

interface QuizEmptyStateProps {
    onGoToProfile: () => void;
    onRestart: () => void;
    onGoBack: () => void;
    isQuizLimitReached?: boolean;
    mode?: 'quiz' | 'lessons';
}

export function QuizEmptyState({
    onGoToProfile,
    onRestart,
    onGoBack,
    isQuizLimitReached = false,
    mode
}: QuizEmptyStateProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

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
                                ? "⏰ Time's Up! You've Reached Your Daily Quiz Limit!"
                                : "⏰ Time's Up! You've Reached Your Daily Lesson Limit!"
                            : "🚨 Alert! The quiz bank is empty! Someone call the question police! 🚔"
                        }
                    </ThemedText>
                    <ThemedText style={[styles.noQuestionsSubtitle, { color: colors.textSecondary }]}>
                        {isQuizLimitReached
                            ? mode === 'quiz'
                                ? "Don't worry! Your progress is saved. Why not try some lessons or listen to our educational podcasts while you wait?"
                                : "Don't worry! Your progress is saved. Why not try some quizzes or listen to our educational podcasts while you wait?"
                            : "Check your profile for selected school terms"
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
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    restartButton: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    goHomeButton: {
        flex: 1,
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