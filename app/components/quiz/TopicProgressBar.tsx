import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '../ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface TopicProgressBarProps {
    totalQuestions: number;
    viewedQuestions: number;
    progressPercentage: number;
}

export const TopicProgressBar: React.FC<TopicProgressBarProps> = ({
    totalQuestions,
    viewedQuestions,
    progressPercentage
}) => {
    const { colors, isDark } = useTheme();

    return (
        <View style={styles.container}>
            <View style={styles.progressContainer}>
                <LinearGradient
                    colors={isDark ? ['#059669', '#10B981'] : ['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBar, { width: `${progressPercentage}%` }]}
                />
            </View>
            <View style={styles.statsContainer}>
                <ThemedText style={styles.statsText}>
                    {viewedQuestions} of {totalQuestions} lessons
                </ThemedText>
                <ThemedText style={styles.percentageText}>
                    {progressPercentage}%
                </ThemedText>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        width: '100%',
    },
    progressContainer: {
        height: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statsText: {
        fontSize: 14,
        opacity: 0.8,
    },
    percentageText: {
        fontSize: 14,
        fontWeight: '600',
    },
}); 