import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, TextInput, Keyboard } from 'react-native';
import { Audio } from 'expo-av';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedbackMessage, FeedbackButton } from './CheckContinueButton';
import { useFeedback } from '../contexts/FeedbackContext';

interface Word {
    id: number;
    image?: string;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface CompleteTranslationQuestionProps {
    words: Word[];
    options: string[];
    selectedLanguage: string;
    blankIndex: number;
    questionId: string;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
}

export function CompleteTranslationQuestion({
    words,
    options,
    selectedLanguage,
    blankIndex,
    questionId,
    setOnCheck,
    setOnContinue
}: CompleteTranslationQuestionProps) {
    const [userInput, setUserInput] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const soundRef = useRef<Audio.Sound | null>(null);
    const audioQueueRef = useRef<string[]>([]);
    const currentAudioIndexRef = useRef(0);
    const { setFeedback, resetFeedback, isChecked } = useFeedback();

    // Get all words and their translations
    const correctWords = options
        .map(optionId => words.find(w => w.id === Number(optionId)))
        .filter((word): word is Word => word !== undefined);

    const correctAnswer = correctWords[blankIndex]?.translations[selectedLanguage] || '';
    const audioUris = correctWords.map(word => word.audio[selectedLanguage]).filter(Boolean);

    // Create the sentence with blank or user input
    const sentenceParts = correctWords.map((word, index) => {
        if (index === blankIndex) {
            return userInput || '_____';
        }
        return word.translations[selectedLanguage];
    });

    const sentence = sentenceParts.join(' ');

    useEffect(() => {
        if (audioUris.length > 0) {
            handlePlayAudio();
        }
    }, [audioUris]);

    function resetQuestion() {
        resetFeedback();
        setUserInput('');
    }

    useEffect(() => {
        setOnCheck?.(handleCheck);
        setOnContinue?.(resetQuestion);
    }, [setOnCheck, setOnContinue, handleCheck, resetQuestion]);

    async function playNextAudio() {
        if (currentAudioIndexRef.current >= audioQueueRef.current.length) {
            setIsPlaying(false);
            currentAudioIndexRef.current = 0;
            return;
        }

        try {
            const currentAudioUri = audioQueueRef.current[currentAudioIndexRef.current];
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            const { sound } = await Audio.Sound.createAsync(
                { uri: currentAudioUri },
                { shouldPlay: true },
                (status) => {
                    if (status.isLoaded && status.didJustFinish) {
                        currentAudioIndexRef.current++;
                        playNextAudio();
                    }
                }
            );
            soundRef.current = sound;
            await sound.playAsync();
        } catch (e) {
            setIsPlaying(false);
            currentAudioIndexRef.current = 0;
        }
    }

    async function handlePlayAudio() {
        if (!audioUris.length) return;
        try {
            setIsPlaying(true);
            audioQueueRef.current = audioUris;
            currentAudioIndexRef.current = 0;
            await playNextAudio();
        } catch (e) {
            setIsPlaying(false);
        }
    }

    function handleCheck() {
        Keyboard.dismiss();
        if (!userInput.trim()) return;
        const isAnswerCorrect = userInput.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

        // Create the correct sentence by replacing the blank with the correct answer
        const correctSentence = correctWords.map((word, index) => {
            if (index === blankIndex) {
                return correctAnswer;
            }
            return word.translations[selectedLanguage];
        }).join(' ');

        setFeedback({
            isChecked: true,
            isCorrect: isAnswerCorrect,
            feedbackText: isAnswerCorrect ? 'Correct!' : "That's not quite right",
            correctAnswer: !isAnswerCorrect ? correctSentence : undefined,
            questionId,
        });
    }

    return (
        <ThemedView style={styles.container}>
            <ThemedText style={styles.title}>Complete the translation</ThemedText>

            <Pressable
                style={styles.audioButton}
                onPress={handlePlayAudio}
                accessibilityLabel="Play audio"
                disabled={isPlaying || !audioUris.length}
            >
                <ThemedText style={styles.audioButtonText}>
                    🔊
                </ThemedText>
            </Pressable>

            <ThemedText style={styles.sentence}>{sentence}</ThemedText>

            <TextInput
                style={styles.input}
                value={userInput}
                onChangeText={setUserInput}
                placeholder="Type the missing word"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isChecked}
                accessibilityLabel="Type the missing word"
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
    audioButton: {
        backgroundColor: '#E0F7FA',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        alignSelf: 'center',
    },
    audioButtonText: {
        fontSize: 32,
        color: '#00796B',
        fontWeight: '600',
        marginBottom: 16,
        alignSelf: 'center',
    },
    sentence: {
        fontSize: 20,
        textAlign: 'center',
        marginVertical: 20,
        lineHeight: 28,
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