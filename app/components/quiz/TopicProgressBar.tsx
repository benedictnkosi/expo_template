import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '../ThemedText';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';

interface TopicProgressBarProps {
    totalQuestions: number;
    viewedQuestions: number;
    progressPercentage: number;
    topicName: string;
    lessonsMode?: boolean;
}

export const TopicProgressBar: React.FC<TopicProgressBarProps> = ({
    totalQuestions,
    viewedQuestions,
    progressPercentage,
    topicName,
    lessonsMode
}) => {
    const { colors, isDark } = useTheme();

    return (
        <View style={styles.container}>
            <ThemedText style={[styles.topicName, { color: colors.text }]}>{topicName}</ThemedText>
            <View style={[styles.progressContainer, {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }]}>
                <LinearGradient
                    colors={isDark ? ['#059669', '#10B981'] : ['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBar, { width: `${progressPercentage}%` }]}
                />
            </View>
            <View style={styles.statsContainer}>
                <ThemedText style={[styles.statsText, { color: colors.textSecondary }]}>
                    {viewedQuestions} of {totalQuestions} {lessonsMode ? 'lessons' : 'questions'}
                </ThemedText>
                <ThemedText style={[styles.percentageText, { color: colors.text }]}>
                    {progressPercentage}% completed
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
    topicName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    progressContainer: {
        height: 8,
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