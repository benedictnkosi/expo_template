import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Modal, Share, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Paywall } from '../Paywall';
import { useAuth } from '@/contexts/AuthContext';
import { AskParentModal } from '../AskParentModal';

const NO_QUESTIONS_ILLUSTRATION = require('@/assets/images/illustrations/stressed.png');
const QUIZ_LIMIT_ILLUSTRATION = require('@/assets/images/dimpo/limit.png'); // You might want to use a different illustration

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
    const [showParentModal, setShowParentModal] = useState(false);
    const { user } = useAuth();

    const storeLink = Platform.select({
        ios: 'https://apps.apple.com/za/app/dimpo-learning-app/id6742684696',
        android: 'https://play.google.com/store/apps/details?id=za.co.examquizafrica',
        default: 'https://play.google.com/store/apps/details?id=za.co.examquizafrica'
    });

    const parentMessage = `Hi! I've been using the Dimpo learning app to study for school and I just reached my daily limit.
It really helps me with subjects and past papers — can you please help me upgrade to Pro so I can keep learning every day? 🙏

It's only R29/month or R199/year. You can check it out here:
👉 ${storeLink}`;

    const handleShareWithParent = async () => {
        try {
            await Share.share({
                message: parentMessage,
                url: storeLink,
                title: 'Dimpo Pro Upgrade'
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

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
            <AskParentModal
                isVisible={showParentModal}
                onClose={() => setShowParentModal(false)}
                parentMessage={parentMessage}
                onShare={handleShareWithParent}
                isDark={isDark}
                colors={colors}
            />
            <LinearGradient
                colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
                style={[styles.gradient, { paddingTop: insets.top }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                testID="quiz-empty-state"
            >
                <TouchableOpacity
                    style={[styles.closeButton, { top: insets.top + 16 }]}
                    onPress={onGoBack}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons
                        name="close"
                        size={24}
                        color={isDark ? colors.text : '#64748B'}
                    />
                </TouchableOpacity>
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
                                ? mode === 'lessons'
                                    ? "🧠 You've reached today's free lesson limit!\n\nUpgrade to keep learning — no waiting till tomorrow."
                                    : "🧠 You've reached today's free limit!\n\nUpgrade to keep going — no waiting till tomorrow."
                                : "🚨 Whoa! Looks like the quiz bank is empty! Dimpo's off to fetch some new questions! 🏃‍♂️📚"
                            }
                        </ThemedText>
                        <ThemedText style={[styles.noQuestionsSubtitle, { color: colors.textSecondary }]}>
                            {isQuizLimitReached
                                ? mode === 'lessons'
                                    ? "🚀 Go unlimited with Pro to unlock unlimited lessons, step-by-step maths, and audio lessons — anytime."
                                    : "🚀 Go unlimited with Pro to unlock unlimited quizzes, step-by-step maths, and audio lessons — anytime."
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
                                <>
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

                                    <TouchableOpacity
                                        style={[styles.askParentButton, {
                                            backgroundColor: isDark ? colors.surface : '#64748B',
                                        }]}
                                        onPress={() => setShowParentModal(true)}
                                    >
                                        <View style={styles.buttonContent}>
                                            <Ionicons name="people-outline" size={20} color="#FFFFFF" />
                                            <ThemedText style={styles.buttonText}>Ask a Parent</ThemedText>
                                        </View>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.goHomeButton, {
                                            backgroundColor: isDark ? colors.surface : '#64748B',
                                        }]}
                                        onPress={onGoBack}
                                    >
                                        <View style={styles.buttonContent}>
                                            <Ionicons name="time-outline" size={20} color="#FFFFFF" />
                                            <ThemedText style={styles.buttonText}>Come back tomorrow</ThemedText>
                                        </View>
                                    </TouchableOpacity>
                                </>
                            )}
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
    askParentButton: {
        width: '100%',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 12,
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
    closeButton: {
        position: 'absolute',
        right: 16,
        zIndex: 10,
        padding: 8,
    },
}); 