import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useFeedback } from '../contexts/FeedbackContext';
import { AudioPlayer } from './AudioPlayer';
import { useTheme } from '@/contexts/ThemeContext';

interface Word {
    id: number;
    image?: string | null;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface TapWhatYouHearQuestionProps {
    words: Word[];
    sentenceWords: (string | number)[];
    options: (string | number)[];
    selectedLanguage: string;
    questionId: string;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
    setIsQuestionAnswered: (answered: boolean) => void;
}

function getWordById(words: Word[], id: string | number) {
    return words.find(w => w.id === Number(id));
}

export function TapWhatYouHearQuestion({ words, sentenceWords, options, selectedLanguage, questionId, setOnCheck, setOnContinue, setIsQuestionAnswered }: TapWhatYouHearQuestionProps) {
    const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);
    const { setFeedback, resetFeedback } = useFeedback();
    const { colors, isDark } = useTheme();

    console.log('sentenceWords', questionId);

    // Get audio URLs for normal and slow (if available) - only calculate once when sentence words change
    const audioUrls = useMemo(() => {
        return sentenceWords
            .map(id => {
                const word = getWordById(words, id);
                return word?.audio?.[selectedLanguage];
            })
            .filter((url): url is string => !!url);
    }, [words, sentenceWords, selectedLanguage]); // Remove selectedWordIds from dependencies

    console.log('audioUrls', audioUrls);

    const availableOptions = options.filter(id => !selectedWordIds.includes(Number(id)));

    function handleSelectOption(id: string | number) {
        setSelectedWordIds(prev => [...prev, Number(id)]);
        setIsQuestionAnswered(true);
    }

    function handleRemoveSelected(idx: number) {
        setSelectedWordIds(prev => prev.filter((_, i) => i !== idx));
        setIsQuestionAnswered(selectedWordIds.length > 1);
    }

    function handleCheck() {
        const selected = selectedWordIds.map(String);
        const correct = sentenceWords.map(String);
        const isAnswerCorrect =
            selected.length === correct.length &&
            selected.every((id, idx) => id === correct[idx]);

        setFeedback({
            isChecked: true,
            isCorrect: isAnswerCorrect,
            feedbackText: isAnswerCorrect ? 'Correct!' : "That's not quite right",
            correctAnswer: !isAnswerCorrect ? correctAnswer : undefined,
            questionId,
        });
    }

    function resetQuestion() {
        resetFeedback();
        setSelectedWordIds([]);
    }

    const correctAnswer = sentenceWords
        .map(id => {
            const word = getWordById(words, id);
            if (!word) return '';
            return word.translations[selectedLanguage];
        })
        .join(' ');

    useEffect(() => {
        setOnCheck?.(handleCheck);
        setOnContinue?.(resetQuestion);
    }, [setOnCheck, setOnContinue, handleCheck, resetQuestion]);

    return (
        <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
            <ThemedText style={[styles.title, { color: colors.text }]}>Tap what you hear</ThemedText>
            <AudioPlayer audioUrls={audioUrls} />
            {/* Selected answer row */}
            <View style={styles.selectedRow}>
                {selectedWordIds.map((id, idx) => {
                    const word = getWordById(words, id);
                    if (!word) return null;
                    return (
                        <Pressable
                            key={idx}
                            style={[styles.selectedCard, { backgroundColor: isDark ? colors.surface : '#E0F2F1' }]}
                            onPress={() => handleRemoveSelected(idx)}
                        >
                            <ThemedText style={[styles.selectedCardText, { color: isDark ? colors.success : '#00796B' }]}>{word.translations[selectedLanguage]}</ThemedText>
                        </Pressable>
                    );
                })}
            </View>
            <View style={[styles.singleAnswerLine, { backgroundColor: colors.border }]} />
            {/* Option cards */}
            <View style={styles.optionsGrid}>
                {availableOptions.map((id) => {
                    const word = getWordById(words, id);
                    if (!word) return null;
                    return (
                        <Pressable
                            key={id}
                            style={[styles.optionCard, {
                                backgroundColor: isDark ? colors.surface : '#fff',
                                borderColor: colors.border,
                            }]}
                            onPress={() => handleSelectOption(id)}
                        >
                            <ThemedText style={[styles.optionText, { color: colors.text }]}>{word.translations[selectedLanguage]}</ThemedText>
                        </Pressable>
                    );
                })}
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'left',
    },
    selectedRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        minHeight: 40,
        marginBottom: 1,
        justifyContent: 'center',
    },
    selectedCard: {
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 1,
        marginHorizontal: 2,
    },
    selectedCardText: {
        fontSize: 18,
        fontWeight: '600',
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
        marginBottom: 16,
    },
    optionCard: {
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 18,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 90,
        minHeight: 44,
        margin: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    singleAnswerLine: {
        height: 2,
        borderRadius: 1,
        marginTop: 1,
        marginBottom: 16,
        marginHorizontal: 8,
        alignSelf: 'stretch',
    },
}); 