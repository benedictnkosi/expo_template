import React from 'react';
import { StyleSheet, Pressable, View, Dimensions, Text, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HOST_URL } from '@/config/api';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { FeedbackMessage, FeedbackButton } from './CheckContinueButton';
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
    onContinue: () => void;
    questionId: string;
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
    onContinue,
    questionId,
}: SelectImageQuestionProps) {
    const screenWidth = Dimensions.get('window').width;
    const imageSize = (screenWidth - 48) / 2;
    const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
    const [isChecked, setIsChecked] = React.useState(false);
    const [isCorrect, setIsCorrect] = React.useState(false);
    const insets = useSafeAreaInsets();

    React.useEffect(() => {
        setSelectedIndex(null);
        setIsChecked(false);
        setIsCorrect(false);
    }, [words, options, correctOption]);

    // Find the correct word and its audio/label
    let audioPrompt: React.ReactNode = null;
    let correctLabel = '';
    let correctIndex: number | null = null;
    if (
        correctOption !== null &&
        correctOption >= 0 &&
        correctOption < options.length
    ) {
        const correctWord = words.find(
            (word) => String(word.id) === String(options[correctOption])
        );
        correctLabel = correctWord?.translations['en'] || '';
        correctIndex = words.findIndex((word) => String(word.id) === String(options[correctOption]));
        const audioFile = correctWord?.audio[selectedLanguage];
        const audioUrl = useAudioUri(audioFile, areResourcesDownloaded);
        if (audioUrl && correctLabel) {
            audioPrompt = <AudioPrompt word={correctLabel} audioUrl={audioUrl} autoPlay={true} />;
        }
    }

    const handleSelect = (index: number) => {
        if (!isChecked) setSelectedIndex(index);
    };

    const handleCheckOrContinue = () => {
        if (!isChecked && selectedIndex !== null) {
            setIsCorrect(selectedIndex === correctIndex);
            setIsChecked(true);
        } else if (isChecked) {
            onContinue();
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <ScrollView
                contentContainerStyle={{
                    padding: 16,
                    paddingBottom: 120 + insets.bottom, // enough space for sticky button
                    gap: 16,
                }}
                keyboardShouldPersistTaps="handled"
            >
                <ThemedText style={styles.title}>Select the correct image</ThemedText>
                {audioPrompt}
                <View style={styles.grid}>
                    {words.map((word, index) => {
                        const englishTranslation = word.translations['en'];
                        const localImageUri = `${FileSystem.documentDirectory}image/${word.image}`;
                        let borderStyle = {};
                        if (isChecked) {
                            if (index === correctIndex) borderStyle = styles.imageContainerCorrect;
                            if (!isCorrect && selectedIndex === index && selectedIndex !== correctIndex) borderStyle = styles.imageContainerIncorrect;
                        } else if (selectedIndex === index) {
                            borderStyle = styles.imageContainerSelected;
                        }
                        return (
                            <Pressable
                                key={index}
                                style={({ pressed }) => [
                                    styles.imageContainer,
                                    { width: imageSize },
                                    pressed && styles.imageContainerPressed,
                                    borderStyle,
                                ]}
                                onPress={() => handleSelect(index)}
                                accessibilityLabel={englishTranslation}
                            >
                                <View style={styles.imageWrapper}>
                                    <Image
                                        source={{ uri: localImageUri }}
                                        style={styles.image}
                                        contentFit="cover"
                                        onError={(error) => {
                                            console.error(`[SelectImageQuestion] Error loading image ${word.image}:`, error);
                                            return (
                                                <Image
                                                    source={{ uri: `${HOST_URL}/api/images/${word.image}` }}
                                                    style={styles.image}
                                                    contentFit="cover"
                                                />
                                            );
                                        }}
                                    />
                                </View>
                                <ThemedView style={styles.translationContainer}>
                                    <ThemedText style={styles.englishTranslation}>{englishTranslation}</ThemedText>
                                </ThemedView>
                            </Pressable>
                        );
                    })}
                </View>
                <FeedbackMessage
                    isChecked={isChecked}
                    isCorrect={isCorrect}
                    feedbackText={isChecked ? (isCorrect ? 'Correct!' : "That's not quite right") : undefined}
                    correctAnswer={!isCorrect ? correctLabel : undefined}
                    questionId={questionId}
                />
            </ScrollView>
            <FeedbackButton
                isChecked={isChecked}
                isCorrect={isCorrect}
                isDisabled={selectedIndex === null}
                onCheck={handleCheckOrContinue}
                onContinue={handleCheckOrContinue}
                questionId={questionId}
            />
        </View>
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
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
    },
    imageContainer: {
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: '#fff',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 8,
        alignItems: 'center',
        paddingBottom: 8,
    },
    imageContainerPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    imageContainerSelected: {
        borderColor: '#22A9F5',
        borderWidth: 3,
    },
    imageContainerCorrect: {
        borderColor: '#4CAF50',
        borderWidth: 3,
    },
    imageContainerIncorrect: {
        borderColor: '#F44336',
        borderWidth: 3,
    },
    imageWrapper: {
        width: '100%',
        aspectRatio: 1,
        backgroundColor: '#F3F4F6',
    },
    image: {
        width: '100%',
        height: '100%',
        backgroundColor: '#F3F4F6',
    },
    translationContainer: {
        paddingVertical: 4,
        alignItems: 'center',
        backgroundColor: 'transparent',
        minHeight: 24,
        justifyContent: 'center',
    },
    englishTranslation: {
        fontSize: 13,
        color: '#888',
        textAlign: 'center',
        marginTop: 2,
        fontWeight: '500',
    },
    stickyFooter: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
}); 