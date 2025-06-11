import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { Audio } from 'expo-av';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useFeedback } from '../contexts/FeedbackContext';

interface Word {
    id: number;
    image?: string | null;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface TranslateQuestionProps {
    words: Word[];
    options: (string | number)[];
    selectedLanguage: string;
    direction: 'from_english' | 'to_english';
    sentenceWords?: (string | number)[] | null;
    onSelect?: (optionIds: number[]) => void;
    selectedOption?: number | null;
    questionId: string | number;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
}

function useAudioUri(audioFile: string | undefined) {
    const [uri, setUri] = React.useState<string | undefined>(undefined);
    React.useEffect(() => {
        if (!audioFile) {
            setUri(undefined);
            return;
        }
        setUri(audioFile);
    }, [audioFile]);
    return uri;
}

function AudioButton({ audioUrls }: { audioUrls: string[] }) {
    const [sound, setSound] = React.useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentIndex, setCurrentIndex] = React.useState(0);

    async function playNextSound() {
        if (currentIndex >= audioUrls.length) {
            setCurrentIndex(0);
            setIsPlaying(false);
            return;
        }

        try {
            if (sound) {
                await sound.unloadAsync();
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioUrls[currentIndex] },
                { shouldPlay: true }
            );

            setSound(newSound);
            setIsPlaying(true);

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setCurrentIndex(prev => prev + 1);
                    playNextSound();
                }
            });
        } catch (error) {
            // fail silently
            setCurrentIndex(prev => prev + 1);
            playNextSound();
        }
    }

    async function handlePlayPress() {
        if (isPlaying) {
            if (sound) {
                await sound.stopAsync();
                await sound.unloadAsync();
            }
            setIsPlaying(false);
            setCurrentIndex(0);
        } else {
            setCurrentIndex(0);
            playNextSound();
        }
    }

    React.useEffect(() => {
        return sound ? () => { sound.unloadAsync(); } : undefined;
    }, [sound]);

    return (
        <Pressable onPress={handlePlayPress} style={styles.audioButton} accessibilityLabel="Play sentence audio" disabled={audioUrls.length === 0}>
            <ThemedText style={{ fontSize: 22 }}>🔊</ThemedText>
        </Pressable>
    );
}

