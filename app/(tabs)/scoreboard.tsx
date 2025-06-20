import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { HOST_URL } from '@/config/api';

interface Learner {
    id: number;
    uid: string;
    name: string;
    points: number;
    avatar: string;
    subscription: string;
    position?: number;
}

interface ScoreboardResponse {
    topLearners: Learner[];
    currentLearner: Learner;
}

const medalEmojis = ['🥇', '🥈', '🥉'];
const crownEmoji = '👑';

function getAvatarSource(avatar: string) {
    switch (avatar) {
        case '1': return require('@/assets/images/avatars/1.png');
        case '2': return require('@/assets/images/avatars/2.png');
        case '3': return require('@/assets/images/avatars/3.png');
        case '4': return require('@/assets/images/avatars/4.png');
        case '5': return require('@/assets/images/avatars/5.png');
        case '6': return require('@/assets/images/avatars/6.png');
        case '7': return require('@/assets/images/avatars/7.png');
        case '8': return require('@/assets/images/avatars/8.png');
        case '9': return require('@/assets/images/avatars/9.png');
        default: return require('@/assets/images/avatars/1.png');
    }
}

function Podium({ learners }: { learners: Learner[] }) {
    // learners: [1st, 2nd, 3rd]
    return (
        <View style={styles.podiumContainer} accessibilityRole="header" accessibilityLabel="Top 3 learners podium">
            {/* 2nd place */}
            <View style={[styles.podiumSpot, styles.podiumSecond]}>
                {learners[1] && (
                    <>
                        <View style={styles.podiumCircle}>
                            <Image source={getAvatarSource(learners[1].avatar)} style={styles.podiumAvatar} accessibilityLabel={`Avatar of ${learners[1].name}`} />
                        </View>
                        <Text style={styles.podiumMedal}>🥈</Text>
                        <Text style={styles.podiumName}>{learners[1].name}</Text>
                        <Text style={styles.podiumPoints}>{learners[1].points}</Text>
                    </>
                )}
            </View>
            {/* 1st place */}
            <View style={[styles.podiumSpot, styles.podiumFirst]}>
                {learners[0] && (
                    <>
                        <Text style={styles.podiumCrown}>👑</Text>
                        <View style={styles.podiumCircleMain}>
                            <Image source={getAvatarSource(learners[0].avatar)} style={styles.podiumAvatarMain} accessibilityLabel={`Avatar of ${learners[0].name}`} />
                        </View>
                        <Text style={styles.podiumNameMain}>{learners[0].name}</Text>
                        <Text style={styles.podiumPointsMain}>{learners[0].points}</Text>
                    </>
                )}
            </View>
            {/* 3rd place */}
            <View style={[styles.podiumSpot, styles.podiumThird]}>
                {learners[2] && (
                    <>
                        <View style={styles.podiumCircle}>
                            <Image source={getAvatarSource(learners[2].avatar)} style={styles.podiumAvatar} accessibilityLabel={`Avatar of ${learners[2].name}`} />
                        </View>
                        <Text style={styles.podiumMedal}>🥉</Text>
                        <Text style={styles.podiumName}>{learners[2].name}</Text>
                        <Text style={styles.podiumPoints}>{learners[2].points}</Text>
                    </>
                )}
            </View>
        </View>
    );
}

export default function ScoreboardScreen() {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const [data, setData] = useState<ScoreboardResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchScoreboard() {
            try {
                setIsLoading(true);
                setError(null);
                const response = await fetch(
                    `${HOST_URL}/api/language-learners/scoreboard/${user?.uid}`
                );
                if (!response.ok) {
                    throw new Error('Failed to fetch scoreboard');
                }
                const jsonData = await response.json();
                setData(jsonData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch scoreboard');
            } finally {
                setIsLoading(false);
            }
        }

        if (user?.uid) {
            fetchScoreboard();
        }
    }, [user?.uid]);

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.loadingText, { color: colors.text }]}>Loading scoreboard...</Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>
                    {error}
                </Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#101A33' }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: '#fff' }]}>Leaderboard</Text>
            </View>
            {/* Podium for up to top 3 */}
            {data?.topLearners && data.topLearners.length > 0 && (
                <Podium learners={data.topLearners.slice(0, 3)} />
            )}
            {/* List for the rest, only if there are more than 3 learners */}
            {data?.topLearners && data.topLearners.length > 3 && (
                <FlatList
                    data={data.topLearners.slice(3)}
                    renderItem={({ item, index }) => {
                        const rank = index + 4;
                        const isCurrentUser = item.uid === user?.uid;
                        return (
                            <View
                                style={[
                                    styles.learnerRow,
                                    isCurrentUser && styles.learnerRowActive,
                                ]}
                                accessibilityRole="none"
                                accessibilityLabel={`Rank ${rank}, ${item.name}, ${item.points} points`}
                            >
                                <Text style={styles.rankRow}>#{rank}</Text>
                                <Image source={getAvatarSource(item.avatar)} style={styles.avatarRow} />
                                <Text style={styles.nameRow}>{item.name}</Text>
                                <Text style={styles.pointsRow}>{item.points}</Text>
                            </View>
                        );
                    }}
                    keyExtractor={(item) => item.uid}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<Text style={{ color: '#fff', textAlign: 'center', marginTop: 16 }}>No more learners</Text>}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#101A33',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2C365A',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    listContainer: {
        padding: 16,
        paddingTop: 0,
    },
    learnerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    rankContainer: {
        width: 40,
        alignItems: 'center',
    },
    rank: {
        fontSize: 16,
        fontWeight: '600',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    learnerInfo: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    points: {
        fontSize: 14,
    },
    loadingText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
    errorText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 16,
    },
    podiumContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginTop: 24,
        marginBottom: 32,
        minHeight: 200,
    },
    podiumSpot: {
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginHorizontal: 16,
        height: 180,
    },
    podiumFirst: {
        zIndex: 2,
        marginBottom: 60,
    },
    podiumSecond: {
    },
    podiumThird: {
    },
    podiumCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 4,
        borderColor: '#FFD600',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        marginBottom: 4,
    },
    podiumCircleMain: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 5,
        borderColor: '#FFD600',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        marginBottom: 4,
    },
    podiumAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    podiumAvatarMain: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    podiumCrown: {
        fontSize: 32,
        marginBottom: -8,
        textAlign: 'center',
    },
    podiumMedal: {
        fontSize: 20,
        marginBottom: 2,
        textAlign: 'center',
    },
    podiumName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 2,
        textAlign: 'center',
        width: 90,
    },
    podiumNameMain: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 2,
        textAlign: 'center',
        width: 110,
    },
    podiumPoints: {
        fontSize: 14,
        color: '#FFD600',
        textAlign: 'center',
        width: 90,
    },
    podiumPointsMain: {
        fontSize: 16,
        color: '#FFD600',
        fontWeight: 'bold',
        textAlign: 'center',
        width: 110,
    },
    learnerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 18,
        marginBottom: 14,
        borderRadius: 18,
        backgroundColor: '#232C47',
        borderWidth: 0,
    },
    learnerRowActive: {
        borderWidth: 2,
        borderColor: '#FFD600',
    },
    rankRow: {
        width: 44,
        fontSize: 18,
        fontWeight: '700',
        color: '#FFD600',
    },
    avatarRow: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 14,
    },
    nameRow: {
        flex: 1,
        fontSize: 17,
        color: '#fff',
        fontWeight: '600',
    },
    pointsRow: {
        fontSize: 17,
        color: '#FFD600',
        fontWeight: '700',
        marginLeft: 8,
    },
}); 