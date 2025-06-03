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

    const quests = [

        { icon: 'help-circle-outline', text: 'Answer 3 quiz questions correctly', completed: false },
        { icon: 'headset-outline', text: 'Listen to one podcast', completed: false },
        { icon: 'book-outline', text: 'Read one chapter', completed: false },
    ];

    return (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
            <View style={[styles.modalContent, {
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                borderColor: colors.border
            }]}>
                <View style={styles.iconContainer}>
                    <Ionicons name="trophy" size={60} color={colors.primary} />
                </View>
                <ThemedText style={[styles.title, { color: colors.text }]}>
                    Hello from Dimpo! 👋
                </ThemedText>
                <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                    Scroll down ⬇️ and pick a subject to begin your epic journey quest!
                </ThemedText>

                <View style={styles.questsContainer}>
                    {quests.map((quest, index) => (
                        <View key={index} style={styles.questItem}>
                            <Ionicons
                                name={quest.icon as any}
                                size={24}
                                color={colors.primary}
                                style={styles.questIcon}
                            />
                            <ThemedText style={[styles.questText, { color: colors.text }]}>
                                {quest.text}
                            </ThemedText>
                            <Ionicons
                                name="ellipse-outline"
                                size={24}
                                color={colors.primary}
                            />
                        </View>
                    ))}
                </View>

                <ThemedText style={[styles.message, { color: colors.textSecondary }]}>
                    Ready to begin your epic learning journey? ⚔️
                </ThemedText>

                <TouchableOpacity
                    style={[styles.closeButton, { backgroundColor: colors.primary }]}
                    onPress={onClose}
                >
                    <ThemedText style={styles.closeButtonText}>Start Quest! 🚀</ThemedText>
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
        width: '90%',
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
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    questsContainer: {
        width: '100%',
        marginBottom: 24,
    },
    questItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
        borderRadius: 12,
        marginBottom: 8,
    },
    questIcon: {
        marginRight: 12,
    },
    questText: {
        flex: 1,
        fontSize: 16,
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
    },
    closeButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
}); 