export function TranslateQuestion({ words, options, selectedLanguage, direction, sentenceWords, onSelect, selectedOption, questionId, setOnCheck, setOnContinue }: TranslateQuestionProps) {
    const [selectedWordIds, setSelectedWordIds] = React.useState<number[]>([]);
    const { setFeedback, resetFeedback } = useFeedback();

    // Helper: get word by id
    function getWordById(id: string | number) {
        return words.find(w => w.id === Number(id));
    }

    // Randomly select one of the three GIFs
    const gifSources = [
        require('@/assets/images/impatient-kitty.gif'),
        require('@/assets/images/bunny-waiting.gif'),
        require('@/assets/images/bubu-dudu-sseeyall.gif'),
    ];
    const selectedGif = useMemo(
        () => gifSources[Math.floor(Math.random() * gifSources.length)],
        []
    );

    const correctAnswer = sentenceWords?.map(id => {
        const word = getWordById(id);
        if (!word) return '';
        return (direction === 'from_english'
            ? word.translations[selectedLanguage]
            : word.translations['en']);
    }).join(' ');

    // Get all audio URLs for the sentence
    const audioUrls = useMemo(() => {
        if (!sentenceWords || direction === 'from_english') return [];
        return sentenceWords
            .map(id => {
                const word = getWordById(id);
                return word?.audio?.[selectedLanguage];
            })
            .filter((url): url is string => !!url);
    }, [sentenceWords, direction, selectedLanguage]);

    // Sentence prompt row (top)
    let promptRow = null;
    if (sentenceWords && sentenceWords.length > 0) {
        const sentence = sentenceWords
            .map(id => {
                const word = getWordById(id);
                if (!word) return '';
                return direction === 'from_english'
                    ? word.translations['en']
                    : word.translations[selectedLanguage];
            })
            .join(' ');
        promptRow = (
            <View style={styles.speechBubbleRow}>
                <Image
                    source={selectedGif}
                    style={styles.kittyGif}
                    accessibilityLabel="Cute waiting character"
                />
                <View style={styles.speechBubbleContainer}>
                    <View style={styles.speechBubble}>
                        <ThemedText style={styles.speechBubbleText}>{sentence}</ThemedText>
                        {direction === 'to_english' && audioUrls.length > 0 && (
                            <AudioButton audioUrls={audioUrls} />
                        )}
                    </View>
                    <View style={styles.speechBubbleTail} />
                </View>
            </View>
        );
    }

    // Option cards (bottom)
    const availableOptions = options.filter(
        (id) => !selectedWordIds.includes(Number(id))
    );

    function handleSelectOption(id: string | number) {
        setSelectedWordIds(prev => [...prev, Number(id)]);
    }

    function handleRemoveSelected(idx: number) {
        setSelectedWordIds(prev => prev.filter((_, i) => i !== idx));
    }

    function handleCheck() {
        if (!sentenceWords) return;
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

    // Auto-play on mount
    useEffect(() => {
        if (direction === 'to_english' && audioUrls.length > 0) {
            const playAll = async () => {
                for (const url of audioUrls) {
                    try {
                        const { sound } = await Audio.Sound.createAsync(
                            { uri: url },
                            { shouldPlay: true }
                        );
                        await new Promise(resolve => {
                            sound.setOnPlaybackStatusUpdate(status => {
                                if (status.isLoaded && status.didJustFinish) {
                                    resolve(null);
                                }
                            });
                        });
                        await sound.unloadAsync();
                    } catch (error) {
                        // fail silently
                    }
                }
            };
            playAll();
        }
    }, [direction, audioUrls]);

    useEffect(() => {
        setOnCheck?.(handleCheck);
        setOnContinue?.(resetQuestion);
    }, [setOnCheck, setOnContinue, handleCheck, resetQuestion]);

    return (
        <ThemedView style={styles.container}>
            <ThemedText style={styles.title}>Translate this sentence</ThemedText>
            {promptRow}
            {/* Selected answer row */}
            <View style={styles.selectedRow}>
                {selectedWordIds.map((id, idx) => {
                    const word = getWordById(id);
                    if (!word) return null;
                    const text = direction === 'from_english' ? word.translations[selectedLanguage] : word.translations['en'];
                    return (
                        <Pressable key={idx} style={styles.selectedCard} onPress={() => handleRemoveSelected(idx)}>
                            <ThemedText style={styles.selectedCardText}>{text}</ThemedText>
                        </Pressable>
                    );
                })}
            </View>
            {/* Duolingo-style single line for the answer */}
            <View style={styles.singleAnswerLine} />
            {/* Option cards */}
            <View style={styles.optionsGrid}>
                {availableOptions.map((id, idx) => {
                    const word = getWordById(id);
                    if (!word) return null;
                    const text = direction === 'from_english' ? word.translations[selectedLanguage] : word.translations['en'];
                    return (
                        <Pressable key={id} style={styles.optionCard} onPress={() => handleSelectOption(id)}>
                            <ThemedText style={styles.optionText}>{text}</ThemedText>
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
        position: 'relative',
        paddingBottom: 96,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'left',
    },
    speechBubbleRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 12,
        marginTop: 8,
        gap: 8,
    },
    kittyGif: {
        width: 128,
        height: 128,
        marginRight: 4,
    },
    speechBubbleContainer: {
        alignItems: 'flex-start',
        flex: 1,
        marginBottom: 48,
    },
    speechBubble: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    speechBubbleText: {
        fontSize: 20,
        color: '#222',
        fontWeight: '500',
        flex: 1,
    },
    speechBubbleTail: {
        width: 0,
        height: 0,
        borderTopWidth: 12,
        borderTopColor: '#E5E7EB',
        borderLeftWidth: 0,
        borderLeftColor: 'transparent',
        borderRightWidth: 16,
        borderRightColor: 'transparent',
        marginLeft: 24,
        marginTop: -2,
    },
    audioButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 20,
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
        marginBottom: 80,
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