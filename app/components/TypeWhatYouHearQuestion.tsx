import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TextInput, Keyboard } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useFeedback } from '../contexts/FeedbackContext';
import { AudioOnly } from './AudioOnly';

interface Word {
    id: number;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface TypeWhatYouHearQuestionProps {
    words: Word[];
    options: (string | number)[];
    selectedLanguage: string;
    questionId: string | number;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
}

export function TypeWhatYouHearQuestion({ words, options, selectedLanguage, questionId, setOnCheck, setOnContinue }: TypeWhatYouHearQuestionProps) {
    const [userInput, setUserInput] = useState('');
    const { setFeedback, resetFeedback } = useFeedback();

    // Get all correct words and concatenate their translations
    const correctWords = options
        .map(optionId => words.find(w => w.id === Number(optionId)))
        .filter((word): word is Word => word !== undefined);
    const correctAnswer = correctWords
        .map(word => word.translations[selectedLanguage])
        .join(' ');
    const audioUris = correctWords.map(word => word.audio[selectedLanguage]).filter(Boolean);

    // Combine all audio URIs into a single string for the AudioOnly component
    const combinedAudioUrl = audioUris.length > 0 ? audioUris[0] : undefined;

    function resetQuestion() {
        resetFeedback();
        setUserInput('');
    }

    function handleCheck() {
        Keyboard.dismiss();
        if (!userInput.trim()) return;
        const isAnswerCorrect = userInput.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        setFeedback({
            isChecked: true,
            isCorrect: isAnswerCorrect,
            feedbackText: isAnswerCorrect ? 'Correct!' : "That's not quite right",
            correctAnswer: !isAnswerCorrect ? correctAnswer : undefined,
            questionId,
        });
    }

    useEffect(() => {
        setOnCheck?.(handleCheck);
        setOnContinue?.(resetQuestion);
    }, [setOnCheck, setOnContinue, handleCheck, resetQuestion]);

    return (
        <ThemedView style={styles.container}>
            <ThemedText style={styles.title}>Type what you hear</ThemedText>
            <AudioOnly audioUrl={combinedAudioUrl} />
            <TextInput
                style={styles.input}
                value={userInput}
                onChangeText={setUserInput}
                placeholder="Type your answer"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Type what you hear"
                returnKeyType="done"
                onSubmitEditing={handleCheck}
            />
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
    input: {
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 18,
        fontSize: 18,
        color: '#222',
        backgroundColor: '#fff',
        marginBottom: 16,
        textAlign: 'center',
    },
}); 