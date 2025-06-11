import React from 'react';
import { View, StyleSheet, Pressable, Text, Dimensions, Animated } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { HOST_URL } from '@/config/api';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedbackMessage, FeedbackButton } from './CheckContinueButton';

interface Word {
    id: number;
    image?: string | null;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface MatchPairsQuestionProps {
    words: Word[];
    selectedLanguage: string;
    areResourcesDownloaded: boolean;
    onCheck: () => void;
    matchType?: 'audio' | 'text';
    questionId: string | number;
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

function AudioButton({ audioUrl, isSelected }: { audioUrl?: string, isSelected?: boolean }) {
    const [sound, setSound] = React.useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);

    async function playSound() {
        try {
            if (!audioUrl) return;
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
        return sound ? () => { sound.unloadAsync(); } : undefined;
    }, [sound]);

    return (
        <Pressable
            onPress={playSound}
            style={[styles.audioButton, isSelected && styles.audioButtonSelected]}
            accessibilityLabel="Play word audio"
            disabled={!audioUrl}
        >
            <View style={styles.audioIcon}>
                <Text style={{ color: isSelected ? '#22A9F5' : '#22A9F5', fontSize: 22 }}>🔊</Text>
            </View>
        </Pressable>
    );
}

export function MatchPairsQuestion({
    words,
    selectedLanguage,
    areResourcesDownloaded,
    onCheck,
    matchType = 'audio',
    questionId
}: MatchPairsQuestionProps) {
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = (screenWidth - 48) / 2;
    const [selectedAudioId, setSelectedAudioId] = React.useState<number | null>(null);
    const [disabledLeftIds, setDisabledLeftIds] = React.useState<Set<number>>(new Set());
    const [disabledRightIds, setDisabledRightIds] = React.useState<Set<number>>(new Set());
    const [wrongTranslationId, setWrongTranslationId] = React.useState<number | null>(null);
    const [showFeedback, setShowFeedback] = React.useState(false);
    const [justMatchedId, setJustMatchedId] = React.useState<number | null>(null);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const [isChecked, setIsChecked] = React.useState(false);
    const [isCorrect, setIsCorrect] = React.useState<boolean | null>(null);
    const [correctAnswer, setCorrectAnswer] = React.useState<string | undefined>(undefined);

    // Shuffle array using Fisher-Yates algorithm
    const shuffledWords = React.useMemo(() => {
        const array = [...words];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }, [words]);

    console.log('matchType', matchType);

    // Play feedback sound
    async function playFeedbackSound(type: 'correct' | 'wrong') {
        try {
            const soundObject = new Audio.Sound();
            const source =
                type === 'correct'
                    ? require('../../assets/audio/correct.mp3')
                    : require('../../assets/audio/wrong.mp3');
            await soundObject.loadAsync(source);
            await soundObject.playAsync();
            // Unload after playback
            soundObject.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    soundObject.unloadAsync();
                }
            });
        } catch (e) {
            // fail silently
        }
    }

    const handleAudioCardPress = (wordId: number) => {
        if (disabledLeftIds.has(wordId) || justMatchedId === wordId) return;
        setSelectedAudioId(prev => prev === wordId ? null : wordId);
    };

    const handleTranslationCardPress = (wordId: number) => {
        if (disabledRightIds.has(wordId) || justMatchedId === wordId || selectedAudioId === null) return;

        if (selectedAudioId === wordId) {
            setJustMatchedId(wordId);
            setSelectedAudioId(null);
            playFeedbackSound('correct');
            setTimeout(() => {
                setDisabledLeftIds(prev => new Set([...prev, wordId]));
                setDisabledRightIds(prev => new Set([...prev, wordId]));
                setJustMatchedId(null);
            }, 1000); // 1 second
        } else {
            setWrongTranslationId(wordId);
            setShowFeedback(true);
            setSelectedAudioId(null);
            playFeedbackSound('wrong');
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.delay(1000), // 1 second
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start(() => {
                setWrongTranslationId(null);
                setShowFeedback(false);
            });
        }
    };

    const getCardStyle = (wordId: number, isAudio: boolean) => {
        const baseStyle = [styles.card, { width: cardWidth }];

        if (justMatchedId === wordId) {
            return [...baseStyle, styles.justMatchedCard];
        }

        if ((isAudio && disabledLeftIds.has(wordId)) || (!isAudio && disabledRightIds.has(wordId))) {
            return [...baseStyle, styles.disabledCard];
        }

        if (!isAudio && wrongTranslationId === wordId) {
            return [...baseStyle, styles.wrongCard];
        }

        if (isAudio && selectedAudioId === wordId) {
            return [...baseStyle, styles.selectedCard];
        }

        return baseStyle;
    };

    function handleCheck() {
        const allMatched = disabledLeftIds.size === words.length && disabledRightIds.size === words.length;
        setIsChecked(true);
        setIsCorrect(allMatched);
        if (!allMatched) {
            setCorrectAnswer(words.map(w => w.translations['en']).join(', '));
        } else {
            setCorrectAnswer(undefined);
        }
    }

    function handleContinue() {
        setIsChecked(false);
        setIsCorrect(null);
        setCorrectAnswer(undefined);
        onCheck();
    }

    return (
        <ThemedView style={styles.container}>
            <ThemedText style={styles.title} children="Tap the matching pairs" />
            <View style={styles.pairRowHeader}>
                <View style={{ width: cardWidth }} />
                <View style={{ width: cardWidth }} />
            </View>
            <View style={styles.pairsGrid}>
                {words.map((word, idx) => {
                    const audioFile = word.audio?.[selectedLanguage];
                    const audioUrl = useAudioUri(audioFile, areResourcesDownloaded);
                    const englishTranslation = word.translations['en'] || '';
                    const selectedLanguageWord = word.translations[selectedLanguage] || '';
                    const isJustMatched = justMatchedId === word.id;
                    const isLeftDisabled = disabledLeftIds.has(word.id) || isJustMatched;
                    const isRightDisabled = disabledRightIds.has(shuffledWords[idx].id) || isJustMatched;
                    const isSelected = selectedAudioId === word.id;

                    return (
                        <View style={styles.pairRow} key={word.id}>
                            <Pressable
                                style={getCardStyle(word.id, true)}
                                onPress={() => handleAudioCardPress(word.id)}
                                disabled={isLeftDisabled}
                            >
                                {matchType === 'audio' ? (
                                    <AudioButton audioUrl={audioUrl} isSelected={isSelected} />
                                ) : (
                                    <ThemedText style={styles.translationText} children={selectedLanguageWord} />
                                )}
                            </Pressable>
                            <Pressable
                                style={getCardStyle(shuffledWords[idx].id, false)}
                                onPress={() => handleTranslationCardPress(shuffledWords[idx].id)}
                                disabled={isRightDisabled}
                            >
                                <ThemedText style={styles.translationText} children={shuffledWords[idx].translations['en'] || ''} />
                            </Pressable>
                        </View>
                    );
                })}
            </View>
            <FeedbackMessage
                isChecked={isChecked}
                isCorrect={isCorrect}
                feedbackText={isCorrect ? 'All pairs matched!' : 'Some pairs are not matched yet.'}
                correctAnswer={correctAnswer}
                questionId={questionId}
            />
            <FeedbackButton
                isChecked={isChecked}
                isCorrect={isCorrect}
                isDisabled={disabledLeftIds.size + disabledRightIds.size < words.length * 2}
                onCheck={handleCheck}
                onContinue={handleContinue}
                questionId={questionId}
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 16,
        flex: 1,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'left',
    },
    pairsGrid: {
        flexDirection: 'column',
        gap: 12,
        marginBottom: 24,
    },
    pairRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        paddingVertical: 16,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        height: 80,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    audioButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    audioIcon: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    translationText: {
        fontSize: 18,
        color: '#222',
        fontWeight: '500',
        textAlign: 'center',
    },
    checkButton: {
        backgroundColor: '#E5E7EB',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 16,
    },
    checkButtonText: {
        color: '#bbb',
        fontWeight: 'bold',
        fontSize: 18,
        letterSpacing: 1,
    },
    pairRowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 0,
    },
    selectedCard: {
        borderColor: '#22A9F5',
        borderWidth: 2,
    },
    matchedCard: {
        borderColor: '#34D399',
        borderWidth: 2,
        backgroundColor: '#F0FDF4',
    },
    checkButtonActive: {
        backgroundColor: '#22A9F5',
    },
    checkButtonTextActive: {
        color: '#fff',
    },
    audioButtonSelected: {
        // Optionally add a subtle highlight if you want
        // backgroundColor: '#E0F2FE',
    },
    wrongCard: {
        borderColor: '#EF4444',
        borderWidth: 2,
        backgroundColor: '#FEF2F2',
    },
    feedbackContainer: {
        backgroundColor: '#FEE2E2',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 4,
        alignSelf: 'stretch',
    },
    feedbackText: {
        color: '#DC2626',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 0,
    },
    dismissButton: {
        backgroundColor: '#22A9F5',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    dismissButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    justMatchedCard: {
        borderColor: '#34D399',
        borderWidth: 2,
        backgroundColor: '#F0FDF4',
    },
    disabledCard: {
        backgroundColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        opacity: 0.6,
    },
}); 