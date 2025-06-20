import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable, TextInput, Keyboard } from 'react-native';
import { Audio } from 'expo-av';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedbackMessage, FeedbackButton } from './CheckContinueButton';
import { useFeedback } from '../contexts/FeedbackContext';
import { AudioPlayer } from './AudioPlayer';
import { useTheme } from '@/contexts/ThemeContext';

interface Word {
    id: number;
    image: string;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface TypeMissingWordQuestionProps {
    words: Word[];
    options: (string | number)[] | null;
    selectedLanguage: string;
    blankIndex: number;
    questionId: string | number;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
    setIsQuestionAnswered: (answered: boolean) => void;
    sentenceWords: (string | number)[];
}

export function TypeMissingWordQuestion({
    words,
    options = [],
    selectedLanguage,
    blankIndex,
    questionId,
    setOnCheck,
    setOnContinue,
    setIsQuestionAnswered,
    sentenceWords,
}: TypeMissingWordQuestionProps) {
    console.log('TypeMissingWordQuestion rendering with props:', {
        wordsLength: words?.length,
        sentenceWords,
        selectedLanguage,
        blankIndex,
        questionId
    });

    const [userInput, setUserInput] = useState('');
    const { setFeedback, resetFeedback, isChecked } = useFeedback();
    const { colors, isDark } = useTheme();
    const [autoPlay, setAutoPlay] = React.useState(true);

    // Set autoPlay to false after 3 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setAutoPlay(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    // Get all words in sentence order
    const orderedWords = useMemo(() => {
        if (!sentenceWords || !words) return [];

        const mappedWords = sentenceWords
            .map(id => words.find(w => w.id === Number(id)))
            .filter((word): word is Word => word !== undefined);

        console.log('Ordered words:', mappedWords);
        return mappedWords;
    }, [sentenceWords, words]);

    // Get the correct answer (Zulu word that's missing)
    const correctAnswer = useMemo(() => {
        const blankWord = orderedWords[blankIndex];
        const answer = blankWord?.translations[selectedLanguage] || '';
        console.log('Correct answer word:', blankWord, 'answer:', answer);
        return answer;
    }, [orderedWords, blankIndex, selectedLanguage]);

    // Get audio URIs in sentence order
    const audioUris = useMemo(() => {
        const uris = orderedWords
            .map(word => word.audio[selectedLanguage])
            .filter(Boolean);
        console.log('Audio URIs:', uris);
        return uris;
    }, [orderedWords, selectedLanguage]);

    // Create the sentence with translations
    const sentenceParts = useMemo(() => {
        const parts = orderedWords.map((word, index) => {
            if (index === blankIndex) {
                return userInput || '_____';
            }
            return word.translations[selectedLanguage];
        });
        console.log('Sentence parts:', parts);
        return parts;
    }, [orderedWords, blankIndex, userInput, selectedLanguage]);

    const sentence = sentenceParts.join(' ');

    const audioComponent = useMemo(() => (
        <AudioPlayer audioUrls={audioUris} showGif={true} autoPlay={autoPlay} />
    ), [audioUris, autoPlay]);

    function resetQuestion() {
        console.log('Resetting question');
        resetFeedback();
        setUserInput('');
    }

    useEffect(() => {
        console.log('Setting up check and continue handlers');
        setOnCheck?.(handleCheck);
        setOnContinue?.(resetQuestion);
    }, [setOnCheck, setOnContinue, handleCheck, resetQuestion]);

    function handleCheck() {
        console.log('Checking answer:', {
            userInput,
            correctAnswer,
            isCorrect: userInput.trim().toLowerCase() === correctAnswer.trim().toLowerCase()
        });

        Keyboard.dismiss();
        if (!userInput.trim()) return;
        const isAnswerCorrect = userInput.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

        // Create the correct sentence
        const correctSentence = orderedWords.map((word, index) => {
            if (index === blankIndex) {
                return word.translations[selectedLanguage];
            }
            return word.translations[selectedLanguage];
        }).join(' ');

        console.log('Setting feedback:', {
            isAnswerCorrect,
            correctSentence
        });

        setFeedback({
            isChecked: true,
            isCorrect: isAnswerCorrect,
            feedbackText: isAnswerCorrect ? 'Correct!' : "That's not quite right",
            correctAnswer: !isAnswerCorrect ? correctSentence : undefined,
            questionId,
        });
    }

    function handleTextChange(text: string) {
        console.log('Text input changed:', text);
        setUserInput(text);
        setIsQuestionAnswered(text.length > 0);
    }

    return (
        <ThemedView style={[styles.container, { backgroundColor: colors.card }]}>
            <ThemedText style={[styles.title, { color: colors.text }]}>🧩 Type the missing word</ThemedText>

            {audioComponent}

            <View style={styles.sentenceContainer}>
                <ThemedText style={[styles.sentence, { color: colors.text }]}>{sentence}</ThemedText>
            </View>

            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: isDark ? colors.surfaceHigh : '#fff',
                        borderColor: isDark ? colors.border : '#E5E7EB',
                        color: colors.text,
                    }
                ]}
                value={userInput}
                onChangeText={handleTextChange}
                placeholder="Type the missing word in Zulu"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isChecked}
                accessibilityLabel="Type the missing word in Zulu"
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
        borderRadius: 12,
        minHeight: 200,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'left',
    },
    sentenceContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 100,
        paddingVertical: 20,
    },
    sentence: {
        fontSize: 24,
        textAlign: 'center',
        lineHeight: 32,
    },
    input: {
        borderWidth: 1.5,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 18,
        fontSize: 18,
        marginBottom: 16,
        textAlign: 'center',
        width: '100%',
    },
}); 