import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, ImageSourcePropType, TouchableOpacity, Share, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { API_BASE_URL, HOST_URL } from '@/config/api';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { getLearner, getLearnerBadges, getAllBadges, LearnerBadge, Badge } from '@/services/api';
import { analytics } from '@/services/analytics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

const badgeImages: Record<string, ImageSourcePropType> = {
    '3-day-streak.png': require('@/assets/images/badges/3-day-streak.png'),
    '7-day-streak.png': require('@/assets/images/badges/7-day-streak.png'),
    '30-day-streak.png': require('@/assets/images/badges/30-day-streak.png'),
    '5-in-a-row.png': require('@/assets/images/badges/5-in-a-row.png'),
    '10-in-a-row.png': require('@/assets/images/badges/10-in-a-row.png')

};

export default function AchievementsScreen() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [badges, setBadges] = useState<(Badge & { earned: boolean })[]>([]);
    const { user } = useAuth();
    const [learnerInfo, setLearnerInfo] = useState<{
        name: string;
        grade: string;
        school?: string;
        avatar?: string;
    } | null>(null);

    useEffect(() => {
        async function fetchLearnerInfo() {
            if (!user?.uid) return;
            try {
                const learner = await getLearner(user.uid);
                setLearnerInfo({
                    name: learner.name || '',
                    grade: learner.grade?.number?.toString() || '',
                    school: learner.school_name || '',
                    avatar: learner.avatar || ''
                });
            } catch (error) {
                console.error('Failed to fetch learner info:', error);
            }
        }
        fetchLearnerInfo();
    }, [user?.uid]);

    useEffect(() => {
        async function fetchBadges() {
            if (!user?.uid) return;
            try {
                // Fetch all available badges
                const allBadges = await getAllBadges();

                // Fetch learner's earned badges
                const learnerBadges = await getLearnerBadges(user.uid);

                // Create a map of earned badge IDs for quick lookup
                const earnedBadgeIds = new Set(learnerBadges.map(badge => badge.id));

                // Combine all badges with earned status
                const badgesWithStatus = allBadges.map(badge => ({
                    ...badge,
                    earned: earnedBadgeIds.has(badge.id)
                }));

                setBadges(badgesWithStatus);
            } catch (error) {
                console.error('Failed to fetch badges:', error);
                // If there's an error, show all badges as locked
                const allBadges = await getAllBadges();
                setBadges(allBadges.map(badge => ({ ...badge, earned: false })));
            }
        }
        fetchBadges();
    }, [user?.uid]);

    const handleShareBadge = async (badge: Badge) => {
        try {
            // Get the local badge image from assets
            const localBadgeImage = badgeImages[badge.image] || require('@/assets/images/badges/3-day-streak.png');

            // Check if sharing is available
            if (await Sharing.isAvailableAsync()) {
                // Convert the image asset to a file URI
                const asset = Asset.fromModule(localBadgeImage);
                await asset.downloadAsync();

                if (asset.localUri) {
                    // Share the image
                    await Sharing.shareAsync(asset.localUri, {
                        mimeType: 'image/png',
                        dialogTitle: 'Share Badge Achievement',
                        UTI: 'public.png' // iOS only
                    });

                    // Share the text message
                    const message = `I just earned the ${badge.name} badge on Exam Quiz! 🎉\n\n${badge.rules}\n\nJoin me on Exam Quiz and start earning badges too! https://examquiz.co.za`;
                    await Share.share({
                        message,
                        title: 'Share Badge Achievement'
                    });

                    if (user?.uid) {
                        await analytics.track('share_badge', {
                            user_id: user.uid,
                            badge_id: badge.id,
                            platform: Platform.OS
                        });
                    }
                }
            } else {
                // Fallback to regular share if sharing is not available
                const message = `I just earned the ${badge.name} badge on Exam Quiz! 🎉\n\n${badge.rules}\n\nJoin me on Exam Quiz and start earning badges too! https://examquiz.co.za`;
                await Share.share({
                    message,
                    title: 'Share Badge Achievement'
                });
            }
        } catch (error) {
            console.error('Error sharing badge:', error);
        }
    };

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
                <Header
                    learnerInfo={learnerInfo}
                />

                <View style={styles.header}>
                    <ThemedText style={[styles.title, { color: colors.text }]}>🏆 Achievements</ThemedText>
                    <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Collect badges as you progress!
                    </ThemedText>
                </View>

                <View style={styles.badgesGrid}>
                    {badges.map((badge) => (
                        <View
                            key={badge.id}
                            style={[
                                styles.badgeCard,
                                {
                                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                                    opacity: badge.earned ? 1 : 0.5
                                }
                            ]}
                        >
                            <View style={styles.badgeImageContainer}>
                                <Image
                                    source={badgeImages[badge.image] || require('@/assets/images/badges/3-day-streak.png')}
                                    style={[
                                        styles.badgeImage,
                                        !badge.earned && styles.lockedBadgeImage
                                    ]}
                                    resizeMode="contain"
                                />
                                {!badge.earned && (
                                    <View style={styles.lockOverlay}>
                                        <Ionicons name="lock-closed" size={48} color={isDark ? '#FFFFFF' : '#000000'} />
                                    </View>
                                )}
                            </View>
                            <View style={styles.badgeInfo}>
                                <ThemedText style={[styles.badgeName, { color: colors.text }]} numberOfLines={1}>
                                    {badge.name}
                                </ThemedText>
                                <ThemedText
                                    style={[styles.badgeRules, { color: colors.textSecondary }]}
                                    numberOfLines={2}
                                >
                                    {badge.rules}
                                </ThemedText>
                                {badge.earned && (
                                    <TouchableOpacity
                                        style={[styles.shareButton, { backgroundColor: isDark ? colors.primary : '#022b66' }]}
                                        onPress={() => handleShareBadge(badge)}
                                    >
                                        <Ionicons name="share-social" size={16} color="#FFFFFF" />
                                        <ThemedText style={styles.shareButtonText}>Share</ThemedText>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))}
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
        paddingHorizontal: 16,
    },
    contentContainer: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    header: {
        marginBottom: 24,
        marginTop: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        opacity: 0.8,
    },
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
        alignItems: 'stretch',
    },
    badgeCard: {
        width: '48%',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        aspectRatio: 0.8,
    },
    badgeImageContainer: {
        position: 'relative',
        width: '100%',
        height: '70%',
        marginBottom: 12,
    },
    badgeImage: {
        width: '100%',
        height: '100%',
    },
    lockedBadgeImage: {
        opacity: 0.5,
    },
    lockOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 8,
    },
    badgeInfo: {
        width: '100%',
        alignItems: 'center',
    },
    badgeName: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 4,
    },
    badgeRules: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 16,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    closeIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginTop: 8,
        gap: 4,
    },
    shareButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
}); 