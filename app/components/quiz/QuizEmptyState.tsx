import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NO_QUESTIONS_ILLUSTRATION = require('@/assets/images/illustrations/stressed.png');

interface QuizEmptyStateProps {
    onGoToProfile: () => void;
    onRestart: () => void;
    onGoBack: () => void;
}

export function QuizEmptyState({ 
    onGoToProfile, 
    onRestart, 
    onGoBack 
}: QuizEmptyStateProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

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
                        source={NO_QUESTIONS_ILLUSTRATION}
                        style={styles.noQuestionsIllustration}
                        resizeMode="contain"
                    />
                    <ThemedText style={[styles.noQuestionsTitle, { color: colors.text }]}>
                        🚨 Alert! The quiz bank is empty! Someone call the question police! 🚔
                    </ThemedText>
                    <ThemedText style={[styles.noQuestionsSubtitle, { color: colors.textSecondary }]}>
                        Check your profile for selected school terms and curriculum
                    </ThemedText>

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

                    <View style={styles.buttonGroup}>
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

                        <TouchableOpacity
                            style={[styles.goHomeButton, {
                                backgroundColor: isDark ? colors.surface : '#64748B'
                            }]}
                            onPress={onGoBack}
                        >
                            <View style={styles.buttonContent}>
                                <Ionicons name="home-outline" size={20} color="#FFFFFF" />
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
}); 