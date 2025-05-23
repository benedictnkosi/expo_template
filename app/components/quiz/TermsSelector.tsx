import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';

interface TermsSelectorProps {
    selectedTerms: string;
    onTermsChange: (term: number) => Promise<void>;
    isUpdatingTerms: boolean;
    isDark: boolean;
    colors: any;
    onTermsUpdated?: () => void;
}

export function TermsSelector({
    selectedTerms,
    onTermsChange,
    isUpdatingTerms,
    isDark,
    colors,
    onTermsUpdated
}: TermsSelectorProps) {
    // Available terms
    const TERMS = [1, 2, 3, 4];

    async function handlePress(term: number) {
        await onTermsChange(term);
        if (onTermsUpdated) onTermsUpdated();
    }

    return (
        <ThemedView style={[styles.sectionCard, {
            backgroundColor: isDark ? colors.surface : '#F8FAFC',
            borderColor: isDark ? colors.border : '#E5EAF2',
        }]}>

            <ThemedText style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Only questions from the selected terms will appear in the quiz.
            </ThemedText>

            <View style={styles.termsRow}>
                {TERMS.map((term) => {
                    const isSelected = selectedTerms.split(',').map(t => t.trim()).includes(term.toString());
                    return (
                        <TouchableOpacity
                            key={term}
                            style={[
                                styles.termPill,
                                {
                                    backgroundColor: isSelected ? colors.primary : (isDark ? colors.surface : '#FFF'),
                                    borderColor: isSelected ? colors.primary : '#D1D5DB',
                                },
                            ]}
                            onPress={() => handlePress(term)}
                            disabled={isUpdatingTerms}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                        >
                            <ThemedText style={[
                                styles.termPillText,
                                { color: isSelected ? '#fff' : colors.text }
                            ]}>
                                Term {term}
                            </ThemedText>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    sectionCard: {
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 12,
        marginBottom: 20,
        borderWidth: 1,
        marginHorizontal: 16,
        alignItems: 'center',
    },

    sectionSubtitle: {
        fontSize: 14,
        marginBottom: 16,
        color: '#64748B',
        fontWeight: '400',
        textAlign: 'center',
    },
    termsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        width: '100%',
    },
    termPill: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 10,
        paddingHorizontal: 0,
        borderRadius: 999,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 70,
    },
    termPillText: {
        fontSize: 14,
        fontWeight: '500',
        letterSpacing: 0.2,
    },
}); 