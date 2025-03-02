import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { API_BASE_URL } from '@/config/api';

interface Props {
    imageUrl: string;
}

function ZoomableImageNew({ imageUrl }: Props) {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const positionX = useSharedValue(0);
    const positionY = useSharedValue(0);
    const savedPositionX = useSharedValue(0);
    const savedPositionY = useSharedValue(0);

    const fullImageUrl = imageUrl.startsWith('http')
        ? imageUrl
        : `${API_BASE_URL}/public/learn/learner/get-image?image=${imageUrl}`;

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            savedScale.value = scale.value;
        });

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (scale.value > 1) {
                positionX.value = savedPositionX.value + e.translationX;
                positionY.value = savedPositionY.value + e.translationY;
            }
        })
        .onEnd(() => {
            savedPositionX.value = positionX.value;
            savedPositionY.value = positionY.value;
        });

    const composed = Gesture.Simultaneous(pinchGesture, panGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: positionX.value },
            { translateY: positionY.value },
            { scale: scale.value },
            { rotate: '90deg' }
        ]
    }));

    return (
        <GestureHandlerRootView style={styles.container}>
            <GestureDetector gesture={composed}>
                <Animated.Image
                    source={{ uri: fullImageUrl }}
                    style={[styles.image, animatedStyle]}
                    resizeMode="contain"
                />
            </GestureDetector>
        </GestureHandlerRootView>
    );
}

export default ZoomableImageNew;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});