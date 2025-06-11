import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Pressable } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Audio } from 'react-native';

interface AudioButtonProps {
    audioUrl?: string;
    accessibilityLabel: string;
    playbackRate?: number;
}

function AudioButton({ audioUrl, accessibilityLabel, playbackRate = 1 }: AudioButtonProps) {
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
            <ThemedText style={{ fontSize: 32 }}>{accessibilityLabel === 'Play slow audio' ? '🐢' : '🔊'}</ThemedText>
        </Pressable>
    );
}

interface AudioOnlyProps {
    audioUrl?: string;
    slowAudioUrl?: string;
    characterImage?: any; // You can make this more specific based on your image type
}

export function AudioOnly({
    audioUrl,
    slowAudioUrl,
    characterImage = require('@/assets/images/bunny-waiting.gif')
}: AudioOnlyProps) {
    return (
        <View style={styles.speechBubbleRow}>
            <Image
                source={characterImage}
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
    audioButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 20,
    },
}); 