import React, { useEffect } from 'react';
import { StyleSheet, Pressable, View, Dimensions, Text, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HOST_URL } from '@/config/api';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useFeedback } from '../contexts/FeedbackContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Word {
    id: number;
    image: string;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface SelectImageQuestionProps {
    words: Word[];
    options: string[];
    correctOption: number | null;
    onSelect?: (index: number) => void;
    selectedLanguage: string;
    areResourcesDownloaded: boolean;
    questionId: string;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
}

function useAudioUri(audioFile: string | undefined, areResourcesDownloaded: boolean) {
    const [uri, setUri] = React.useState<string | undefined>(undefined);

    React.useEffect(() => {
        if (!audioFile) {
            setUri(undefined);
            return;
        }
        if (areResourcesDownloaded) {
            const localUri = `${FileSystem.documentDirectory}audio/${audioFile}`;
            FileSystem.getInfoAsync(localUri).then(info => {
                if (info.exists) setUri(localUri);
                else setUri(`${HOST_URL}/api/word/audio/get/${audioFile}`);
            });
        } else {
            setUri(`${HOST_URL}/api/word/audio/get/${audioFile}`);
        }
    }, [audioFile, areResourcesDownloaded]);

    return uri;
}

function AudioButton({ audioUrl, autoPlay = false }: { audioUrl: string; autoPlay?: boolean }) {
    const [sound, setSound] = React.useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);

    async function playSound() {
        try {
            if (sound) {
                if (isPlaying) {
                    await sound.stopAsync();
                    setIsPlaying(false);
                } else {
                    await sound.playAsync();
                    setIsPlaying(true);
                }
            } else {
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: audioUrl },
                    { shouldPlay: true }
                );
                setSound(newSound);
                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }

    React.useEffect(() => {
        if (autoPlay && audioUrl) {
            playSound();
        }
        return sound
            ? () => {
                sound.unloadAsync();
            }
            : undefined;
    }, [audioUrl, autoPlay]);

    return (
        <Pressable onPress={playSound} style={styles.bigAudioButton} accessibilityLabel="Play word audio">
            <Ionicons
                name="volume-high"
                size={28}
                color="#fff"
            />
        </Pressable>
    );
}

function AudioPrompt({ word, audioUrl, autoPlay = false }: { word: string; audioUrl: string; autoPlay?: boolean }) {
    return (
        <View style={styles.audioPromptContainer}>
            <AudioButton audioUrl={audioUrl} autoPlay={autoPlay} />
            <Text style={styles.audioPromptWord}>{word}</Text>
        </View>
    );
}

export function SelectImageQuestion({
    words,
    options,
    correctOption,
    selectedLanguage,
    areResourcesDownloaded,
    questionId,
    setOnCheck,
    setOnContinue,
}: SelectImageQuestionProps) {
    const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
    const { setFeedback, resetFeedback } = useFeedback();
    const insets = useSafeAreaInsets();

    console.log('SelectImageQuestion options:', options);
    console.log('SelectImageQuestion words:', words);

    function handleSelectOption(index: number) {
        setSelectedIndex(index);
    }

    function handleCheckOrContinue() {
        if (selectedIndex === null) return;
        const isAnswerCorrect = selectedIndex === correctOption;
        const correctLabel = correctOption !== null ? words[correctOption]?.translations['en'] || '' : '';
        setFeedback({
            isChecked: true,
            isCorrect: isAnswerCorrect,
            feedbackText: isAnswerCorrect ? 'Correct!' : "That's not quite right",
            correctAnswer: !isAnswerCorrect ? correctLabel : undefined,
            questionId,
        });
    }

    function resetQuestion() {
        resetFeedback();
        setSelectedIndex(null);
    }

    // Find the correct word and its audio/label
    let audioPrompt: React.ReactNode = null;
    let correctIndex: number | null = null;
    if (
        words.length > 0 &&
        options.length > 0 &&
        correctOption !== null &&
        correctOption < options.length
    ) {
        const correctWord = words.find(
            (word) => String(word.id) === String(options[correctOption])
        );
        correctIndex = words.findIndex((word) => String(word.id) === String(options[correctOption]));
        const audioFile = correctWord?.audio[selectedLanguage];
        const audioUrl = useAudioUri(audioFile, areResourcesDownloaded);
        if (audioUrl && correctWord?.translations[selectedLanguage]) {
            audioPrompt = <AudioPrompt word={correctWord.translations[selectedLanguage]} audioUrl={audioUrl} autoPlay={true} />;
        }
    }

    React.useEffect(() => {
        setOnCheck?.(handleCheckOrContinue);
        setOnContinue?.(resetQuestion);
    }, [setOnCheck, setOnContinue, handleCheckOrContinue, resetQuestion]);

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <ThemedText style={styles.title}>Select the correct image</ThemedText>
                {audioPrompt}
                <View style={styles.optionsGrid}>
                    {options.map((optionId, index) => {
                        const word = words.find(w => String(w.id) === String(optionId));
                        console.log(`Option index ${index}: optionId=${optionId}, word=`, word);
                        if (!word) return null;
                        const selectedLanguageWord = word.translations[selectedLanguage];
                        const isSelected = selectedIndex === index;
                        const isCorrect = index === correctIndex;

                        return (
                            <Pressable
                                key={`option-${optionId}-${index}`}
                                style={[
                                    styles.optionCard,
                                    isSelected && styles.selectedOptionCard,
                                    isSelected && !isCorrect && styles.incorrectOptionCard,
                                ]}
                                onPress={() => handleSelectOption(index)}
                                disabled={selectedIndex !== null}
                                accessibilityLabel={`Select ${selectedLanguageWord}`}
                            >
                                <Image
                                    source={{ uri: `${HOST_URL}/api/word/image/get/${word.image}` }}
                                    style={styles.optionImage}
                                    contentFit="contain"
                                    transition={200}
                                />
                                <View style={styles.optionTextContainer}>
                                    <ThemedText style={styles.englishTranslation}>{word.translations['en']}</ThemedText>
                                </View>
                            </Pressable>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {

        backgroundColor: '#fff',
    },
    scrollView: {
        // flex: 1, // Removed for debugging
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 120,
        gap: 16,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'left',
    },
    audioPromptContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        gap: 12,
    },
    bigAudioButton: {
        backgroundColor: '#22A9F5',
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
        shadowColor: '#22A9F5',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    audioPromptWord: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#22A9F5',
        textDecorationLine: 'underline',
        textDecorationStyle: 'dashed',
        textDecorationColor: '#22A9F5',
        marginLeft: 2,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
    },
    optionCard: {
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        width: '45%',
        aspectRatio: 1,
    },
    selectedOptionCard: {
        borderColor: '#22A9F5',
        borderWidth: 3,
    },
    incorrectOptionCard: {
        borderColor: '#EF4444',
        borderWidth: 3,
    },
    optionImage: {
        width: '100%',
        height: undefined,
        aspectRatio: 1,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        color: '#222',
    },
    optionTextContainer: {
        padding: 8,
        gap: 4,
    },
    englishTranslation: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
}); 