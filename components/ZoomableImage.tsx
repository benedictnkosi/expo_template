import React from 'react';
import { StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { API_BASE_URL } from '@/config/api';

interface Props {
  imageUrl: string;
}

export default function ZoomableImage({ imageUrl }: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const rotation = useSharedValue(0);

  const fullImageUrl = imageUrl.startsWith('http')
    ? imageUrl
    : `${API_BASE_URL}/public/learn/learner/get-image?image=${imageUrl}`;

  const handleRotate = () => {
    rotation.value = withSpring((rotation.value + 90) % 360);
  };

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      const newScale = savedScale.value * event.scale;
      scale.value = Math.min(Math.max(newScale, 1), 4);
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
      savedScale.value = scale.value;
    });

  const composed = Gesture.Race(panGesture, pinchGesture);

  // Animated style
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <GestureHandlerRootView style={styles.container}>
      <TouchableOpacity
        style={styles.rotateButton}
        onPress={handleRotate}
      >
        <Animated.Text style={styles.rotateButtonText}>🔄</Animated.Text>
      </TouchableOpacity>
      <GestureDetector gesture={composed}>
        <Animated.View style={styles.imageContainer}>
          <Animated.Image
            source={{ uri: fullImageUrl }}
            style={[styles.image, animatedStyle]}
            resizeMode="contain"
          />
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    height: height * 0.8,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  rotateButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotateButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
});
