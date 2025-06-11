import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import { Audio } from 'expo-av';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedbackMessage, FeedbackButton } from './CheckContinueButton';

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
    onContinue: () => void;
    questionId: string;
}

function getWordById(words: Word[], id: string | number) {
    return words.find(w => w.id === Number(id));
}

function AudioButton({ audioUrl, accessibilityLabel, playbackRate = 1 }: { audioUrl?: string; accessibilityLabel: string; playbackRate?: number }) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    async function handlePlayPress() {
        if (!audioUrl) return;
        if (isPlaying) {
            if (sound) {
                await sound.stopAsync();
                await sound.unloadAsync();
            }
            setIsPlaying(false);
            return;
        }
        try {
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                { shouldPlay: true }
            );
            setSound(newSound);
            setIsPlaying(true);
            if (playbackRate && playbackRate !== 1) {
                await newSound.setRateAsync(playbackRate, true);
            }
            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsPlaying(false);
                    newSound.unloadAsync();
                }
            });
        } catch (error) {
            setIsPlaying(false);
        }
    }

    useEffect(() => {
        return sound ? () => { sound.unloadAsync(); } : undefined;
    }, [sound]);

    return (
        <Pressable
            onPress={handlePlayPress}
            style={styles.audioButton}
            accessibilityLabel={accessibilityLabel}
            disabled={!audioUrl}
        >
            {/* Placeholder icon, replace with SVG or image as needed */}
            <ThemedText style={{ fontSize: 32 }}>{accessibilityLabel === 'Play slow audio' ? '🐢' : '🔊'}</ThemedText>
        </Pressable>
    );
}

export function TapWhatYouHearQuestion({ words, sentenceWords, options, selectedLanguage, onContinue, questionId }: TapWhatYouHearQuestionProps) {
    const [selectedWordIds, setSelectedWordIds] = useState<number[]>([]);
    const [isChecked, setIsChecked] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

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
        setIsCorrect(isAnswerCorrect);
        setIsChecked(true);
    }

    function handleContinue() {
        setIsChecked(false);
        setIsCorrect(null);
        setSelectedWordIds([]);
        onContinue();
    }

    const correctAnswer = sentenceWords
        .map(id => {
            const word = getWordById(words, id);
            if (!word) return '';
            return word.translations[selectedLanguage];
        })
        .join(' ');

    return (
        <ThemedView style={styles.container}>
            <ThemedText style={styles.title}>Tap what you hear</ThemedText>
            <View style={styles.speechBubbleRow}>
                {/* Character image placeholder */}
                <Image
                    source={require('@/assets/images/bunny-waiting.gif')}
                    style={styles.characterImage}
                    accessibilityLabel="Character"
                />
                <View style={styles.speechBubbleContainer}>
                    <View style={styles.speechBubble}>
                        <AudioButton audioUrl={audioUrl} accessibilityLabel="Play audio" playbackRate={1} />
                        <AudioButton audioUrl={slowAudioUrl} accessibilityLabel="Play slow audio" playbackRate={0.5} />
                    </View>
                    <View style={styles.speechBubbleTail} />
                </View>
            </View>
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
            {/* Feedback area to prevent overlap */}
            <View style={styles.feedbackArea}>
                <FeedbackMessage
                    isChecked={isChecked}
                    isCorrect={isCorrect}
                    feedbackText={isChecked ? (isCorrect ? 'Correct!' : "That's not quite right") : undefined}
                    correctAnswer={!isCorrect ? correctAnswer : undefined}
                    questionId={questionId}
                />
            </View>
            {/* FeedbackButton absolutely positioned at the bottom */}
            <View style={styles.feedbackContainer}>
                <FeedbackButton
                    isChecked={isChecked}
                    isCorrect={isCorrect}
                    isDisabled={selectedWordIds.length === 0}
                    onCheck={handleCheck}
                    onContinue={handleContinue}
                    questionId={questionId}
                />
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 16,
        flex: 1,
        backgroundColor: '#fff',
        position: 'relative',
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
    characterImage: {
        width: 96,
        height: 96,
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
    audioButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 20,
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
    feedbackArea: {
        minHeight: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 0,
        marginTop: 8,
    },
    feedbackContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        zIndex: 10,
        alignItems: 'center',
    },
}); 