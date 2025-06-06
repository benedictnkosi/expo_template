import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

interface ProfileHeaderProps {
    title: string;
    showBackButton?: boolean;
}

export function ProfileHeader({ title, showBackButton = true }: ProfileHeaderProps) {
    const { isDark } = useTheme();

    return (
        <View style={styles.container}>
            {showBackButton && (
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons
                        name="arrow-back"
                        size={24}
                        color={isDark ? '#FFFFFF' : '#000000'}
                    />
                </TouchableOpacity>
            )}
            <ThemedText style={styles.title}>{title}</ThemedText>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 16,
        padding: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
    },
}); 