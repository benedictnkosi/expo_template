import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Image, Pressable, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Audio } from 'expo-av';
import { HOST_URL } from '@/config/api';

const HOST_PREFIX = `${HOST_URL}/api/word/audio/get/`;

interface AudioButtonProps {
    audioUrls?: string[];
    accessibilityLabel: string;
    playbackRate?: number;
    autoPlay?: boolean;
}

function AudioButton({ audioUrls, accessibilityLabel, playbackRate = 1.2, autoPlay = false }: AudioButtonProps) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const queueRef = useRef<string[]>([]);
    const currentIndexRef = useRef(0);

    useEffect(() => {
        if (audioUrls) {
            queueRef.current = [...audioUrls];
            currentIndexRef.current = 0;
            setCurrentIndex(0);
        }
    }, [audioUrls]);

    async function playNextInQueue() {
        if (!queueRef.current.length || currentIndexRef.current >= queueRef.current.length) {
            setIsPlaying(false);
            setCurrentIndex(0);
            currentIndexRef.current = 0;
            if (sound) {
                await sound.unloadAsync();
                setSound(null);
            }
            return;
        }

        const currentUrl = queueRef.current[currentIndexRef.current];
        try {
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: currentUrl },
                { shouldPlay: true }
            );
            setSound(newSound);
            setIsPlaying(true);

            if (playbackRate && playbackRate !== 1.2) {
                await newSound.setRateAsync(playbackRate, true);
            }

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    newSound.unloadAsync();
                    currentIndexRef.current += 1;
                    setCurrentIndex(currentIndexRef.current);

                    if (currentIndexRef.current < queueRef.current.length) {
                        playNextInQueue();
                    } else {
                        setIsPlaying(false);
                        setCurrentIndex(0);
                        currentIndexRef.current = 0;
                        setSound(null);
                    }
                }
            });
        } catch (error) {
            console.error('Error playing audio:', error);
            currentIndexRef.current += 1;
            setCurrentIndex(currentIndexRef.current);

            if (currentIndexRef.current < queueRef.current.length) {
                playNextInQueue();
            } else {
                setIsPlaying(false);
                setCurrentIndex(0);
                currentIndexRef.current = 0;
                setSound(null);
            }
        }
    }

    async function handlePlayPress() {
        if (!audioUrls?.length) return;

        if (isPlaying) {
            if (sound) {
                await sound.stopAsync();
                await sound.unloadAsync();
                setSound(null);
            }
            setIsPlaying(false);
            setCurrentIndex(0);
            currentIndexRef.current = 0;
            return;
        }

        setCurrentIndex(0);
        currentIndexRef.current = 0;
        playNextInQueue();
    }

    useEffect(() => {
        if (autoPlay && audioUrls?.length) {
            handlePlayPress();
        }
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [audioUrls, autoPlay]);

    return (
        <Pressable
            onPress={handlePlayPress}
            style={styles.audioButton}
            accessibilityLabel={accessibilityLabel}
            disabled={!audioUrls?.length}
        >
            <ThemedText style={{ fontSize: 32 }}>{accessibilityLabel === 'Play slow audio' ? '🐢' : '🔊'}</ThemedText>
        </Pressable>
    );
}

interface AudioPlayerProps {
    audioUrls?: string[];
    characterImage?: any;
    autoPlay?: boolean;
    showGif?: boolean;
    text?: string;
}

export function AudioPlayer({
    audioUrls,
    characterImage = require('@/assets/images/bunny-waiting.gif'),
    autoPlay = true,
    showGif = true,
    text
}: AudioPlayerProps) {
    const colorScheme = useColorScheme();
    const prefixedAudioUrls = useMemo(() =>
        audioUrls?.map(url => `${HOST_PREFIX}${url}`),
        [audioUrls]
    );

    const characterImageSource = useMemo(() => {
        console.log('colorScheme', colorScheme);
        if (colorScheme === 'dark') {
            return require('@/assets/images/impatient-kitty.gif');
        }
        return characterImage;
    }, [colorScheme, characterImage]);

    console.log('audioUrls', audioUrls);

    return (
        <View style={styles.speechBubbleRow}>
            {showGif && (
                <Image
                    source={characterImageSource}
                    style={styles.characterImage}
                    accessibilityLabel="Character"
                />
            )}
            <View style={[styles.speechBubbleContainer, !showGif && styles.speechBubbleContainerNoGif]}>
                <View style={styles.speechBubble}>
                    {text && (
                        <ThemedText style={styles.text}>{text}</ThemedText>
                    )}
                    <View style={styles.audioButtonsContainer}>
                        <AudioButton
                            audioUrls={prefixedAudioUrls}
                            accessibilityLabel="Play audio"
                            playbackRate={1.2}
                            autoPlay={autoPlay}
                        />
                        <AudioButton
                            audioUrls={prefixedAudioUrls}
                            accessibilityLabel="Play slow audio"
                            playbackRate={0.8}
                            autoPlay={false}
                        />
                    </View>
                </View>
                <View style={styles.speechBubbleTail} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
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
    speechBubbleContainerNoGif: {
        marginLeft: 0,
    },
    speechBubble: {
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 18,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignSelf: 'flex-start',
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
    audioButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    audioButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    text: {
        fontSize: 16,
        marginBottom: 8,
    },
}); 