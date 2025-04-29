import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface WelcomeModalProps {
    isVisible: boolean;
    onClose: () => void;
}

export const WelcomeModal = ({ isVisible, onClose }: WelcomeModalProps) => {
    const { colors, isDark } = useTheme();

    if (!isVisible) return null;

    return (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
            <View style={[styles.modalContent, {
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                borderColor: colors.border
            }]}>
                <View style={styles.iconContainer}>
                    <Ionicons name="compass" size={60} color={colors.primary} />
                </View>
                <ThemedText style={[styles.title, { color: colors.text }]}>
                    🎉 Hey there, Quiz Master in the making! 🎓
                </ThemedText>
                <ThemedText style={[styles.message, { color: colors.textSecondary }]}>
                    Ready to flex those brain muscles? 💪
                    Scroll down and pick a subject to begin your epic quiz quest!
                </ThemedText>
                <TouchableOpacity
                    style={[styles.closeButton, { backgroundColor: colors.primary }]}
                    onPress={onClose}
                >
                    <ThemedText style={styles.closeButtonText}>Let's Go! 🚀</ThemedText>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        width: '80%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
    },
    iconContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    closeButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
}); 