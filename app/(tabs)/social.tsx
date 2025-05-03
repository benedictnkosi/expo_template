import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, ImageSourcePropType, TouchableOpacity, Share, Platform, ActivityIndicator, Dimensions, TextInput, Clipboard, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { API_BASE_URL, HOST_URL } from '@/config/api';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { getLearner, getLearnerBadges, getAllBadges, LearnerBadge, Badge } from '@/services/api';
import { analytics } from '@/services/analytics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    'business-studies.png': require('@/assets/images/badges/business-studies.png'),
    'accounting.png': require('@/assets/images/badges/accounting.png'),
    'daily-goat.png': require('@/assets/images/badges/daily-goat.png'),
    'weekly-goat.png': require('@/assets/images/badges/weekly-goat.png'),
    'all-time-goat.png': require('@/assets/images/badges/all-time-goat.png')
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
    publicProfile: boolean;
    followMeCode: string;
}

interface WeeklyScoreboardEntry {
    name: string;
    score: number;
    totalAnswers: number;
    position: number;
    isCurrentLearner: boolean;
    avatar: string;
    publicProfile: boolean;
    followMeCode: string;
}

interface WeeklyScoreboardResponse {
    status: string;
    scoreboard: WeeklyScoreboardEntry[];
    weekStart: string;
    weekEnd: string;
    totalParticipants: number;
}

interface TodayScoreboardResponse {
    status: string;
    scoreboard: WeeklyScoreboardEntry[];
    date: string;
    totalParticipants: number;
}

interface LeaderboardResponse {
    status: string;
    rankings: LeaderboardEntry[];
    currentLearnerPoints: number;
    currentLearnerPosition: number | null;
    totalLearners: number;
}

interface FollowingResponse {
    message: string;
    data: {
        id: number;
        follower: Learner;
        following: Learner;
        status: string;
        created_at: string;
    };
}

interface Learner {
    id: number;
    uid: string;
    name: string;
    avatar: string;
    follow_me_code: string;
    points: number;
    streak: number;
    grade: {
        id: number;
        number: number;
        active: number;
    };
}

interface FollowedLearner {
    learner_uid: string;
    learner_name: string;
    points: number;
    streak: number;
    lastResult?: {
        id: number;
        outcome: 'correct' | 'incorrect';
        created: string;
        duration: number;
    };
    questionsAnsweredToday: number;
    questionsAnsweredThisWeek: number;
}

interface FollowingList {
    data: FollowedLearner[];
}

interface Follower {
    id: number;
    name: string;
    uid: string;
    follow_code: string;
}

interface FollowersResponse {
    data: Follower[];
}

