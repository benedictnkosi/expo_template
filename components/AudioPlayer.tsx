import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/contexts/ThemeContext';

interface AudioPlayerProps {
    audioUrl: string;
    imageUrl?: string;
    title?: string;
}

export function AudioPlayer({ audioUrl, imageUrl, title }: AudioPlayerProps) {
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const { colors } = useTheme();

    const SKIP_DURATION = 5000; // 5 seconds in milliseconds

    useEffect(() => {
        return sound
            ? () => {
                sound.unloadAsync();
            }
            : undefined;
    }, [sound]);

    function formatTime(milliseconds: number): string {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    async function playSound() {
        try {
            setIsLoading(true);
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                { shouldPlay: true }
            );
            setSound(newSound);
            setIsPlaying(true);
            setIsLoading(false);

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                    setPosition(status.positionMillis);
                    setDuration(status.durationMillis || 0);
                    if (status.didJustFinish) {
                        setIsPlaying(false);
                    }
                }
            });
        } catch (error) {
            console.error('Error playing sound:', error);
            setIsLoading(false);
        }
    }

    async function stopSound() {
        if (sound) {
            await sound.stopAsync();
            setIsPlaying(false);
        }
    }

    async function rewindSound() {
        if (sound) {
            const status = await sound.getStatusAsync();
            if (status.isLoaded) {
                const newPosition = Math.max(0, status.positionMillis - SKIP_DURATION);
                await sound.setPositionAsync(newPosition);
            }
        }
    }

    async function fastForwardSound() {
        if (sound) {
            const status = await sound.getStatusAsync();
            if (status.isLoaded) {
                const newPosition = Math.min(
                    status.durationMillis || 0,
                    status.positionMillis + SKIP_DURATION
                );
                await sound.setPositionAsync(newPosition);
            }
        }
    }

    const progress = duration > 0 ? (position / duration) * 100 : 0;

    return (
        <View style={styles.container}>
            {imageUrl && (
                <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                />
            )}
            <View style={styles.controlsContainer}>
                {title && (
                    <ThemedText style={styles.title}>{title}</ThemedText>
                )}
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${progress}%`,
                                    backgroundColor: colors.primary
                                }
                            ]}
                        />
                    </View>
                    <View style={styles.timeContainer}>
                        <ThemedText style={styles.timeText}>{formatTime(position)}</ThemedText>
                        <ThemedText style={styles.timeText}>{formatTime(duration)}</ThemedText>
                    </View>
                </View>
                <View style={styles.controlsRow}>
                    <TouchableOpacity
                        onPress={rewindSound}
                        style={[styles.skipButton, { borderColor: colors.primary }]}
                        disabled={!sound || isLoading}
                    >
                        <View style={styles.skipContent}>
                            <Ionicons
                                name="play-back"
                                size={16}
                                color={colors.primary}
                                style={styles.skipIcon}
                            />
                            <ThemedText style={[styles.skipText, { color: colors.primary }]}>
                                5
                            </ThemedText>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={isPlaying ? stopSound : playSound}
                        style={[styles.playButton, { backgroundColor: colors.primary }]}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Ionicons name="hourglass-outline" size={24} color={colors.text} />
                        ) : isPlaying ? (
                            <Ionicons name="pause" size={24} color={colors.text} />
                        ) : (
                            <Ionicons name="play" size={24} color={colors.text} />
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={fastForwardSound}
                        style={[styles.skipButton, { borderColor: colors.primary }]}
                        disabled={!sound || isLoading}
                    >
                        <View style={styles.skipContent}>
                            <Ionicons
                                name="play-forward"
                                size={16}
                                color={colors.primary}
                                style={styles.skipIcon}
                            />
                            <ThemedText style={[styles.skipText, { color: colors.primary }]}>
                                5
                            </ThemedText>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        marginVertical: 10,
    },
    image: {
        width: '100%',
        height: 200,
        borderRadius: 12,
    },
    controlsContainer: {
        padding: 16,
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    progressContainer: {
        width: '100%',
        marginBottom: 16,
    },
    progressBar: {
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    timeText: {
        fontSize: 12,
        color: '#666',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    playButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skipButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    skipContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipIcon: {
        marginBottom: -2,
    },
    skipText: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: -2,
    },
}); 