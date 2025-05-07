import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '../ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { IMAGE_BASE_URL } from '../../../config/api';

export interface QuizAdditionalImageProps {
    imagePath: string;
    onZoom: (url: string) => void;
}

export const QuizAdditionalImage = ({
    imagePath,
    onZoom
}: QuizAdditionalImageProps) => {
    const [hasError, setHasError] = useState(false);
    const { isDark, colors } = useTheme();

    const ImageLoadingPlaceholder = () => (
        <View style={[styles.loadingPlaceholder, {
            backgroundColor: isDark ? colors.surface : '#F1F5F9'
        }]}>
            {hasError ? (
                <ThemedText style={styles.errorText}>Failed to load image</ThemedText>
            ) : (
                <ThemedText style={styles.loadingText}>Loading...</ThemedText>
            )}
        </View>
    );

    return (
        <View style={styles.imageWrapper} testID='question-additional-image-container'>
            <TouchableOpacity
                style={styles.touchableImage}
                onPress={() => onZoom(imagePath)}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Image
                    source={`${IMAGE_BASE_URL}${imagePath}`}
                    style={styles.questionImage}
                    contentFit="contain"
                    transition={200}
                    onError={() => setHasError(true)}
                    testID='question-image'
                />
                {hasError && <ImageLoadingPlaceholder />}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    imageWrapper: {
        marginTop: 16,
        marginBottom: 16,
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    touchableImage: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    questionImage: {
        width: '100%',
        height: '100%',
    },
    loadingPlaceholder: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 14,
        textAlign: 'center',
    },
    loadingText: {
        fontSize: 14,
        textAlign: 'center',
    },
}); 