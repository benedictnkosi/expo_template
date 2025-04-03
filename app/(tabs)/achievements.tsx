import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, ImageSourcePropType, TouchableOpacity, Share, Platform, ActivityIndicator, Dimensions } from 'react-native';
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

const AVATAR_IMAGES: Record<string, ImageSourcePropType> = {
    '1': require('@/assets/images/avatars/1.png'),
    '2': require('@/assets/images/avatars/2.png'),
    '3': require('@/assets/images/avatars/3.png'),
    '4': require('@/assets/images/avatars/4.png'),
    '5': require('@/assets/images/avatars/5.png'),
    '6': require('@/assets/images/avatars/6.png'),
    '7': require('@/assets/images/avatars/7.png'),
    '8': require('@/assets/images/avatars/8.png'),
    '9': require('@/assets/images/avatars/9.png'),
};

interface BadgeCategory {
    title: string;
    badges: (Badge & { earned: boolean })[];
}

interface LeaderboardEntry {
    name: string;
    points: number;
    position: number;
    isCurrentLearner: boolean;
    avatar: string;
}

interface LeaderboardResponse {
    status: string;
    rankings: LeaderboardEntry[];
    currentLearnerPoints: number;
    currentLearnerPosition: number | null;
    totalLearners: number;
}

async function getLeaderboard(uid: string, limit: number = 10): Promise<LeaderboardResponse> {
    try {
        const response = await fetch(`${HOST_URL}/api/leaderboard?uid=${uid}&limit=${limit}`);
        if (!response.ok) {
            throw new Error('Failed to fetch leaderboard');
        }
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
    }
}

