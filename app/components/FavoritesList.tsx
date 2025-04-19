import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { useTheme } from '@/contexts/ThemeContext';

interface FavoriteQuestion {
    id: string;
    createdAt: {
        date: string;
        timezone_type: number;
        timezone: string;
    };
    questionId: number;
    question: string;
    aiExplanation: string | null;
    subjectId: number;
    context: string;
    favoriteCount: number;
}

interface PopularQuestion {
    id: string;
    createdAt: {
        date: string;
        timezone_type: number;
        timezone: string;
    };
    questionId: number;
    question: string;
    aiExplanation: string | null;
    subjectId: number;
    context: string;
    favoriteCount: number;
}

interface FavoritesListProps {
    favoriteQuestions: (FavoriteQuestion | PopularQuestion)[];
    popularQuestions: (FavoriteQuestion | PopularQuestion)[];
    isFavoritesLoading: boolean;
    loadSpecificQuestion: (questionId: number) => void;
    getFavoriteCardColor: (index: number) => string;
}

export function FavoritesList({
    favoriteQuestions,
    popularQuestions,
    isFavoritesLoading,
    loadSpecificQuestion,
    getFavoriteCardColor
}: FavoritesListProps) {
    const { isDark, colors } = useTheme();

    const renderQuestionCard = (question: FavoriteQuestion | PopularQuestion, index: number, isPopular: boolean = false) => {
        const displayText = question.question && question.question.trim()
            ? question.question.split('\n')[0]
            : question.context && question.context.trim()
                ? question.context.split('\n')[0]
                : `Question #${question.questionId || 'Unknown'}`;

        return (
            <TouchableOpacity
                key={isPopular ? `popular-${question.questionId}` : question.questionId}
                style={[
                    styles.favoriteCard,
                    { backgroundColor: getFavoriteCardColor(index) }
                ]}
                onPress={() => loadSpecificQuestion(question.questionId)}
            >
                <ThemedText style={styles.favoriteCardText} numberOfLines={4}>
                    {displayText.includes('$') ? (
                        <ThemedText style={styles.favoriteCardText}>Question with formula #{question.questionId}</ThemedText>
                    ) : (
                        <ThemedText style={styles.favoriteCardText}>{displayText}</ThemedText>
                    )}
                </ThemedText>
                {isPopular && (
                    <View style={styles.popularBadge}>
                        <ThemedText style={styles.popularBadgeText}>⭐</ThemedText>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <>
            {favoriteQuestions.length > 0 ? (
                <View style={styles.favoritesGrid}>
                    <ThemedText style={styles.sectionTitle}>My Favorites</ThemedText>
                    {favoriteQuestions.map((fav, index) => renderQuestionCard(fav, index))}
                </View>
            ) : (
                <View style={[styles.emptyFavorites, {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                }]}>
                    <ThemedText style={[styles.emptyFavoritesText, { color: colors.textSecondary }]}>
                        No saved questions yet! 🌟
                    </ThemedText>
                </View>
            )}

            {popularQuestions.length > 0 && (
                <View style={styles.favoritesGrid}>
                    <ThemedText style={styles.sectionTitle}>Popular Questions</ThemedText>
                    {popularQuestions.map((question, index) => renderQuestionCard(question, index, true))}
                </View>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    favoritesGrid: {
        flexDirection: 'column',
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
    },
    favoriteCard: {
        width: '100%',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    favoriteCardText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#000000',
        lineHeight: 20,
    },
    emptyFavorites: {
        padding: 24,
        borderWidth: 2,
        borderRadius: 16,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    emptyFavoritesText: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    popularBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    popularBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFD700',
    },
}); 