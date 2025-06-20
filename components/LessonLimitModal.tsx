import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface LessonLimitModalProps {
    visible: boolean;
    onGoHome: () => void;
}

export function LessonLimitModal({ visible, onGoHome }: LessonLimitModalProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();

    const handleGoHome = () => {
        onGoHome();
        router.push('/(tabs)');
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => { }} // No dismissible modal
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, {
                    backgroundColor: isDark ? colors.card : '#FFFFFF',
                    borderColor: colors.border
                }]}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="time-outline" size={48} color={colors.primary} />
                    </View>

                    <ThemedText style={[styles.title, { color: colors.text }]}>
                        Daily Limit Reached! 🕐
                    </ThemedText>

                    <ThemedText style={[styles.message, { color: colors.textSecondary }]}>
                        You've completed your daily lesson limit. Come back tomorrow to continue your learning journey!
                    </ThemedText>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.primary }]}
                        onPress={handleGoHome}
                    >
                        <ThemedText style={styles.buttonText}>Go Back Home</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 32,
        borderWidth: 1,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 32,
        textAlign: 'center',
    },
    button: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
        minWidth: 200,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
}); 