import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { LANGUAGE_EMOJIS } from './language-emojis';

interface ProfileHeaderProps {
    title: string;
    showBackButton?: boolean;
    languageName?: string;
    subText?: string;
}

export function ProfileHeader({ title, showBackButton = true, languageName, subText }: ProfileHeaderProps) {
    const { isDark } = useTheme();
    const emoji = languageName && LANGUAGE_EMOJIS[languageName] ? LANGUAGE_EMOJIS[languageName] : '🏳️‍🌈';

    return (
        <View style={styles.headerWrapper}>
            <View style={styles.headerContent}>
                {showBackButton && (
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <Ionicons
                            name="arrow-back"
                            size={28}
                            color={isDark ? '#FFFFFF' : '#1E293B'}
                        />
                    </TouchableOpacity>
                )}
                <View style={styles.titleColumn}>
                    <View style={styles.titleRow}>
                        <ThemedText style={styles.emoji} accessibilityLabel="Language emoji">
                            {emoji}
                        </ThemedText>
                        <ThemedText style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                            {title}
                        </ThemedText>
                    </View>
                    {subText && (
                        <ThemedText style={styles.subText} numberOfLines={1} ellipsizeMode="tail">
                            {subText}
                        </ThemedText>
                    )}
                </View>
                {showBackButton && <View style={styles.backButton} />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    headerWrapper: {
        backgroundColor: '#F1F5F9',
        borderBottomLeftRadius: 18,
        borderBottomRightRadius: 18,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 18,
        paddingBottom: 18,
        paddingHorizontal: 18,
    },
    backButton: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleColumn: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    emoji: {
        fontSize: 24,
        marginRight: 2,
    },
    title: {
        flexShrink: 1,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1E293B',
        letterSpacing: 0.2,
    },
    subText: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 2,
        opacity: 0.85,
    },
}); 