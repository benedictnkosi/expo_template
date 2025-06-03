import { useEvent } from 'expo';
import { useVideoPlayer, VideoSource, VideoView } from 'expo-video';
import { StyleSheet, View, Button } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useEventListener } from 'expo';

interface VideoNudgeProps {
    remainingItems: number;
    isVisible: boolean;
    isDark: boolean;
}

export function VideoNudge({ remainingItems, isVisible, isDark }: VideoNudgeProps) {
    const [isVideoVisible, setIsVideoVisible] = useState(true);
    const playerRef = useRef<any>(null);
    const assetId = require('@/assets/videos/capitec.mp4');

    const videoSource: VideoSource = {
        assetId,
        metadata: {
            title: 'Big Buck Bunny',
            artist: 'The Open Movie Project',
        },
    };

    const player = useVideoPlayer(videoSource, player => {
        playerRef.current = player;
        player.loop = false;
        if (isVisible) {
            player.play();
        }
    });

    useEventListener(player, 'playToEnd', () => {
        setIsVideoVisible(false);
    });

    useEffect(() => {
        if (!isVisible) {
            setIsVideoVisible(false);
        }
    }, [isVisible]);

    if (!isVisible || !isVideoVisible) return null;

    return (
        <View style={styles.fullScreenContainer}>
            <VideoView
                style={styles.fullScreenVideo}
                player={player}
                allowsFullscreen
                allowsPictureInPicture
                nativeControls={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    fullScreenContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: 1000,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenVideo: {
        width: '100%',
        height: '100%',
    },
});
