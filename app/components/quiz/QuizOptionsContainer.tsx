import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemedView } from '../../components/ThemedView';
import { ThemedText } from '../../components/ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { KaTeX } from './KaTeX';

interface QuizOptionsContainerProps {
    options: Record<string, string>;
    selectedAnswer: string | null;
    showFeedback: boolean;
    isAnswerLoading: boolean;
    currentQuestion: {
        answer: string;
    } | null;
    onAnswer: (value: string) => void;
    cleanAnswer: (answer: string) => string;
}

export function QuizOptionsContainer({
    options,
    selectedAnswer,
    showFeedback,
    isAnswerLoading,
    currentQuestion,
    onAnswer,
    cleanAnswer
}: QuizOptionsContainerProps) {
    const { colors, isDark } = useTheme();

    return (
        <ThemedView
            style={[styles.optionsContainer, {
                borderColor: colors.border
            }]}
        >
            <View testID="options-container">
                {Object.entries(options)
                    .filter(([_, value]) => value)
                    .map(([key, value], index) => (
                        <TouchableOpacity
                            key={key}
                            style={[
                                styles.option,
                                {
                                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                                    borderColor: colors.border
                                },
                                selectedAnswer === value && [
                                    styles.selectedOption,
                                    { backgroundColor: isDark ? colors.primary + '20' : '#00000020' }
                                ],
                                showFeedback && selectedAnswer === value && (
                                    (() => {
                                        try {
                                            if (!currentQuestion) return [
                                                styles.wrongOption,
                                                {
                                                    backgroundColor: isDark ? 'rgba(255, 59, 48, 0.2)' : '#FFE5E5',
                                                    borderColor: '#FF3B30'
                                                }
                                            ];

                                            const parsedAnswer = currentQuestion.answer.startsWith('[')
                                                ? JSON.parse(currentQuestion.answer)
                                                : currentQuestion.answer;

                                            return (Array.isArray(parsedAnswer)
                                                ? parsedAnswer.includes(value)
                                                : parsedAnswer === value)
                                                ? [
                                                    styles.correctOption,
                                                    {
                                                        backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#E6F4EA',
                                                        borderColor: '#22C55E'
                                                    }
                                                ]
                                                : [
                                                    styles.wrongOption,
                                                    {
                                                        backgroundColor: isDark ? 'rgba(255, 59, 48, 0.2)' : '#FFE5E5',
                                                        borderColor: '#FF3B30'
                                                    }
                                                ];
                                        } catch (error) {
                                            console.error('Error parsing answer:', error);
                                            if (!currentQuestion) return [
                                                styles.wrongOption,
                                                {
                                                    backgroundColor: isDark ? 'rgba(255, 59, 48, 0.2)' : '#FFE5E5',
                                                    borderColor: '#FF3B30'
                                                }
                                            ];

                                            return currentQuestion.answer === value
                                                ? [
                                                    styles.correctOption,
                                                    {
                                                        backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : '#E6F4EA',
                                                        borderColor: '#22C55E'
                                                    }
                                                ]
                                                : [
                                                    styles.wrongOption,
                                                    {
                                                        backgroundColor: isDark ? 'rgba(255, 59, 48, 0.2)' : '#FFE5E5',
                                                        borderColor: '#FF3B30'
                                                    }
                                                ];
                                        }
                                    })()
                                )
                            ]}
                            onPress={() => onAnswer(value)}
                            disabled={showFeedback || isAnswerLoading}
                            testID={`option-${index}`}
                        >
                            {isAnswerLoading && selectedAnswer === value ? (
                                <View
                                    style={styles.optionLoadingContainer}
                                    testID="option-loading"
                                >
                                    <ActivityIndicator size="small" color={colors.primary} />
                                </View>
                            ) : (
                                cleanAnswer(value).includes('$') ? (
                                    <KaTeX
                                        latex={cleanAnswer(value).replace(/\$/g, '')}
                                        isOption={true}
                                    />
                                ) : (
                                    <ThemedText
                                        style={[
                                            styles.optionText,
                                            { color: colors.text }
                                        ]}
                                        testID={`option-text-${index}`}
                                    >
                                        {value}
                                    </ThemedText>
                                )
                            )}
                        </TouchableOpacity>
                    ))}
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    optionsContainer: {
        gap: 12,
        marginTop: 20,
        paddingHorizontal: 2,
        backgroundColor: 'transparent',
    },
    option: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        width: '100%',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    selectedOption: {
        borderColor: '#000000',
    },
    correctOption: {
        borderWidth: 2,
    },
    wrongOption: {
        borderWidth: 2,
    },
    optionText: {
        fontSize: 12,
        lineHeight: 20,
    },
    optionLoadingContainer: {
        minHeight: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionContent: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    latexOptionContainer: {
        width: '100%',
        flexWrap: 'wrap',
    },
    latexContainer: {
        width: '100%',
        marginVertical: 4,
    },
}); 