interface UpdateFollowerStatusResponse {
    message: string;
    data: {
        id: number;
        follower: Learner;
        following: Learner;
        status: string;
        created_at: string;
    };
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

async function getWeeklyScoreboard(uid: string): Promise<WeeklyScoreboardResponse> {
    try {
        const response = await fetch(`${HOST_URL}/public/learn/scoreboard?uid=${uid}&period=weekly`);
        if (!response.ok) {
            throw new Error('Failed to fetch weekly scoreboard');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching weekly scoreboard:', error);
        throw error;
    }
}

async function getTodayScoreboard(uid: string): Promise<TodayScoreboardResponse> {
    try {
        const response = await fetch(`${HOST_URL}/public/learn/scoreboard?uid=${uid}&period=daily`);
        if (!response.ok) {
            throw new Error('Failed to fetch today scoreboard');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching today scoreboard:', error);
        throw error;
    }
}

async function followLearner(uid: string, followCode: string): Promise<FollowingResponse> {
    try {
        const response = await fetch(`${HOST_URL}/api/learner-following/follow/${uid}/${followCode}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );
        if (!response.ok) {
            throw new Error('Failed to follow learner');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error following learner:', error);
        throw error;
    }
}

async function getFollowingList(uid: string): Promise<FollowingList> {
    try {
        const response = await fetch(`${HOST_URL}/api/learner-following/following/${uid}`);
        if (!response.ok) {
            throw new Error('Failed to fetch following list');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching following list:', error);
        throw error;
    }
}

async function getFollowers(uid: string): Promise<FollowersResponse> {
    try {
        const response = await fetch(`${HOST_URL}/api/learner-following/followers/${uid}`);
        if (!response.ok) {
            throw new Error('Failed to fetch followers');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching followers:', error);
        throw error;
    }
}

async function updateFollowerStatus(uid: string, followerUid: string, status: 'active' | 'rejected' | 'deleted'): Promise<UpdateFollowerStatusResponse> {
    try {
        //{followerUid}/{followingUid}
        const response = await fetch(`${HOST_URL}/api/learner-following/status/${followerUid}/${uid}?status=${status}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error('Failed to update follower status');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating follower status:', error);
        throw error;
    }
}

interface ScoreboardProps {
    entries: Array<{
        name: string;
        score: number;
        position: number;
        isCurrentLearner: boolean;
        avatar: string;
        totalAnswers?: number;
        publicProfile: boolean;
        followMeCode: string;
    }>;
    showTotalAnswers?: boolean;
}

function Scoreboard({ entries, showTotalAnswers = false }: ScoreboardProps) {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();

    const handleLearnerPress = async (entry: ScoreboardProps['entries'][0]) => {
        if (entry.publicProfile && entry.followMeCode) {
            // Track analytics event for viewing learner report
            if (user?.uid) {
                await analytics.track('social_view_report', {
                    viewer_id: user.uid,
                    viewed_learner_id: entry.followMeCode,
                    viewed_learner_name: entry.name,
                    is_own_report: entry.isCurrentLearner
                });
            }
            router.push(`/report/${entry.followMeCode}?name=${encodeURIComponent(entry.name)}`);
        }
    };

    const renderTopThree = (rankings: ScoreboardProps['entries']) => {
        if (!rankings || rankings.length < 3) return null;

        return (
            <View style={styles.topThreeContainer}>
                {/* Second Place */}
                <TouchableOpacity
                    style={styles.topThreeItem}
                    onPress={() => handleLearnerPress(rankings[1])}
                    disabled={!rankings[1].publicProfile}
                >
                    <View style={styles.topThreeAvatarContainer}>
                        <Image
                            source={rankings[1].avatar ? AVATAR_IMAGES[rankings[1].avatar] : AVATAR_IMAGES['1']}
                            style={styles.topThreeAvatar}
                        />
                    </View>
                    <View style={styles.topThreeMedal}>
                        <ThemedText style={styles.topThreeMedalText}>🥈</ThemedText>
                    </View>
                    <ThemedText style={styles.topThreeName}>
                        {rankings[1].name}
                    </ThemedText>
                    <View style={styles.topThreePoints}>
                        <Image
                            source={require('@/assets/images/points.png')}
                            style={styles.topThreePointsIcon}
                        />
                        <ThemedText style={styles.topThreePointsText}>
                            {rankings[1].score}
                        </ThemedText>
                    </View>
                    {showTotalAnswers && (
                        <ThemedText style={styles.topThreeAnswers}>
                            {rankings[1].totalAnswers} answers
                        </ThemedText>
                    )}
                </TouchableOpacity>

                {/* First Place */}
                <TouchableOpacity
                    style={[styles.topThreeItem, styles.firstPlace]}
                    onPress={() => handleLearnerPress(rankings[0])}
                    disabled={!rankings[0].publicProfile}
                >
                    <View style={styles.crownContainer}>
                        <ThemedText style={styles.crown}>👑</ThemedText>
                    </View>
                    <View style={[styles.topThreeAvatarContainer, styles.firstPlaceAvatar]}>
                        <Image
                            source={rankings[0].avatar ? AVATAR_IMAGES[rankings[0].avatar] : AVATAR_IMAGES['1']}
                            style={styles.topThreeAvatar}
                        />
                    </View>
                    <ThemedText style={[styles.topThreeName, styles.firstPlaceName]}>
                        {rankings[0].name}
                    </ThemedText>
                    <View style={styles.topThreePoints}>
                        <Image
                            source={require('@/assets/images/points.png')}
                            style={styles.topThreePointsIcon}
                        />
                        <ThemedText style={[styles.topThreePointsText, styles.firstPlacePoints]}>
                            {rankings[0].score}
                        </ThemedText>
                    </View>
                    {showTotalAnswers && (
                        <ThemedText style={[styles.topThreeAnswers, styles.firstPlaceAnswers]}>
                            {rankings[0].totalAnswers} answers
                        </ThemedText>
                    )}
                </TouchableOpacity>

                {/* Third Place */}
                <TouchableOpacity
                    style={styles.topThreeItem}
                    onPress={() => handleLearnerPress(rankings[2])}
                    disabled={!rankings[2].publicProfile}
                >
                    <View style={styles.topThreeAvatarContainer}>
                        <Image
                            source={rankings[2].avatar ? AVATAR_IMAGES[rankings[2].avatar] : AVATAR_IMAGES['1']}
                            style={styles.topThreeAvatar}
                        />
                    </View>
                    <View style={styles.topThreeMedal}>
                        <ThemedText style={styles.topThreeMedalText}>🥉</ThemedText>
                    </View>
                    <ThemedText style={styles.topThreeName}>
                        {rankings[2].name}
                    </ThemedText>
                    <View style={styles.topThreePoints}>
                        <Image
                            source={require('@/assets/images/points.png')}
                            style={styles.topThreePointsIcon}
                        />
                        <ThemedText style={styles.topThreePointsText}>
                            {rankings[2].score}
                        </ThemedText>
                    </View>
                    {showTotalAnswers && (
                        <ThemedText style={styles.topThreeAnswers}>
                            {rankings[2].totalAnswers} answers
                        </ThemedText>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    const renderEntry = (entry: ScoreboardProps['entries'][0], index: number) => {
        const isTopThree = index < 3;
        const medalEmoji = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
        const avatarImage = entry.avatar ? AVATAR_IMAGES[entry.avatar] : AVATAR_IMAGES['1'];

        return (
            <TouchableOpacity
                key={`${entry.name}-${entry.position}`}
                onPress={() => handleLearnerPress(entry)}
                disabled={!entry.publicProfile}
            >
                <ThemedView
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
                            <ThemedText style={styles.name}>{entry.isCurrentLearner ? 'You' : entry.name}</ThemedText>
                            {showTotalAnswers && (
                                <ThemedText style={styles.scoreboardAnswers}>
                                    {entry.totalAnswers} answers
                                </ThemedText>
                            )}
                        </View>
                        <View style={styles.pointsContainer}>
                            <Image
                                source={require('@/assets/images/points.png')}
                                style={styles.pointsIcon}
                            />
                            <ThemedText style={styles.points}>{entry.score}</ThemedText>
                        </View>
                    </View>
                </ThemedView>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.leaderboardContainer}>
            <ThemedText style={styles.scoreboardHint}>
                Tap on a learner to view their activity and report
            </ThemedText>

            {renderTopThree(entries.slice(0, 3))}

            <View style={styles.rankingsList}>
                {entries.slice(3).map((entry, index) => renderEntry(entry, index + 3))}
            </View>
        </View>
    );
}

export default function AchievementsScreen() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { activeTab: initialTab } = useLocalSearchParams<{ activeTab: string }>();
    const [activeTab, setActiveTab] = useState<'badges' | 'scoreboard' | 'following'>(initialTab as 'badges' | 'scoreboard' | 'following' || 'scoreboard');
    const [scoreboardType, setScoreboardType] = useState<'all-time' | 'weekly' | 'today'>('today');
    const [badgeCategories, setBadgeCategories] = useState<BadgeCategory[]>([]);
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
    const [weeklyScoreboard, setWeeklyScoreboard] = useState<WeeklyScoreboardResponse | null>(null);
    const [todayScoreboard, setTodayScoreboard] = useState<TodayScoreboardResponse | null>(null);
    const [learnerInfo, setLearnerInfo] = useState<{
        name: string;
        grade: string;
        school?: string;
        avatar?: string;
        follow_me_code?: string;
    } | null>(null);
    const [followCode, setFollowCode] = useState('');
    const [isFollowingLoading, setIsFollowingLoading] = useState(false);
    const [followingList, setFollowingList] = useState<FollowedLearner[]>([]);
    const [isFollowingListLoading, setIsFollowingListLoading] = useState(false);
    const [followers, setFollowers] = useState<Follower[]>([]);
    const [isFollowersLoading, setIsFollowersLoading] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);

    // Define tab styles here to access isDark
    const tabStyles = {
        container: {
            flexDirection: 'row' as const,
            justifyContent: 'center' as const,
            marginBottom: 8,
            paddingHorizontal: 16,
            marginHorizontal: 16,
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
            fontSize: 14,
            color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
        },
        activeText: {
            color: '#FFFFFF',
        },
    };

    const subTabStyles = {
        container: {
            flexDirection: 'row' as const,
            justifyContent: 'center' as const,
            marginBottom: 16,
            paddingHorizontal: 16,
            marginHorizontal: 16,
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
            fontSize: 14,
            color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
        },
        activeText: {
            color: '#FFFFFF',
        },
    };

    // Add function to save active tab
    const saveActiveTab = async (tab: string) => {
        try {
            await AsyncStorage.setItem('socialActiveTab', tab);
        } catch (error) {
            console.error('Error saving active tab:', error);
        }
    };

    // Add function to load active tab
    const loadActiveTab = async () => {
        try {
            const savedTab = await AsyncStorage.getItem('socialActiveTab');
            if (savedTab && ['badges', 'scoreboard', 'following'].includes(savedTab)) {
                setActiveTab(savedTab as 'badges' | 'scoreboard' | 'following');
            }
        } catch (error) {
            console.error('Error loading active tab:', error);
        }
    };

    // Load saved tab when component mounts
    useEffect(() => {
        loadActiveTab();
    }, []);

    // Update active tab and save it
    const handleTabChange = (tab: 'badges' | 'scoreboard' | 'following') => {
        setActiveTab(tab);
        saveActiveTab(tab);
    };

    const fetchLeaderboard = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const data = await getLeaderboard(user.uid);
            console.log('Leaderboard Data:', data);
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
                avatar: learner.avatar || '',
                follow_me_code: learner.follow_me_code || ''
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

    const fetchWeeklyScoreboard = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const data = await getWeeklyScoreboard(user.uid);
            console.log('Weekly Scoreboard Data:', data);
            setWeeklyScoreboard(data);
        } catch (error) {
            console.error('Failed to fetch weekly scoreboard:', error);
        }
    }, [user?.uid]);

    const fetchTodayScoreboard = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const data = await getTodayScoreboard(user.uid);
            console.log('Today Scoreboard Data:', data);
            setTodayScoreboard(data);
        } catch (error) {
            console.error('Failed to fetch today scoreboard:', error);
        }
    }, [user?.uid]);