export default function AchievementsScreen() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [badgeCategories, setBadgeCategories] = useState<BadgeCategory[]>([]);
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'badges' | 'scoreboard'>('scoreboard');
    const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
    const [learnerInfo, setLearnerInfo] = useState<{
        name: string;
        grade: string;
        school?: string;
        avatar?: string;
    } | null>(null);

    // Define tab styles here to access isDark
    const tabStyles = {
        container: {
            flexDirection: 'row' as const,
            justifyContent: 'center' as const,
            marginBottom: 8,
            paddingHorizontal: 16,
            marginRight: 16,
        },
        button: {
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
            marginHorizontal: 4,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
        activeButton: {
            backgroundColor: '#3B82F6',
        },
        text: {
            fontSize: 16,
            color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
        },
        activeText: {
            color: '#FFFFFF',
        },
    };

    const fetchLeaderboard = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const data = await getLeaderboard(user.uid);
            setLeaderboard(data);
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        }
    }, [user?.uid]);

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
            fetchLeaderboard();
        }, [fetchLearnerInfo, fetchBadges, fetchLeaderboard])
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

    const renderLeaderboardEntry = useCallback((entry: LeaderboardEntry, index: number) => {
        const isTopThree = index < 3;
        const medalEmoji = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
        const avatarImage = entry.avatar ? AVATAR_IMAGES[entry.avatar] : AVATAR_IMAGES['1'];

        return (
            <ThemedView
                key={`${entry.name}-${entry.position}`}
                style={[
                    styles.leaderboardEntry,
                    entry.isCurrentLearner && styles.currentLearnerEntry,
                    isTopThree && styles.topThreeEntry
                ]}
            >
                <View style={styles.leaderboardEntryContent}>
                    <View style={styles.positionContainer}>
                        {medalEmoji ? (
                            <ThemedText style={styles.medalEmoji}>{medalEmoji}</ThemedText>
                        ) : (
                            <ThemedText style={styles.position}>#{entry.position}</ThemedText>
                        )}
                    </View>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={avatarImage}
                            style={styles.avatar}
                        />
                    </View>
                    <View style={styles.nameContainer}>
                        <ThemedText style={styles.name}>{entry.name}</ThemedText>
                    </View>
                    <View style={styles.pointsContainer}>
                        <Image
                            source={require('@/assets/images/points.png')}
                            style={styles.pointsIcon}
                        />
                        <ThemedText style={styles.points}>{entry.points}</ThemedText>
                    </View>
                </View>
            </ThemedView>
        );
    }, []);

    const renderTopThree = useCallback((rankings: LeaderboardEntry[]) => {
        if (!rankings || rankings.length < 3) return null;

        return (
            <View style={styles.topThreeContainer}>
                {/* Second Place */}
                <View style={styles.topThreeItem}>
                    <View style={styles.topThreeAvatarContainer}>
                        <Image
                            source={rankings[1].avatar ? AVATAR_IMAGES[rankings[1].avatar] : AVATAR_IMAGES['1']}
                            style={styles.topThreeAvatar}
                        />
                    </View>
                    <View style={styles.topThreeMedal}>
                        <ThemedText style={styles.topThreeMedalText}>🥈</ThemedText>
                    </View>
                    <ThemedText style={styles.topThreeName} numberOfLines={1}>
                        {rankings[1].name}
                    </ThemedText>
                    <View style={styles.topThreePoints}>
                        <Image
                            source={require('@/assets/images/points.png')}
                            style={styles.topThreePointsIcon}
                        />
                        <ThemedText style={styles.topThreePointsText}>
                            {rankings[1].points}
                        </ThemedText>
                    </View>
                </View>

                {/* First Place */}
                <View style={[styles.topThreeItem, styles.firstPlace]}>
                    <View style={styles.crownContainer}>
                        <ThemedText style={styles.crown}>👑</ThemedText>
                    </View>
                    <View style={[styles.topThreeAvatarContainer, styles.firstPlaceAvatar]}>
                        <Image
                            source={rankings[0].avatar ? AVATAR_IMAGES[rankings[0].avatar] : AVATAR_IMAGES['1']}
                            style={styles.topThreeAvatar}
                        />
                    </View>
                    <ThemedText style={[styles.topThreeName, styles.firstPlaceName]} numberOfLines={1}>
                        {rankings[0].name}
                    </ThemedText>
                    <View style={styles.topThreePoints}>
                        <Image
                            source={require('@/assets/images/points.png')}
                            style={styles.topThreePointsIcon}
                        />
                        <ThemedText style={[styles.topThreePointsText, styles.firstPlacePoints]}>
                            {rankings[0].points}
                        </ThemedText>
                    </View>
                </View>

                {/* Third Place */}
                <View style={styles.topThreeItem}>
                    <View style={styles.topThreeAvatarContainer}>
                        <Image
                            source={rankings[2].avatar ? AVATAR_IMAGES[rankings[2].avatar] : AVATAR_IMAGES['1']}
                            style={styles.topThreeAvatar}
                        />
                    </View>
                    <View style={styles.topThreeMedal}>
                        <ThemedText style={styles.topThreeMedalText}>🥉</ThemedText>
                    </View>
                    <ThemedText style={styles.topThreeName} numberOfLines={1}>
                        {rankings[2].name}
                    </ThemedText>
                    <View style={styles.topThreePoints}>
                        <Image
                            source={require('@/assets/images/points.png')}
                            style={styles.topThreePointsIcon}
                        />
                        <ThemedText style={styles.topThreePointsText}>
                            {rankings[2].points}
                        </ThemedText>
                    </View>
                </View>
            </View>
        );
    }, []);

    return (
        <LinearGradient
            colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
            style={[styles.gradient, { paddingTop: insets.top }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <Header learnerInfo={learnerInfo} />

            <View style={styles.header}>
                <ThemedText style={styles.title}>🏆 Achievements</ThemedText>
                <ThemedText style={styles.subtitle}>
                    Track your progress and compete with others in your grade!
                </ThemedText>
            </View>

            <View style={tabStyles.container}>
                <TouchableOpacity
                    style={[
                        tabStyles.button,
                        activeTab === 'scoreboard' && tabStyles.activeButton
                    ]}
                    onPress={() => setActiveTab('scoreboard')}
                >
                    <ThemedText
                        style={[
                            tabStyles.text,
                            activeTab === 'scoreboard' && tabStyles.activeText
                        ]}
                    >
                        Scoreboard
                    </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        tabStyles.button,
                        activeTab === 'badges' && tabStyles.activeButton
                    ]}
                    onPress={() => setActiveTab('badges')}
                >
                    <ThemedText
                        style={[
                            tabStyles.text,
                            activeTab === 'badges' && tabStyles.activeText
                        ]}
                    >
                        Badges
                    </ThemedText>
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
            >
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
                    </View>
                ) : activeTab === 'badges' ? (
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
                ) : (
                    <View style={styles.leaderboardContainer}>
                        {leaderboard && renderTopThree(leaderboard.rankings)}
                        
                        {/* Rest of the leaderboard */}
                        <View style={styles.rankingsList}>
                            {leaderboard && leaderboard.rankings.slice(3).map((entry, index) => 
                                renderLeaderboardEntry(entry, index + 3)
                            )}
                        </View>
                        
                        {/* Current Learner Position (if not in top 10) */}
                        {leaderboard && leaderboard.currentLearnerPosition !== null &&
                            !leaderboard.rankings.some(r => r.isCurrentLearner) && (
                                <ThemedView style={[styles.leaderboardEntry, styles.currentLearnerEntry]}>
                                    <View style={styles.leaderboardEntryContent}>
                                        <View style={styles.positionContainer}>
                                            <ThemedText style={styles.position}>
                                                #{leaderboard.currentLearnerPosition}
                                            </ThemedText>
                                        </View>
                                        <View style={styles.avatarContainer}>
                                            <Image
                                                source={learnerInfo?.avatar ? AVATAR_IMAGES[learnerInfo.avatar] : AVATAR_IMAGES['1']}
                                                style={styles.avatar}
                                            />
                                        </View>
                                        <View style={styles.nameContainer}>
                                            <ThemedText style={styles.name}>You</ThemedText>
                                        </View>
                                        <View style={styles.pointsContainer}>
                                            <Image
                                                source={require('@/assets/images/points.png')}
                                                style={styles.pointsIcon}
                                            />
                                            <ThemedText style={styles.points}>
                                                {leaderboard.currentLearnerPoints}
                                            </ThemedText>
                                        </View>
                                    </View>
                                </ThemedView>
                            )}
                    </View>
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
    },
    contentContainer: {
        padding: 16,
    },
    header: {
        padding: 16,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        opacity: 0.7,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
    },
    leaderboardContainer: {
        paddingHorizontal: 16,
    },
    leaderboardEntry: {
        marginBottom: 12,
        borderRadius: 12,
        padding: 12,
    },
    currentLearnerEntry: {
        backgroundColor: '#3B82F6',
    },
    topThreeEntry: {
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    leaderboardEntryContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    positionContainer: {
        width: 40,
        alignItems: 'center',
    },
    position: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    medalEmoji: {
        fontSize: 20,
    },
    avatarContainer: {
        marginRight: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    nameContainer: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
    },
    pointsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pointsIcon: {
        width: 20,
        height: 20,
        marginRight: 4,
    },
    points: {
        fontSize: 16,
        fontWeight: 'bold',
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
    topThreeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginBottom: 32,
        marginTop: 20,
        paddingHorizontal: 16,
        height: 220,
    },
    topThreeItem: {
        flex: 1,
        alignItems: 'center',
        maxWidth: 120,
        paddingBottom: 16,
        marginTop: 20,
    },
    firstPlace: {
        marginTop: -80,
        transform: [{ translateY: -50 }],
        marginHorizontal: 20,
    },
    topThreeAvatarContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fff',
        padding: 2,
        marginBottom: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    firstPlaceAvatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 3,
        borderColor: '#FFD700',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
    },
    topThreeAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 999,
    },
    crownContainer: {
        position: 'absolute',
        top: -24,
        left: '50%',
        transform: [{ translateX: -12 }],
    },
    crown: {
        fontSize: 24,
    },
    topThreeMedal: {
        marginBottom: 4,
    },
    topThreeMedalText: {
        fontSize: 20,
    },
    topThreeName: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 4,
        maxWidth: '100%',
    },
    firstPlaceName: {
        fontSize: 16,
    },
    topThreePoints: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    topThreePointsIcon: {
        width: 16,
        height: 16,
        marginRight: 4,
    },
    topThreePointsText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    firstPlacePoints: {
        fontSize: 16,
    },
    rankingsList: {
        marginTop: 16,
    },
}); 