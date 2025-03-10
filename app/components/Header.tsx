import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { AuthUser } from '@/contexts/AuthContext';

export interface HeaderProps {
    title: string;
    user: AuthUser | null;
    learnerInfo: {
        name: string;
        grade: string;
        school_name: string;
        school: string;
        role?: string;
        notification_hour?: number;
        school_address?: string;
        school_latitude?: number;
        school_longitude?: number;
        terms?: string;
        curriculum?: string;
        private_school?: boolean;
    } | null;
    testID?: string;
}

export function Header({ title, user, learnerInfo, testID }: HeaderProps) {
    const { colors, isDark } = useTheme();

    return (
        <View
            style={[styles.header, { borderBottomColor: colors.border }]}
            testID={testID}
        >
            <ThemedText style={[styles.title, { color: colors.text }]} testID={`${testID}-title`}>
                {title}
            </ThemedText>

            {user && learnerInfo && (
                <View style={styles.profileSection} testID={`${testID}-profile-section`}>
                    <View style={styles.userInfo} testID={`${testID}-user-info`}>
                        <ThemedText style={[styles.userName, { color: colors.text }]} testID={`${testID}-user-name`}>
                            {learnerInfo.name}
                        </ThemedText>
                        <ThemedText style={[styles.userGrade, { color: colors.textSecondary }]} testID={`${testID}-user-grade`}>
                            Grade {learnerInfo.grade} • {learnerInfo.school_name}
                        </ThemedText>
                    </View>
                    <TouchableOpacity
                        style={[styles.profileImage, styles.profilePlaceholder, { backgroundColor: colors.primary }]}
                        testID={`${testID}-profile-button`}
                    >
                        <ThemedText style={styles.profileInitial} testID={`${testID}-profile-initial`}>
                            {learnerInfo.name ? learnerInfo.name[0].toUpperCase() : '?'}
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    userInfo: {
        alignItems: 'flex-end',
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
    },
    userGrade: {
        fontSize: 12,
        opacity: 0.8,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    profilePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInitial: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
}); 