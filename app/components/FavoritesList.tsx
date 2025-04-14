import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { useTheme } from '@/contexts/ThemeContext';

interface FavoriteQuestion {
    id: string;
    questionId: number;
    question: string;
    context: string;
}

interface FavoritesListProps {
    favoriteQuestions: FavoriteQuestion[];
    isFavoritesLoading: boolean;
    loadSpecificQuestion: (questionId: number) => void;
    getFavoriteCardColor: (index: number) => string;
}

export function FavoritesList({
    favoriteQuestions,
    isFavoritesLoading,
    loadSpecificQuestion,
    getFavoriteCardColor
}: FavoritesListProps) {
    const { isDark, colors } = useTheme();

    return (
        <>
            {favoriteQuestions.length > 0 ? (
                <View style={styles.favoritesGrid}>
                    {favoriteQuestions.map((fav, index) => {
                        // Get display text for the card
                        const displayText = fav.question && fav.question.trim()
                            ? fav.question.split('\n')[0]
                            : fav.context && fav.context.trim()
                                ? fav.context.split('\n')[0]
                                : `Question #${fav.questionId || 'Unknown'}`;

                        return (
                            <TouchableOpacity
                                key={fav.id}
                                style={[
                                    styles.favoriteCard,
                                    { backgroundColor: getFavoriteCardColor(index) }
                                ]}
                                onPress={() => loadSpecificQuestion(fav.questionId)}
                            >
                                <ThemedText style={styles.favoriteCardText} numberOfLines={4}>
                                    {displayText.includes('$') ? (
                                        <ThemedText style={styles.favoriteCardText}>Question with formula #{fav.questionId}</ThemedText>
                                    ) : (
                                        <ThemedText style={styles.favoriteCardText}>{displayText}</ThemedText>
                                    )}
                                </ThemedText>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ) : !isFavoritesLoading && (
                <View style={[styles.emptyFavorites, {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }]}>
                    <ThemedText style={[styles.emptyFavoritesText, { color: colors.textSecondary }]}>
                        No saved questions yet! 🌟
                    </ThemedText>
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    favoritesGrid: {
        flexDirection: 'column',
        gap: 12,
        padding: 0,
    },
    favoriteCard: {
        width: '100%',
        minHeight: 100,
        borderRadius: 12,
        padding: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    favoriteCardText: {
        fontSize: 14,
        textAlign: 'center'
    },
    emptyFavorites: {
        padding: 20,
        borderRadius: 12,
        margin: 16,
        borderWidth: 1,
        alignItems: 'center',
    },
    emptyFavoritesText: {
        fontSize: 16,
        textAlign: 'center',
    },
}); 