import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '../ThemedText';
import { useColorScheme } from 'react-native';
import { colors as colorConstants } from '../../constants/Colors';

export interface SubjectStats {
    total_answers: number;
    correct_answers: number;
    incorrect_answers: number;
    correct_percentage: number;
    incorrect_percentage: number;
}

export interface PerformanceSummaryProps {
    stats: SubjectStats | null;
    onRestart: () => void;
}

function getProgressBarColor(progress: number): string {
    if (progress >= 90) return '#10B981';
    if (progress >= 70) return '#3B82F6';
    if (progress >= 50) return '#F59E0B';
    return '#EF4444';
}

export const PerformanceSummary = ({ stats, onRestart }: PerformanceSummaryProps) => {
    const isDark = useColorScheme() === 'dark';
    const themeColors = isDark ? colorConstants.dark : colorConstants.light;

    if (!stats) return null;

    const progress = stats.total_answers === 0 ? 0 :
        Math.round((stats.correct_answers / stats.total_answers) * 100);

    return (
        <View style={[styles.performanceContainer, {
            backgroundColor: themeColors.card,
            shadowColor: isDark ? '#000000' : '#000000',
            shadowOpacity: isDark ? 0.3 : 0.1,
        }]}>
            <View style={styles.performanceHeader}>
                <ThemedText style={[styles.performanceTitle, { color: themeColors.text }]}>
                    Your Scoreboard! 🏆
                </ThemedText>
                <TouchableOpacity
                    style={[styles.restartIconButton, {
                        backgroundColor: isDark ? 'rgba(255, 59, 48, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    }]}
                    onPress={onRestart}
                >
                    <Ionicons name="refresh-circle" size={28} color={isDark ? '#FF3B30' : '#EF4444'} />
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                <View style={[styles.statItem, {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : 'rgba(16, 185, 129, 0.05)',
                    borderColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 1,
                }]}>
                    <View style={styles.statContent}>
                        <View style={[styles.statIconContainer, {
                            backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)',
                        }]}>
                            <ThemedText style={styles.statIcon}>🎯</ThemedText>
                        </View>
                        <View style={styles.statTextContainer}>
                            <ThemedText style={[styles.statCount, { color: themeColors.text }]}>
                                {stats?.correct_answers || 0}
                            </ThemedText>
                            <ThemedText style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                                Bullseyes
                            </ThemedText>
                        </View>
                    </View>
                </View>

                <View style={[styles.statItem, {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                    borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 1,
                }]}>
                    <View style={styles.statContent}>
                        <View style={[styles.statIconContainer, {
                            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                        }]}>
                            <ThemedText style={styles.statIcon}>💥</ThemedText>
                        </View>
                        <View style={styles.statTextContainer}>
                            <ThemedText style={[styles.statCount, { color: themeColors.text }]}>
                                {stats?.incorrect_answers || 0}
                            </ThemedText>
                            <ThemedText style={[styles.statLabel, { color: themeColors.textSecondary }]}>
                                Oopsies
                            </ThemedText>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                    <ThemedText style={[styles.progressLabel, { color: themeColors.textSecondary }]}>
                        🐐 GOAT Level
                    </ThemedText>
                    <ThemedText style={[styles.progressPercentage, { color: themeColors.text }]}>
                        {progress}%
                    </ThemedText>
                </View>

                <View style={[styles.progressBarContainer, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                }]}>
                    <View
                        style={[
                            styles.progressBar,
                            {
                                width: `${progress}%`,
                                backgroundColor: getProgressBarColor(progress)
                            }
                        ]}
                    />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    performanceContainer: {
        borderRadius: 20,
        padding: 20,
        margin: 16,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowRadius: 12,
        elevation: 5,
    },
    performanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    performanceTitle: {
        fontSize: 22,
        fontWeight: '700',
    },
    restartIconButton: {
        padding: 8,
        borderRadius: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
    },
    statItem: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
    },
    statContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statIcon: {
        fontSize: 18,
    },
    statTextContainer: {
        flex: 1,
    },
    statCount: {
        fontSize: 24,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 14,
        marginTop: 4,
    },
    progressSection: {
        marginTop: 8,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    progressPercentage: {
        fontSize: 16,
        fontWeight: '600',
    },
    progressBarContainer: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
}); 