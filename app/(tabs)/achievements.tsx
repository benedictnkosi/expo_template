import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, ImageSourcePropType, TouchableOpacity, Share, Platform, ActivityIndicator } from 'react-native';
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
import { useFocusEffect } from '@react-navigation/native';
const badgeImages: Record<string, ImageSourcePropType> = {
    '3-day-streak.png': require('@/assets/images/badges/3-day-streak.png'),
    '7-day-streak.png': require('@/assets/images/badges/7-day-streak.png'),
    '30-day-streak.png': require('@/assets/images/badges/30-day-streak.png'),
    '5-in-a-row.png': require('@/assets/images/badges/5-in-a-row.png'),
    '3-in-a-row.png': require('@/assets/images/badges/3-in-a-row.png'),
    '10-in-a-row.png': require('@/assets/images/badges/10-in-a-row.png'),
    'physical-sciences.png': require('@/assets/images/badges/physical-sciences.png'),
    'mathematics.png': require('@/assets/images/badges/mathematics.png'),
    'agricultural-sciences.png': require('@/assets/images/badges/agricultural-sciences.png'),
    'economics.png': require('@/assets/images/badges/economics.png'),
    'geography.png': require('@/assets/images/badges/geography.png'),
    'life-sciences.png': require('@/assets/images/badges/life-sciences.png'),
    'mathematics-literacy.png': require('@/assets/images/badges/mathematics-literacy.png'),
    'history.png': require('@/assets/images/badges/history.png'),
    'tourism.png': require('@/assets/images/badges/tourism.png'),
    'business-studies.png': require('@/assets/images/badges/business-studies.png')
};

interface BadgeCategory {
    title: string;
    badges: (Badge & { earned: boolean })[];
}

export default function AchievementsScreen() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [badgeCategories, setBadgeCategories] = useState<BadgeCategory[]>([]);
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [learnerInfo, setLearnerInfo] = useState<{
        name: string;
        grade: string;
        school?: string;
        avatar?: string;
    } | null>(null);

    const fetchLearnerInfo = useCallback(async () => {
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
    }, [user?.uid]);

    const fetchBadges = useCallback(async () => {
        if (!user?.uid) return;
        setIsLoading(true);
        try {
            const allBadges = await getAllBadges();
            const learnerBadges = await getLearnerBadges(user.uid);
            const earnedBadgeIds = new Set(learnerBadges.map(badge => badge.id));

            const badgesWithStatus = allBadges.map(badge => ({
                ...badge,
                earned: earnedBadgeIds.has(badge.id)
            }));

            // Categorize badges
            const categories: BadgeCategory[] = [
                {
                    title: 'Learning Marathon 🏃‍♂️📚',
                    badges: badgesWithStatus.filter(badge =>
                        badge.image.includes('day-streak')
                    )
                },
                {
                    title: 'Sharp Shooter 🎯',
                    badges: badgesWithStatus.filter(badge =>
                        badge.image.includes('in-a-row')
                    )
                },
                {
                    title: 'Quiz Master 🎓',
                    badges: badgesWithStatus.filter(badge =>
                        !badge.image.includes('in-a-row') &&
                        !badge.image.includes('day-streak')
                    )
                }
            ];

            setBadgeCategories(categories);
        } catch (error) {
            console.error('Failed to fetch badges:', error);
            const allBadges = await getAllBadges();
            const badgesWithStatus = allBadges.map(badge => ({ ...badge, earned: false }));

            // Categorize badges even when there's an error
            const categories: BadgeCategory[] = [
                {
                    title: 'Learning Marathon 🏃‍♂️📚',
                    badges: badgesWithStatus.filter(badge =>
                        badge.image.includes('day-streak')
                    )
                },
                {
                    title: 'Sharp Shooter 🎯',
                    badges: badgesWithStatus.filter(badge =>
                        badge.image.includes('in-a-row')
                    )
                },
                {
                    title: 'Quiz Master 🎓',
                    badges: badgesWithStatus.filter(badge =>
                        !badge.image.includes('in-a-row') &&
                        !badge.image.includes('day-streak')
                    )
                }
            ];

            setBadgeCategories(categories);
        } finally {
            setIsLoading(false);
        }
    }, [user?.uid]);

    // Use useFocusEffect to fetch data when the tab is focused
    useFocusEffect(
        useCallback(() => {
            fetchLearnerInfo();
            fetchBadges();
        }, [fetchLearnerInfo, fetchBadges])
    );

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

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
                            Loading your achievements...
                        </ThemedText>
                    </View>
                ) : (
                    badgeCategories.map((category, index) => (
                        <View key={category.title} style={styles.categoryContainer}>
                            <ThemedText style={[styles.categoryTitle, { color: colors.text }]}>
                                {category.title}
                            </ThemedText>
                            <View style={styles.badgesGrid}>
                                {category.badges.map((badge) => (
                                    <View
                                        key={badge.id}
                                        style={[
                                            styles.badgeCard,
                                            {
                                                backgroundColor: '#F8FAFC',
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
                        </View>
                    ))
                )}
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
        width: '31%',
        borderRadius: 16,
        padding: 12,
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
        height: '65%',
        marginBottom: 8,
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
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 2,
    },
    badgeRules: {
        fontSize: 10,
        textAlign: 'center',
        lineHeight: 14,
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
    categoryContainer: {
        marginBottom: 32,
        marginTop: 16,
    },
    categoryTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 16,
        marginTop: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        textAlign: 'center',
    },
}); 