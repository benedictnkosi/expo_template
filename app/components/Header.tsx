import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

interface HeaderProps {
    learnerInfo?: {
        name: string;
        grade: string;
        school?: string;
        avatar?: string;
    } | null;
    title: string;
    showBackButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ learnerInfo, title, showBackButton }) => {
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

            {title ? (
                <ThemedText style={styles.title}>{title}</ThemedText>
            ) : learnerInfo ? (
                <View>
                    <ThemedText style={styles.name}>{learnerInfo.name}</ThemedText>
                    <ThemedText style={styles.grade}>Grade {learnerInfo.grade}</ThemedText>
                    {learnerInfo.school && (
                        <ThemedText style={styles.school}>{learnerInfo.school}</ThemedText>
                    )}
                </View>
            ) : null}
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
    name: {
        fontSize: 18,
        fontWeight: '600',
    },
    grade: {
        fontSize: 14,
        opacity: 0.7,
        marginTop: 2,
    },
    school: {
        fontSize: 14,
        opacity: 0.7,
        marginTop: 2,
    },
}); 