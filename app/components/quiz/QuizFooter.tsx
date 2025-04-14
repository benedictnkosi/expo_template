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
}

export function QuizFooter({ 
    isFromFavorites,
    onNext,
    onGoBack
}: QuizFooterProps) {
    const { colors, isDark } = useTheme();

    return (
        <ThemedView
            style={[styles.footer, {
                backgroundColor: isDark ? colors.card : '#FFFFFF'
            }]}
            testID="quiz-footer"
        >
            {!isFromFavorites && (
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
                        <ThemedText style={styles.footerButtonText}>🎯 Keep Going!</ThemedText>
                    </TouchableOpacity>
                </LinearGradient>
            )}

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
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    footer: {
        flexDirection: 'row',
        gap: 16,
        padding: 16,
        paddingBottom: 24,
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
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
    },
    footerButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
}); 