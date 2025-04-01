import React from 'react';
import { View, StyleSheet, Modal, Image, Animated, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { Badge } from '@/services/api';
import { badgeImages } from '@/constants/badges';
import { Ionicons } from '@expo/vector-icons';

interface BadgeCelebrationModalProps {
    isVisible: boolean;
    onClose: () => void;
    badge: Badge;
}

export function BadgeCelebrationModal({ isVisible, onClose, badge }: BadgeCelebrationModalProps) {
    const { colors, isDark } = useTheme();
    const [scale] = React.useState(new Animated.Value(0));

    React.useEffect(() => {
        if (isVisible) {
            Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
            }).start();
        } else {
            scale.setValue(0);
        }
    }, [isVisible]);

    return (
        <Modal
            visible={isVisible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={e => e.stopPropagation()}
                >
                    <Animated.View
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: isDark ? colors.card : '#FFFFFF',
                                transform: [{ scale }],
                            },
                        ]}
                    >
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                        <View style={styles.badgeContainer}>
                            <Image
                                source={badgeImages[badge.image] || require('@/assets/images/badges/3-day-streak.png')}
                                style={styles.badgeImage}
                                resizeMode="contain"
                            />
                        </View>
                        <ThemedText style={[styles.title, { color: colors.text }]}>
                            🎉 New Badge Earned! 🎉
                        </ThemedText>
                        <ThemedText style={[styles.badgeName, { color: colors.text }]}>
                            {badge.name}
                        </ThemedText>
                        <ThemedText style={[styles.badgeRules, { color: colors.textSecondary }]}>
                            {badge.rules}
                        </ThemedText>
                        <ThemedText style={[styles.celebrationText, { color: colors.text }]}>
                            🎯 Keep up the amazing work! 🚀
                        </ThemedText>
                    </Animated.View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    badgeContainer: {
        width: 120,
        height: 120,
        marginBottom: 16,
    },
    badgeImage: {
        width: '100%',
        height: '100%',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    badgeName: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 4,
    },
    badgeRules: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 24,
    },
    celebrationText: {
        fontSize: 18,
        textAlign: 'center',
    },
}); 