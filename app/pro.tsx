import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';

export default function ProScreen() {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();

    return (
        <LinearGradient
            colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
            style={[styles.gradient, { paddingTop: insets.top }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <ThemedText style={[styles.headerTitle, { color: colors.text }]}>
                        Upgrade to Pro
                    </ThemedText>
                </View>

                <View style={[styles.card, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
                    <View style={styles.crownContainer}>
                        <ThemedText style={styles.crownIcon}>👑</ThemedText>
                    </View>

                    <ThemedText style={[styles.title, { color: colors.text }]}>
                        Unlock Premium Features
                    </ThemedText>

                    <View style={styles.featuresList}>
                        <View style={styles.featureItem}>
                            <ThemedText style={styles.featureIcon}>✨</ThemedText>
                            <View style={styles.featureContent}>
                                <ThemedText style={[styles.featureTitle, { color: colors.text }]}>
                                    Unlimited Practice
                                </ThemedText>
                                <ThemedText style={[styles.featureDescription, { color: colors.textSecondary }]}>
                                    Practice as much as you want with unlimited questions
                                </ThemedText>
                            </View>
                        </View>

                        <View style={styles.featureItem}>
                            <ThemedText style={styles.featureIcon}>🎯</ThemedText>
                            <View style={styles.featureContent}>
                                <ThemedText style={[styles.featureTitle, { color: colors.text }]}>
                                    Advanced Analytics
                                </ThemedText>
                                <ThemedText style={[styles.featureDescription, { color: colors.textSecondary }]}>
                                    Track your progress with detailed performance insights
                                </ThemedText>
                            </View>
                        </View>

                        <View style={styles.featureItem}>
                            <ThemedText style={styles.featureIcon}>📚</ThemedText>
                            <View style={styles.featureContent}>
                                <ThemedText style={[styles.featureTitle, { color: colors.text }]}>
                                    All Subjects
                                </ThemedText>
                                <ThemedText style={[styles.featureDescription, { color: colors.textSecondary }]}>
                                    Access all subjects and topics without limitations
                                </ThemedText>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
                        onPress={() => {
                            // Handle upgrade action
                        }}
                    >
                        <ThemedText style={styles.upgradeButtonText}>
                            Upgrade Now
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    card: {
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
    },
    crownContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    crownIcon: {
        fontSize: 48,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 32,
    },
    featuresList: {
        gap: 24,
        marginBottom: 32,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
    },
    featureIcon: {
        fontSize: 24,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    featureDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    upgradeButton: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
    },
    upgradeButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
}); 