    const fetchFollowingList = useCallback(async () => {
        if (!user?.uid) return;
        setIsFollowingListLoading(true);
        try {
            const response = await getFollowingList(user.uid);
            setFollowingList(response.data);
        } catch (error) {
            console.error('Failed to fetch following list:', error);
        } finally {
            setIsFollowingListLoading(false);
        }
    }, [user?.uid]);

    const fetchFollowers = useCallback(async () => {
        if (!user?.uid) return;
        setIsFollowersLoading(true);
        try {
            const response = await getFollowers(user.uid);
            setFollowers(response.data);
        } catch (error) {
            console.error('Failed to fetch followers:', error);
        } finally {
            setIsFollowersLoading(false);
        }
    }, [user?.uid]);

    const handleFollowLearner = async (followCode: string) => {
        if (!user?.uid || !followCode.trim()) return;

        // Check if user is trying to follow themselves
        if (learnerInfo?.follow_me_code === followCode.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Cannot follow yourself',
                text2: 'You cannot use your own follow code',
                position: 'bottom',
            });
            return;
        }

        setIsFollowingLoading(true);
        setFollowCode('');

        try {
            const response = await followLearner(user.uid, followCode.trim());
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: `Successfully followed ${response.data.following.name}`,
                position: 'bottom',
            });
            fetchFollowingList();
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Failed to follow',
                text2: 'Please check the follow code and try again',
                position: 'bottom',
            });
        } finally {
            setIsFollowingLoading(false);
        }
    };

    const handleUnfollowLearner = async (learnerUid: string) => {
        if (!user?.uid) return;
        try {
            const response = await updateFollowerStatus(learnerUid, user.uid, 'deleted');
            if (response.message === 'Status updated successfully') {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: `Successfully unfollowed`,
                    position: 'bottom',
                });
                fetchFollowingList();
            }
        } catch (error) {
            console.error('Failed to unfollow:', error);
            Toast.show({
                type: 'error',
                text1: 'Failed to unfollow',
                text2: 'Please try again',
                position: 'bottom',
            });
        }
    };

    // Use useFocusEffect to fetch data when the tab is focused
    useFocusEffect(
        useCallback(() => {
            fetchLearnerInfo();
            fetchBadges();
            fetchLeaderboard();
            fetchWeeklyScoreboard();
            fetchTodayScoreboard();
            fetchFollowingList();
            fetchFollowers();
        }, [fetchLearnerInfo, fetchBadges, fetchLeaderboard, fetchWeeklyScoreboard, fetchTodayScoreboard, fetchFollowingList, fetchFollowers])
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

    // Add effect to refetch data when scoreboardType changes
    useEffect(() => {
        if (scoreboardType === 'weekly') {
            fetchWeeklyScoreboard();
        } else if (scoreboardType === 'today') {
            fetchTodayScoreboard();
        }
    }, [scoreboardType, fetchWeeklyScoreboard, fetchTodayScoreboard]);

    return (
        <LinearGradient
            colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
            style={[styles.gradient, { paddingTop: insets.top }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <Header learnerInfo={learnerInfo} />

            <View style={styles.header}>
                <ThemedText style={styles.title}>🏆 Social Zone</ThemedText>
                <ThemedText style={styles.subtitle}>
                    Connect and share your progress!
                </ThemedText>
            </View>

            <View style={tabStyles.container}>
                <TouchableOpacity
                    style={[
                        tabStyles.button,
                        activeTab === 'scoreboard' && tabStyles.activeButton
                    ]}
                    onPress={() => handleTabChange('scoreboard')}
                >
                    <ThemedText
                        style={[
                            tabStyles.text,
                            activeTab === 'scoreboard' && tabStyles.activeText
                        ]}
                    >
                        🏅 Scoreboard
                    </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        tabStyles.button,
                        activeTab === 'badges' && tabStyles.activeButton
                    ]}
                    onPress={() => handleTabChange('badges')}
                >
                    <ThemedText
                        style={[
                            tabStyles.text,
                            activeTab === 'badges' && tabStyles.activeText
                        ]}
                    >
                        🎖️ Badges
                    </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        tabStyles.button,
                        activeTab === 'following' && tabStyles.activeButton
                    ]}
                    onPress={() => handleTabChange('following')}
                >
                    <ThemedText
                        style={[
                            tabStyles.text,
                            activeTab === 'following' && tabStyles.activeText
                        ]}
                    >
                        👯‍♂️ Following
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
                                                backgroundColor: isDark ? 'rgba(30, 30, 30, 0.8)' : '#F8FAFC',
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
                ) : activeTab === 'scoreboard' ? (
                    <>
                        <View style={subTabStyles.container}>
                            <TouchableOpacity
                                style={[
                                    subTabStyles.button,
                                    scoreboardType === 'today' && subTabStyles.activeButton
                                ]}
                                onPress={() => setScoreboardType('today')}
                            >
                                <ThemedText
                                    style={[
                                        subTabStyles.text,
                                        scoreboardType === 'today' && subTabStyles.activeText
                                    ]}
                                >
                                    Today
                                </ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    subTabStyles.button,
                                    scoreboardType === 'weekly' && subTabStyles.activeButton
                                ]}
                                onPress={() => setScoreboardType('weekly')}
                            >
                                <ThemedText
                                    style={[
                                        subTabStyles.text,
                                        scoreboardType === 'weekly' && subTabStyles.activeText
                                    ]}
                                >
                                    This Week
                                </ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    subTabStyles.button,
                                    scoreboardType === 'all-time' && subTabStyles.activeButton
                                ]}
                                onPress={() => setScoreboardType('all-time')}
                            >
                                <ThemedText
                                    style={[
                                        subTabStyles.text,
                                        scoreboardType === 'all-time' && subTabStyles.activeText
                                    ]}
                                >
                                    All Time
                                </ThemedText>
                            </TouchableOpacity>
                        </View>

                        {scoreboardType === 'all-time' ? (
                            <Scoreboard
                                entries={leaderboard?.rankings.map(entry => ({
                                    name: entry.name,
                                    score: entry.points,
                                    position: entry.position,
                                    isCurrentLearner: entry.isCurrentLearner,
                                    avatar: entry.avatar,
                                    publicProfile: entry.publicProfile,
                                    followMeCode: entry.followMeCode,
                                })) || []}
                            />
                        ) : scoreboardType === 'weekly' ? (
                            <>
                                <Scoreboard
                                    entries={weeklyScoreboard?.scoreboard.map(entry => ({
                                        name: entry.name,
                                        score: entry.score,
                                        position: entry.position,
                                        isCurrentLearner: entry.isCurrentLearner,
                                        avatar: entry.avatar,
                                        publicProfile: entry.publicProfile,
                                        followMeCode: entry.followMeCode,
                                    })) || []}
                                />
                            </>
                        ) : (
                            <>
                                <Scoreboard
                                    entries={todayScoreboard?.scoreboard.map(entry => ({
                                        name: entry.name,
                                        score: entry.score,
                                        position: entry.position,
                                        isCurrentLearner: entry.isCurrentLearner,
                                        avatar: entry.avatar,
                                        publicProfile: entry.publicProfile,
                                        followMeCode: entry.followMeCode,
                                    })) || []}
                                />
                            </>
                        )}
                    </>
                ) : activeTab === 'following' ? (
                    <View style={styles.followingContainer}>
                        <View style={styles.followCodeContainer}>
                            <ThemedText style={styles.followCodeTitle}>Follow a friend</ThemedText>
                            <ThemedText style={styles.followCodeSubtitle}>
                                Got a friend on here? Type in their 4-letter code and start leveling up together!
                            </ThemedText>

                            <View style={styles.followCodeInputContainer}>
                                <TextInput
                                    style={[
                                        styles.followCodeInput,
                                        {
                                            color: colors.text,
                                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
                                            borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
                                        }
                                    ]}
                                    placeholder="CODE"
                                    placeholderTextColor={isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'}
                                    value={followCode}
                                    onChangeText={(text) => {
                                        const cleanText = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                                        setFollowCode(cleanText.slice(0, 4));
                                    }}
                                    maxLength={4}
                                    autoCapitalize="characters"
                                    keyboardType="default"
                                />

                                <TouchableOpacity
                                    style={[
                                        styles.followButton,
                                        {
                                            backgroundColor: colors.primary,
                                            opacity: followCode.length === 4 ? 1 : 0.5
                                        }
                                    ]}
                                    onPress={() => handleFollowLearner(followCode)}
                                    disabled={followCode.length !== 4 || isFollowingLoading}
                                >
                                    {isFollowingLoading ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <ThemedText style={styles.followButtonText}>🤝 Follow</ThemedText>
                                    )}
                                </TouchableOpacity>
                            </View>

                            {learnerInfo?.follow_me_code && (
                                <View style={styles.ownFollowCodeContainer}>
                                    <ThemedText style={styles.ownFollowCodeLabel}>Your Follow Code:</ThemedText>
                                    <View style={styles.ownFollowCodeBoxContainer}>
                                        <ThemedView style={[
                                            styles.ownFollowCodeBox,
                                            {
                                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                                            }
                                        ]}>
                                            <ThemedText style={[styles.ownFollowCodeText, { opacity: 0.8 }]}>
                                                {learnerInfo.follow_me_code}
                                            </ThemedText>
                                        </ThemedView>
                                        <TouchableOpacity
                                            style={[styles.copyButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}
                                            onPress={() => {
                                                if (learnerInfo?.follow_me_code) {
                                                    Clipboard.setString(learnerInfo.follow_me_code);
                                                    Toast.show({
                                                        type: 'success',
                                                        text1: 'Copied to clipboard',
                                                        position: 'bottom',
                                                    });
                                                }
                                            }}
                                        >
                                            <Ionicons name="copy-outline" size={20} color={colors.text} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}


                        </View>

                        <View style={styles.followingListContainer}>
                            <ThemedText style={styles.followingListTitle}>👯‍♂️ Following</ThemedText>

                            {isFollowingListLoading ? (
                                <ActivityIndicator style={styles.followingListLoader} color={colors.primary} />
                            ) : followingList.length === 0 ? (
                                <ThemedText style={styles.noFollowingText}>
                                    You are not following anyone yet
                                </ThemedText>
                            ) : (
                                followingList.map((learner) => (
                                    <TouchableOpacity
                                        key={learner.learner_uid}
                                        onPress={() => router.push(`/report/${learner.learner_uid}?name=${encodeURIComponent(learner.learner_name)}`)}
                                        activeOpacity={0.7}
                                    >
                                        <ThemedView
                                            style={[
                                                styles.followingListItem,
                                                {
                                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                                                }
                                            ]}
                                        >
                                            <TouchableOpacity
                                                style={[styles.unfollowButton, { backgroundColor: isDark ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 0, 0, 0.05)' }]}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handleUnfollowLearner(learner.learner_uid);
                                                }}
                                            >
                                                <Ionicons name="close" size={16} color="#FF4444" />
                                            </TouchableOpacity>
                                            <View style={styles.followingInfo}>
                                                <ThemedText style={styles.followingName}>
                                                    {learner.learner_name}
                                                </ThemedText>

                                                <View style={styles.followingMetaInfo}>
                                                    <View style={[styles.statsRow, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC', borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.03)' }]}>
                                                        <View style={styles.statItemContainer}>
                                                            <ThemedText style={styles.statsLabel}>points</ThemedText>
                                                            <View style={styles.statsContainer}>
                                                                <Image
                                                                    source={require('@/assets/images/points.png')}
                                                                    style={styles.statsIcon}
                                                                />
                                                                <ThemedText style={[styles.statsValue, { color: isDark ? colors.text : '#4B5563' }]}>
                                                                    {learner.points}
                                                                </ThemedText>
                                                            </View>
                                                        </View>

                                                        <View style={[styles.statsDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' }]} />

                                                        <View style={styles.statItemContainer}>
                                                            <ThemedText style={styles.statsLabel}>Streak</ThemedText>
                                                            <View style={styles.statsContainer}>
                                                                <Ionicons name="flame" size={24} color="#FF6B00" />
                                                                <ThemedText style={[styles.statsValue, { color: isDark ? colors.text : '#4B5563' }]}>
                                                                    {learner.streak}
                                                                </ThemedText>
                                                            </View>
                                                        </View>
                                                    </View>

                                                    <View style={[styles.questionsContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC', borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.03)' }]}>
                                                        <View style={[styles.questionStat, { opacity: isDark ? 1 : 0.8 }]}>
                                                            <Ionicons name="today-outline" size={16} style={{ marginRight: 8 }} color={colors.text} />
                                                            <ThemedText style={[styles.questionStat, { color: colors.text }]}>
                                                                {learner.questionsAnsweredToday} questions today
                                                            </ThemedText>
                                                        </View>
                                                        <View style={[styles.questionStat, { opacity: isDark ? 1 : 0.8 }]}>
                                                            <Ionicons name="calendar-outline" size={16} style={{ marginRight: 8 }} color={colors.text} />
                                                            <ThemedText style={[styles.questionStat, { color: colors.text }]}>
                                                                {learner.questionsAnsweredThisWeek} questions this week
                                                            </ThemedText>
                                                        </View>
                                                        <TouchableOpacity
                                                            style={[styles.viewReportButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}
                                                            onPress={() => router.push(`/report/${learner.learner_uid}?name=${encodeURIComponent(learner.learner_name)}`)}
                                                        >
                                                            <Ionicons name="analytics-outline" size={16} style={{ marginRight: 8 }} color={colors.primary} />
                                                            <ThemedText style={[styles.viewReportButtonText, { color: colors.primary }]}>
                                                                View Report
                                                            </ThemedText>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </View>
                                        </ThemedView>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>

                        <View style={styles.followersListContainer}>
                            <ThemedText style={styles.followersListTitle}>👯‍♂️ Your Groupies</ThemedText>

                            {isFollowersLoading ? (
                                <ActivityIndicator style={styles.followersListLoader} color={colors.primary} />
                            ) : followers.length === 0 ? (
                                <ThemedText style={styles.noFollowersText}>
                                    No one is following you yet
                                </ThemedText>
                            ) : (
                                followers.map((follower) => (
                                    <ThemedView
                                        key={follower.id}
                                        style={[
                                            styles.followerListItem,
                                            {
                                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                                            }
                                        ]}
                                    >
                                        <View style={styles.followerInfo}>
                                            <ThemedText style={styles.followerName}>
                                                {follower.name}
                                            </ThemedText>
                                        </View>

                                        <View style={styles.followerActions}>
                                            {!followingList.some(following => following.learner_uid === follower.uid) && (
                                                <TouchableOpacity
                                                    style={[styles.followBackButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }]}
                                                    onPress={() => handleFollowLearner(follower.follow_code)}
                                                >
                                                    <Ionicons name="person-add-outline" size={20} color={colors.primary} />
                                                    <ThemedText style={[styles.followBackButtonText, { color: colors.primary }]}>Follow Back</ThemedText>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </ThemedView>
                                ))
                            )}
                        </View>
                    </View>
                ) : null}
            </ScrollView>
            <Toast />
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
        marginTop: 32,
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
        paddingRight: 8,
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
        fontSize: 14,
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
        fontSize: 14,
        fontWeight: '600',
    },
    topThreeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginBottom: 32,
        marginTop: 32,
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
        paddingHorizontal: 4,
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
    followingContainer: {
        padding: 8,
    },
    followCodeContainer: {
        backgroundColor: 'transparent',
        borderRadius: 12,
        padding: 8,
    },
    followCodeTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    followCodeSubtitle: {
        fontSize: 14,
        opacity: 0.7,
        marginBottom: 16,
    },
    followCodeInputContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
        alignItems: 'center',
        paddingHorizontal: 16,
        width: '100%',
    },
    followCodeInput: {
        flex: 1,
        height: 48,
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 20,
        fontWeight: '600',
        borderWidth: 1,
        textAlign: 'center',
        letterSpacing: 4,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    followButton: {
        flex: 1,
        height: 48,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    followButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    errorText: {
        color: '#FF4444',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'left',
        opacity: 0.9,
        fontWeight: '400',
    },
    successText: {
        color: '#10B981',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'left',
        opacity: 0.9,
        fontWeight: '400',
    },
    followingListContainer: {
        padding: 8,
    },
    followingListTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    followingListLoader: {
        marginTop: 16,
    },
    followingListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
    },
    followingInfo: {
        flex: 1,
    },
    followingName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    followersListContainer: {
        marginTop: 24,
    },
    followersListTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 16,
    },
    followersListLoader: {
        marginTop: 16,
    },
    followerListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
    },
    followerInfo: {
        flex: 1,
    },
    followerName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    followerActions: {
        flexDirection: 'row',
        gap: 8,
    },
    followBackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 4,
    },
    followBackButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    blockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 4,
    },
    blockButtonText: {
        color: '#FF4444',
        fontSize: 14,
        fontWeight: '600',
    },
    noFollowersText: {
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.7,
    },
    unfollowButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    followingMetaInfo: {
        flexDirection: 'column',
        gap: 12,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        marginTop: 4,
        marginBottom: 8,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
    },
    statItemContainer: {
        alignItems: 'center',
        flex: 1,
    },
    statsLabel: {
        fontSize: 13,
        opacity: 0.6,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    statsValue: {
        fontSize: 20,
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statsIcon: {
        width: 24,
        height: 24,
        marginRight: 4,
    },
    statsDivider: {
        width: 1,
        height: 36,
        marginHorizontal: 16,
    },
    questionsContainer: {
        marginTop: 8,
        flexDirection: 'column',
        gap: 8,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
    },
    questionStat: {
        fontSize: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    noFollowingText: {
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.7,
    },
    ownFollowCodeContainer: {
        marginBottom: 24,
    },
    ownFollowCodeLabel: {
        fontSize: 14,
        opacity: 0.7,
        marginBottom: 8,
    },
    ownFollowCodeBoxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    ownFollowCodeBox: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    ownFollowCodeText: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 2,
    },
    copyButton: {
        padding: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        aspectRatio: 1,
    },
    weeklyScoreboardContainer: {
        padding: 16,
    },
    weeklyScoreboardHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    weeklyScoreboardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    weeklyScoreboardSubtitle: {
        fontSize: 16,
        opacity: 0.7,
        marginBottom: 4,
    },
    weeklyScoreboardParticipants: {
        fontSize: 14,
        opacity: 0.5,
    },
    scoreboardTable: {
        marginTop: 16,
    },
    scoreboardRow: {
        marginBottom: 12,
        borderRadius: 12,
        padding: 12,
    },
    scoreboardEntryContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scoreboardPositionContainer: {
        width: 40,
        alignItems: 'center',
    },
    scoreboardPositionText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    scoreboardAvatarContainer: {
        marginRight: 12,
    },
    scoreboardAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    scoreboardInfo: {
        flex: 1,
        paddingRight: 8,
    },
    scoreboardName: {
        fontSize: 16,
        fontWeight: '600',
    },
    scoreboardAnswers: {
        fontSize: 14,
        opacity: 0.7,
    },
    scoreboardScoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scoreboardPointsIcon: {
        width: 20,
        height: 20,
        marginRight: 4,
    },
    scoreboardScore: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    topThreeAnswers: {
        fontSize: 14,
        opacity: 0.7,
        marginTop: 4,
    },
    firstPlaceAnswers: {
        fontSize: 14,
    },
    schoolName: {
        fontSize: 14,
        opacity: 0.7,
        marginTop: 2,
    },
    topThreeSchool: {
        fontSize: 14,
        opacity: 0.7,
        marginTop: 2,
        textAlign: 'center',
    },
    firstPlaceSchool: {
        fontSize: 14,
    },
    viewReportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginTop: 8,
    },
    viewReportButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },

    scoreboardHint: {
        fontSize: 14,
        opacity: 0.7,
        textAlign: 'center',
        marginBottom: 8,
    },
}); 