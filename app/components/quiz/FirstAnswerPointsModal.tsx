import React from 'react';
import { Modal, View, StyleSheet, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { ThemedView } from '../../components/ThemedView';
import { ThemedText } from '../../components/ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { BlurView } from 'expo-blur';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

interface FirstAnswerPointsModalProps {
    isVisible: boolean;
    onClose: () => void;
    colors: any;
}

export const FirstAnswerPointsModal: React.FC<FirstAnswerPointsModalProps> = ({
    isVisible,
    onClose,
    colors,
}) => {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
    const titleAnim = React.useRef(new Animated.Value(0)).current;
    const pointsAnim = React.useRef(new Animated.Value(0)).current;
    const subtitleAnim = React.useRef(new Animated.Value(0)).current;

    const handleShare = async () => {
        try {
            const message = "🎉 I just earned 10 bonus points for being the first to answer correctly! #ExamQuiz";
            await Sharing.shareAsync(message);
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    React.useEffect(() => {
        if (isVisible) {
            // Reset animations
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.8);
            titleAnim.setValue(0);
            pointsAnim.setValue(0);
            subtitleAnim.setValue(0);

            // Main modal animation
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();

            // Staggered text animations
            Animated.sequence([
                Animated.timing(titleAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(pointsAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.timing(subtitleAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <Modal
            transparent
            visible={isVisible}
            animationType="none"
            onRequestClose={onClose}
        >
            <BlurView intensity={20} style={styles.container}>
                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            backgroundColor: colors.background,
                            opacity: fadeAnim,
                            transform: [
                                { scale: scaleAnim },
                                {
                                    translateY: fadeAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [20, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <Animated.View
                        style={{
                            opacity: titleAnim,
                            transform: [
                                {
                                    scale: titleAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.5, 1],
                                    }),
                                },
                            ],
                        }}
                    >
                        <ThemedText style={styles.title}>🎯 First Answer Bonus!</ThemedText>
                    </Animated.View>

                    <Animated.View
                        style={{
                            opacity: pointsAnim,
                            transform: [
                                {
                                    scale: pointsAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.5, 1],
                                    }),
                                },
                            ],
                        }}
                    >
                        <ThemedText style={styles.points}>✨ +10 points ✨</ThemedText>
                    </Animated.View>

                    <Animated.View
                        style={{
                            opacity: subtitleAnim,
                            transform: [
                                {
                                    scale: subtitleAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.5, 1],
                                    }),
                                },
                            ],
                        }}
                    >
                        <ThemedText style={styles.subtitle}>🚀 Keep going! Do another one! 🚀</ThemedText>
                    </Animated.View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.shareButton, { backgroundColor: colors.primary }]}
                            onPress={handleShare}
                        >
                            <Ionicons name="share-social" size={24} color="white" />
                            <ThemedText style={styles.shareButtonText}>Share Achievement 🎉</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.closeButton, { borderColor: colors.primary }]}
                            onPress={onClose}
                        >
                            <ThemedText style={[styles.closeButtonText, { color: colors.primary }]}>
                                Let's do another one! ✨
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
        width: '80%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    points: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#22C55E',
        marginBottom: 16,
        textShadowColor: 'rgba(34, 197, 94, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 20,
        opacity: 0.9,
        textAlign: 'center',
        marginBottom: 24,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 8,
    },
    shareButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    closeButton: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
}); 