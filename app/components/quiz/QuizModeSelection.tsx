import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useColorScheme } from 'react-native';
import { colors as colorConstants } from '../../constants/Colors';

export interface QuizMode {
    id: string;
    title: string;
    description: string;
    icon: string;
    isPremium?: boolean;
}

export interface QuizModeSelectionProps {
    modes: QuizMode[];
    onSelectMode: (mode: QuizMode) => void;
    selectedModeId?: string;
}

export const QuizModeSelection = ({ modes, onSelectMode, selectedModeId }: QuizModeSelectionProps) => {
    const isDark = useColorScheme() === 'dark';
    const themeColors = isDark ? colorConstants.dark : colorConstants.light;

    return (
        <View style={styles.container}>
            <ThemedText style={[styles.title, { color: themeColors.text }]}>
                Choose Your Learning Mode 🎯
            </ThemedText>
            <View style={styles.modesContainer}>
                {modes.map((mode) => (
                    <TouchableOpacity
                        key={mode.id}
                        testID={`quiz-mode-${mode.id}`}
                        style={[
                            styles.modeCard,
                            {
                                backgroundColor: themeColors.card,
                                borderColor: selectedModeId === mode.id
                                    ? themeColors.text
                                    : themeColors.textSecondary,
                                borderWidth: selectedModeId === mode.id ? 2 : 1,
                                shadowColor: isDark ? '#000000' : '#000000',
                                shadowOpacity: isDark ? 0.3 : 0.1,
                            }
                        ]}
                        onPress={() => onSelectMode(mode)}
                    >
                        <View style={styles.modeContent}>
                            <ThemedText style={styles.modeIcon}>{mode.icon}</ThemedText>
                            <View style={styles.modeTextContainer}>
                                <View style={styles.titleContainer}>
                                    <ThemedText style={[styles.modeTitle, { color: themeColors.text }]}>
                                        {mode.title}
                                    </ThemedText>
                                    {mode.isPremium && (
                                        <View style={[styles.premiumBadge, { backgroundColor: isDark ? '#7C3AED' : '#9333EA' }]}>
                                            <ThemedText style={styles.premiumText}>PRO</ThemedText>
                                        </View>
                                    )}
                                </View>
                                <ThemedText style={[styles.modeDescription, { color: themeColors.textSecondary }]}>
                                    {mode.description}
                                </ThemedText>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        width: '100%',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    modesContainer: {
        gap: 12,
        width: '100%',
    },
    modeCard: {
        borderRadius: 12,
        padding: 16,
        width: '100%',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowRadius: 4,
        elevation: 3,
    },
    modeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    modeIcon: {
        fontSize: 24,
    },
    modeTextContainer: {
        flex: 1,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modeTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    modeDescription: {
        fontSize: 14,
    },
    premiumBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    premiumText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
}); 