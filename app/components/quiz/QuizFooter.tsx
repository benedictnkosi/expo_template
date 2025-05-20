import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '../ThemedView';
import { ThemedText } from '../ThemedText';
import { useTheme } from '@/contexts/ThemeContext';

interface QuizFooterProps {
    isFromFavorites: boolean;
    onNext: () => void;
    onGoBack: () => void;
    remainingQuizzes?: number;
    selectedMode: 'quiz' | 'lessons' | 'practice' | null;
    isDark: boolean;
    colors: any;
}

export function QuizFooter({
    isFromFavorites,
    onNext,
    onGoBack,
    remainingQuizzes,
    selectedMode,
    isDark,
    colors
}: QuizFooterProps) {
    const { isDark: themeIsDark } = useTheme();

    return (
        <ThemedView
            style={[styles.footer, {
                backgroundColor: isDark ? colors.card : '#FFFFFF'
            }]}
            testID="quiz-footer"
        >
            <View style={styles.footerRow}>
                <LinearGradient
                    colors={isDark ? ['#7C3AED', '#4F46E5'] : ['#9333EA', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.footerButton}
                >
                    <TouchableOpacity
                        style={styles.buttonContent}
                        onPress={onNext}
                        testID="next-question-button"
                    >
                        <Ionicons name="play" size={20} color="#FFFFFF" />
                        <View style={styles.buttonTextContainer}>
                            <ThemedText style={styles.footerButtonText}>
                                {selectedMode === 'lessons' ? '📚 Next Lesson' : selectedMode === 'practice' ? '🎯 Keep Going!' : '🎯 Keep Going!'}
                            </ThemedText>
                        </View>
                    </TouchableOpacity>
                </LinearGradient>

                <LinearGradient
                    colors={isDark ? ['#EA580C', '#C2410C'] : ['#F59E0B', '#F97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.footerButton}
                >
                    <TouchableOpacity
                        style={styles.buttonContent}
                        onPress={onGoBack}
                        testID="home-button"
                    >
                        <Ionicons name="menu-outline" size={20} color="#FFFFFF" />
                        <ThemedText style={styles.footerButtonText}>Menu</ThemedText>
                    </TouchableOpacity>
                </LinearGradient>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    footer: {
        padding: 16,
        paddingBottom: 24,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
    },
    footerButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginHorizontal: 8,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
    },
    buttonTextContainer: {
        alignItems: 'center',
    },
    footerButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    remainingQuizzesOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
        color: '#fff',
        fontSize: 14,
        top: '50%',
        transform: [{ translateY: -12 }],
        zIndex: 2,
        fontWeight: '500',
        opacity: 0.95,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
}); 