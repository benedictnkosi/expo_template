import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useFeedback } from '../contexts/FeedbackContext';
import { AudioOnly } from './AudioOnly';

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
}

function getWordById(words: Word[], id: string | number) {
    return words.find(w => w.id === Number(id));
}

export function TapWhatYouHearQuestion({ words, sentenceWords, options, selectedLanguage, questionId, setOnCheck, setOnContinue }: TapWhatYouHearQuestionProps) {
    const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);
    const { setFeedback, resetFeedback } = useFeedback();

    // Get audio URLs for normal and slow (if available)
    const audioUrl = useMemo(() => {
        // Assume first word's audio for the sentence (or combine as needed)
        const firstWord = getWordById(words, sentenceWords[0]);
        return firstWord?.audio?.[selectedLanguage];
    }, [words, sentenceWords, selectedLanguage]);

    const slowAudioUrl = useMemo(() => {
        // If you have slow audio, use it; else fallback to normal
        // This is a placeholder; adapt as needed for your data
        return audioUrl;
    }, [audioUrl]);

    const availableOptions = options.filter(id => !selectedWordIds.includes(Number(id)));

    function handleSelectOption(id: string | number) {
        setSelectedWordIds(prev => [...prev, Number(id)]);
    }

    function handleRemoveSelected(idx: number) {
        setSelectedWordIds(prev => prev.filter((_, i) => i !== idx));
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
        <ThemedView style={styles.container}>
            <ThemedText style={styles.title}>Tap what you hear</ThemedText>
            <AudioOnly audioUrl={audioUrl} slowAudioUrl={slowAudioUrl} />
            {/* Selected answer row */}
            <View style={styles.selectedRow}>
                {selectedWordIds.map((id, idx) => {
                    const word = getWordById(words, id);
                    if (!word) return null;
                    return (
                        <Pressable key={idx} style={styles.selectedCard} onPress={() => handleRemoveSelected(idx)}>
                            <ThemedText style={styles.selectedCardText}>{word.translations[selectedLanguage]}</ThemedText>
                        </Pressable>
                    );
                })}
            </View>
            <View style={styles.singleAnswerLine} />
            {/* Option cards */}
            <View style={styles.optionsGrid}>
                {availableOptions.map((id) => {
                    const word = getWordById(words, id);
                    if (!word) return null;
                    return (
                        <Pressable key={id} style={styles.optionCard} onPress={() => handleSelectOption(id)}>
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
        color: '#00796B',
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
    optionText: {
        fontSize: 18,
        color: '#222',
        fontWeight: '500',
        textAlign: 'center',
    },
    singleAnswerLine: {
        height: 2,
        backgroundColor: '#E5E7EB',
        borderRadius: 1,
        marginTop: 1,
        marginBottom: 16,
        marginHorizontal: 8,
        alignSelf: 'stretch',
    },
}); 