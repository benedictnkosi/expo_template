import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useFeedback } from '../contexts/FeedbackContext';

interface Word {
    id: number;
    translations: Record<string, string>;
}

interface FillInBlankQuestionProps {
    words: Word[];
    sentenceWords: (string | number)[];
    options: (string | number)[];
    blankIndex: number;
    selectedLanguage: string;
    questionId: string | number;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
    setIsQuestionAnswered: (answered: boolean) => void;
}

function getWordById(words: Word[], id: string | number) {
    return words.find(w => w.id === Number(id));
}

export function FillInBlankQuestion({
    words,
    sentenceWords,
    options,
    blankIndex,
    selectedLanguage,
    questionId,
    setOnCheck,
    setOnContinue,
    setIsQuestionAnswered,
}: FillInBlankQuestionProps) {
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const { setFeedback, resetFeedback } = useFeedback();

    // Build the sentence with a blank
    const sentenceWithBlank = sentenceWords.map((id, idx) => {
        if (idx === blankIndex) {
            if (selectedOption !== null) {
                const word = getWordById(words, selectedOption);
                return (
                    <Pressable key={idx} style={styles.blankFilled} onPress={() => setSelectedOption(null)} accessibilityLabel="Remove selected word from blank">
                        <ThemedText style={styles.blankFilledText}>{word?.translations[selectedLanguage]}</ThemedText>
                    </Pressable>
                );
            }
            return (
                <View key={idx} style={styles.blank} accessibilityLabel="Blank">
                    <ThemedText style={styles.blankText}>___</ThemedText>
                </View>
            );
        }
        const word = getWordById(words, id);
        return (
            <View key={idx} style={styles.sentenceWord}>
                <ThemedText style={styles.sentenceWordText}>{word?.translations[selectedLanguage]}</ThemedText>
            </View>
        );
    });

    const availableOptions = options.filter(id => selectedOption === null || Number(id) !== selectedOption);

    function handleSelectOption(id: string | number) {
        setSelectedOption(Number(id));
        setIsQuestionAnswered(true);
    }

    function handleCheck() {
        if (selectedOption === null) return;
        const isAnswerCorrect = selectedOption === Number(sentenceWords[blankIndex]);

        setFeedback({
            isChecked: true,
            isCorrect: isAnswerCorrect,
            feedbackText: isAnswerCorrect ? 'Correct!' : "That's not quite right",
            correctAnswer: !isAnswerCorrect ? correctWord?.translations[selectedLanguage] : undefined,
            questionId,
        });
    }

    function resetQuestion() {
        resetFeedback();
        setSelectedOption(null);
    }

    const correctWord = getWordById(words, sentenceWords[blankIndex]);
    const correctAnswer = correctWord?.translations[selectedLanguage] || '';

    useEffect(() => {
        setOnCheck?.(handleCheck);
        setOnContinue?.(resetQuestion);
    }, [setOnCheck, setOnContinue, handleCheck, resetQuestion]);

    return (
        <ThemedView style={styles.container}>
            <ThemedText style={styles.title}>Fill in the blank</ThemedText>
            <View style={styles.sentenceRow}>{sentenceWithBlank}</View>
            <View style={styles.optionsGrid}>
                {availableOptions.map((id) => {
                    const word = getWordById(words, id);
                    if (!word) return null;
                    return (
                        <Pressable
                            key={id}
                            style={[
                                styles.optionCard,
                                selectedOption === Number(id) && styles.selectedOptionCard
                            ]}
                            onPress={() => handleSelectOption(id)}
                            disabled={selectedOption !== null}
                            accessibilityLabel={`Select ${word.translations[selectedLanguage]}`}
                        >
                            <ThemedText style={styles.optionText}>{word.translations[selectedLanguage]}</ThemedText>
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
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'left',
    },
    sentenceRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        minHeight: 48,
    },
    sentenceWord: {
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    sentenceWordText: {
        fontSize: 20,
        color: '#222',
        fontWeight: '500',
    },
    blank: {
        minWidth: 48,
        minHeight: 32,
        borderBottomWidth: 2,
        borderColor: '#A1CEDC',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 2,
    },
    blankText: {
        fontSize: 20,
        color: '#A1CEDC',
        fontWeight: '600',
        letterSpacing: 2,
    },
    blankFilled: {
        minWidth: 48,
        minHeight: 32,
        borderBottomWidth: 2,
        borderColor: '#4CAF50',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 2,
        backgroundColor: '#E0F7FA',
        borderRadius: 8,
        paddingHorizontal: 8,
    },
    blankFilledText: {
        fontSize: 20,
        color: '#00796B',
        fontWeight: '600',
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
        marginBottom: 16,
    },
    optionCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
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
    selectedOptionCard: {
        backgroundColor: '#E0F7FA',
        borderColor: '#4CAF50',
    },
    optionText: {
        fontSize: 18,
        color: '#222',
        fontWeight: '500',
        textAlign: 'center',
    },
}); 