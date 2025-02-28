import React from 'react';
import { StyleSheet, Image } from 'react-native';
import PinchZoomView from 'react-native-pinch-zoom-view';
import { gestureHandlerRootHOC } from 'react-native-gesture-handler';
import { API_BASE_URL } from '@/config/api';

interface Props {
    imageUrl: string;
}

function ZoomableImageNew({ imageUrl }: Props) {
    const fullImageUrl = imageUrl.startsWith('http')
        ? imageUrl
        : `${API_BASE_URL}/public/learn/learner/get-image?image=${imageUrl}`;

    return (
        <PinchZoomView style={styles.container}>
            <Image
                source={{ uri: fullImageUrl }}
                style={[styles.image, { transform: [{ rotate: '90deg' }] }]}
                resizeMode="contain"
            />
        </PinchZoomView>
    );
}

export default gestureHandlerRootHOC(ZoomableImageNew);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    image: {
        width: '100%',
        height: '100%',
    },
}); 