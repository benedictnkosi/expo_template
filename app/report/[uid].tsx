import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, Modal, Image, ImageSourcePropType } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HOST_URL } from '@/config/api';
import { Header } from '@/components/Header';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getLearnerBadges, LearnerBadge } from '@/services/api';
import { analytics } from '@/services/analytics';
import subjectEmojisJson from '../../assets/subject-emojis.json';
import { Share } from 'react-native';
const subjectEmojis = subjectEmojisJson as Record<string, string>;

function getGradeColor(grade: number): string {
    switch (grade) {
        case 7: return '#10B981'; // Outstanding - Green
        case 6: return '#3B82F6'; // Meritorious - Blue
        case 5: return '#6366F1'; // Substantial - Indigo
        case 4: return '#F59E0B'; // Adequate - Amber
        case 3: return '#F97316'; // Moderate - Orange
        case 2: return '#EF4444'; // Elementary - Red
        default: return '#DC2626'; // Not achieved - Dark Red
    }
}

interface SubjectPerformance {
    subject: string;
    subjectId: number;
    totalAnswers: number;
    correctAnswers: string;
    incorrectAnswers: string;
    percentage: number;
    grade: number;
    gradeDescription: string;
}

interface DailyActivity {
    date: string;
    count: number;
    correct: number;
    incorrect: number;
}

interface WeeklyProgress {
    week: string;
    weekStart: string;
    totalAnswers: number;
    correctAnswers: number;
    incorrectAnswers: number;
    percentage: number;
    grade: number;
    gradeDescription: string;
}

interface SubTopic {
    name: string;
    totalAttempts: number;
    correctAnswers: number;
    incorrectAnswers: number;
    successRate: number;
    grade: number;
    gradeDescription: string;
}

interface MainTopic {
    mainTopic: string;
    subTopics: SubTopic[];
    totalAttempts: number;
    correctAnswers: number;
    incorrectAnswers: number;
    successRate: number;
    grade: number;
    gradeDescription: string;
}

interface SubjectTopicReport {
    uid: string;
    subject: string;
    report: MainTopic[];
}

interface TodayEvent {
    title: string;
    startTime: string;
    endTime: string;
    subject: string;
    reminder: boolean;
}

interface CareerAdvice {
    advice: string;
    last_updated: string;
}

interface FollowingLearner {
    learner_uid: string;
    learner_name: string;
    points: number;
    streak: number;
    lastResult: {
        id: number;
        outcome: string;
        created: string;
        duration: number;
    };
    firstResult: {
        id: number;
        outcome: string;
        created: string;
        duration: number;
    };
    questionsAnsweredToday: number;
    questionsAnsweredThisWeek: number;
}

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

// Helper to clean subject name for display and emoji lookup
function getCleanSubjectName(subject: string): string {
    return subject.replace(/\bP[12]\b/gi, '').trim();
}

async function getLearnerPerformance(uid: string): Promise<{ data: SubjectPerformance[] }> {
    try {
        const response = await fetch(`${HOST_URL}/api/learner/${uid}/subject-performance`);
        if (!response.ok) {
            throw new Error('Failed to fetch learner performance');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching learner performance:', error);
        throw error;
    }
}

async function getLearnerDailyActivity(uid: string, subjectId?: number): Promise<{ data: DailyActivity[] }> {
    try {
        const url = subjectId
            ? `${HOST_URL}/api/learner/${uid}/daily-activity?subject_id=${subjectId}`
            : `${HOST_URL}/api/learner/${uid}/daily-activity`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch daily activity');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching daily activity:', error);
        throw error;
    }
}

async function getLearnerWeeklyProgress(uid: string, subjectId?: number): Promise<{ data: WeeklyProgress[] }> {
    try {
        const url = subjectId
            ? `${HOST_URL}/api/learner/${uid}/weekly-progress?subject_id=${subjectId}`
            : `${HOST_URL}/api/learner/${uid}/weekly-progress`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch weekly progress');
        }
        const data = await response.json();
        //console.log(data);
        return data;
    } catch (error) {
        console.error('Error fetching weekly progress:', error);
        throw error;
    }
}

async function getLearnerTopicReport(uid: string, subject: string): Promise<SubjectTopicReport> {
    try {
        const response = await fetch(`${HOST_URL}/api/learner/${uid}/report?subject=${encodeURIComponent(subject)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch topic report');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching topic report:', error);
        throw error;
    }
}

const SubjectReportModal = ({
    isVisible,
    onClose,
    subject,
    isDark,
    dailyActivity,
    weeklyProgress,
    isLoading,
    uid,
    name,
    user
}: {
    isVisible: boolean;
    onClose: () => void;
    subject: SubjectPerformance;
    isDark: boolean;
    dailyActivity: DailyActivity[];
    weeklyProgress: WeeklyProgress[];
    isLoading: boolean;
    uid: string;
    name: string;
    user: any;
}) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { width } = Dimensions.get('window');
    const [topicReport, setTopicReport] = useState<MainTopic[]>([]);
    const [isTopicLoading, setIsTopicLoading] = useState(false);
    const [expandedTopics, setExpandedTopics] = useState<{ [key: string]: boolean }>({});

    const toggleTopic = (topicName: string) => {
        setExpandedTopics(prev => ({
            ...prev,
            [topicName]: !prev[topicName]
        }));
    };

    useEffect(() => {
        async function fetchTopicReport() {
            if (isVisible && subject) {
                setIsTopicLoading(true);
                try {
                    const report = await getLearnerTopicReport(uid, subject.subject);
                    setTopicReport(report.report);
                } catch (error) {
                    console.error('Error fetching topic report:', error);
                } finally {
                    setIsTopicLoading(false);
                }
            }
        }
        fetchTopicReport();
    }, [isVisible, subject, uid]);

    const subjectDailyChartData = {
        labels: dailyActivity.map(item => {
            const date = new Date(item.date);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        }).reverse(),
        datasets: [
            {
                data: dailyActivity.map(item => item.count).reverse(),
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // green
                strokeWidth: 2
            }
        ]
    };

    const subjectWeeklyChartData = {
        labels: weeklyProgress.map(item => {
            const date = new Date(item.weekStart);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        }).reverse(),
        datasets: [
            {
                data: weeklyProgress.map(item => item.totalAnswers).reverse(),
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // blue
            },
            {
                data: weeklyProgress.map(item => item.correctAnswers).reverse(),
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // green
            }
        ]
    };

    return (
        <Modal
            visible={isVisible}
            transparent={false}
            animationType="slide"
            onRequestClose={onClose}
            testID='subject-report-modal'
            presentationStyle="fullScreen"
        >
            <View style={[styles.modalOverlay, { backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF', flex: 1 }]}>
                <View style={[
                    styles.modalContent,
                    {
                        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        width: '100%',
                        height: '100%',
                        flex: 1,
                    }
                ]}>
                    <View style={styles.modalHeader}>
                        <ThemedText style={styles.modalTitle}>
                            {(subjectEmojis as Record<string, string>)[getCleanSubjectName(subject.subject)] || '📚'} {subject.subject}
                        </ThemedText>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeModalButton}
                        >
                            <Ionicons
                                name="close"
                                size={24}
                                color={isDark ? '#FFFFFF' : '#000000'}
                            />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.modalScrollView}
                        contentContainerStyle={styles.modalScrollViewContent}
                    >
                        {isLoading ? (
                            <View style={styles.modalLoadingContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <ThemedText style={styles.modalLoadingText}>Loading data...</ThemedText>
                            </View>
                        ) : (
                            <>
                                {dailyActivity.length > 1 ? (
                                    <ThemedView style={[styles.modalChartContainer, {
                                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                                    }]}>
                                        <ThemedText style={styles.modalChartTitle}>📊 Daily Activity</ThemedText>
                                        <LineChart
                                            data={subjectDailyChartData}
                                            width={width - 32}
                                            height={220}
                                            chartConfig={{
                                                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                                                backgroundGradientFrom: isDark ? '#1E1E1E' : '#FFFFFF',
                                                backgroundGradientTo: isDark ? '#1E1E1E' : '#FFFFFF',
                                                decimalPlaces: 0,
                                                color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                                                labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                                                style: {
                                                    borderRadius: 16
                                                },
                                                propsForDots: {
                                                    r: "6",
                                                    strokeWidth: "2",
                                                    stroke: isDark ? "#FFFFFF" : "#000000"
                                                }
                                            }}
                                            bezier
                                            style={styles.modalChart}
                                        />
                                    </ThemedView>
                                ) : null}

                                {weeklyProgress.length > 1 ? (
                                    <ThemedView style={[styles.modalChartContainer, {
                                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                                    }]}>
                                        <ThemedText style={styles.modalChartTitle}>📈 Weekly Progress</ThemedText>
                                        <LineChart
                                            data={subjectWeeklyChartData}
                                            width={width - 32}
                                            height={220}
                                            chartConfig={{
                                                backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                                                backgroundGradientFrom: isDark ? '#1E1E1E' : '#FFFFFF',
                                                backgroundGradientTo: isDark ? '#1E1E1E' : '#FFFFFF',
                                                decimalPlaces: 0,
                                                color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                                                labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                                                style: {
                                                    borderRadius: 16
                                                },
                                                propsForDots: {
                                                    r: "6",
                                                    strokeWidth: "2",
                                                    stroke: isDark ? "#FFFFFF" : "#000000"
                                                }
                                            }}
                                            bezier
                                            style={styles.modalChart}
                                        />
                                        <View style={styles.modalLegendContainer}>
                                            <View style={styles.modalLegendItem}>
                                                <View style={[styles.modalLegendColor, { backgroundColor: '#3B82F6' }]} />
                                                <ThemedText style={styles.modalLegendText}>Answers</ThemedText>
                                            </View>
                                            <View style={styles.modalLegendItem}>
                                                <View style={[styles.modalLegendColor, { backgroundColor: '#10B981' }]} />
                                                <ThemedText style={styles.modalLegendText}>Correct</ThemedText>
                                            </View>
                                        </View>
                                    </ThemedView>
                                ) : null}

                                <View style={styles.modalStatsContainer}>
                                    <View style={styles.modalStatItem}>
                                        <ThemedText style={styles.modalStatLabel}>Total Answers</ThemedText>
                                        <ThemedText style={styles.modalStatValue}>{subject.totalAnswers}</ThemedText>
                                    </View>
                                    <View style={styles.modalStatItem}>
                                        <ThemedText style={styles.modalStatLabel}>Correct Answers</ThemedText>
                                        <ThemedText style={[styles.modalStatValue, { color: '#10B981' }]}>
                                            {subject.correctAnswers}
                                        </ThemedText>
                                    </View>
                                    <View style={styles.modalStatItem}>
                                        <ThemedText style={styles.modalStatLabel}>Incorrect Answers</ThemedText>
                                        <ThemedText style={[styles.modalStatValue, { color: '#EF4444' }]}>
                                            {subject.incorrectAnswers}
                                        </ThemedText>
                                    </View>
                                </View>

                                <View style={styles.modalGradeContainer}>
                                    <View style={styles.modalGradeInfo}>
                                        <ThemedText style={styles.modalGradeLabel}>Success Rate</ThemedText>
                                        <ThemedText style={[styles.modalGradeValue, { color: getGradeColor(subject.grade) }]}>
                                            {subject.percentage}%
                                        </ThemedText>
                                    </View>
                                    <View style={[styles.modalGradeBadge, { backgroundColor: getGradeColor(subject.grade) }]}>
                                        <ThemedText style={styles.modalGradeText}>Level {subject.grade}</ThemedText>
                                        <ThemedText style={styles.modalGradeDescription}>
                                            {subject.grade === 1 ? 'Not achieved' :
                                                subject.grade === 7 ? 'Outstanding achievement' :
                                                    subject.grade === 6 ? 'Meritorious achievement' :
                                                        subject.grade === 5 ? 'Substantial achievement' :
                                                            subject.grade === 4 ? 'Adequate achievement' :
                                                                subject.grade === 3 ? 'Moderate achievement' :
                                                                    'Elementary achievement'}
                                        </ThemedText>
                                    </View>
                                </View>

                                <ThemedView style={[styles.modalChartContainer, {
                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                                }]}>
                                    <ThemedText style={styles.modalChartTitle}>📚 Topic Performance</ThemedText>
                                    {isTopicLoading ? (
                                        <View style={styles.modalLoadingContainer}>
                                            <ActivityIndicator size="small" color={colors.primary} style={{ marginBottom: 16 }} />
                                            <ThemedText style={{ fontSize: 20, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
                                                Analyzing your performance...
                                            </ThemedText>
                                            <ThemedText style={{ fontSize: 16, opacity: 0.7, textAlign: 'center', marginBottom: 24, paddingHorizontal: 24 }}>
                                                Our AI is carefully reviewing your strengths and interests to provide personalized career guidance
                                            </ThemedText>
                                        </View>
                                    ) : topicReport.length > 0 ? (
                                        topicReport
                                            .filter(topic => topic.mainTopic !== "Uncategorized")
                                            .map((mainTopic: MainTopic, index: number) => (
                                                <View key={index} style={[
                                                    styles.topicItem,
                                                    {
                                                        backgroundColor: isDark
                                                            ? 'rgba(255, 255, 255, 0.03)'
                                                            : '#FFFFFF',
                                                        borderColor: isDark
                                                            ? 'rgba(255, 255, 255, 0.1)'
                                                            : 'rgba(0, 0, 0, 0.04)'
                                                    }
                                                ]}>
                                                    <TouchableOpacity
                                                        style={styles.topicHeader}
                                                        onPress={() => toggleTopic(mainTopic.mainTopic)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <View style={styles.topicHeaderContent}>
                                                            <ThemedText style={styles.mainTopicName}>
                                                                {mainTopic.mainTopic}
                                                            </ThemedText>
                                                            <View style={styles.topicActions}>
                                                                <Ionicons
                                                                    name={expandedTopics[mainTopic.mainTopic] ? "chevron-up" : "chevron-down"}
                                                                    size={24}
                                                                    color={isDark ? '#FFFFFF' : '#000000'}
                                                                />
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>

                                                    <View style={styles.topicStats}>
                                                        <View style={styles.statGroup}>
                                                            <ThemedText style={styles.topicStatLabel}>Total Answers</ThemedText>
                                                            <ThemedText style={styles.topicStatValue}>{mainTopic.totalAttempts}</ThemedText>
                                                        </View>
                                                        <View style={styles.statGroup}>
                                                            <ThemedText style={styles.topicStatLabel}>Correct</ThemedText>
                                                            <ThemedText style={[
                                                                styles.topicStatValue,
                                                                { color: '#10B981' }
                                                            ]}>
                                                                {mainTopic.correctAnswers}
                                                            </ThemedText>
                                                        </View>
                                                        <View style={styles.statGroup}>
                                                            <ThemedText style={styles.topicStatLabel}>Incorrect</ThemedText>
                                                            <ThemedText style={[
                                                                styles.topicStatValue,
                                                                { color: '#EF4444' }
                                                            ]}>
                                                                {mainTopic.incorrectAnswers}
                                                            </ThemedText>
                                                        </View>
                                                    </View>

                                                    <View style={styles.gradeContainer}>
                                                        <View style={styles.successRate}>
                                                            <ThemedText style={styles.successRateLabel}>Success Rate</ThemedText>
                                                            <ThemedText style={[
                                                                styles.successRateValue,
                                                                { color: mainTopic.successRate === 0 ? '#EF4444' : '#3B82F6' }
                                                            ]}>
                                                                {mainTopic.successRate.toFixed(2)}%
                                                            </ThemedText>
                                                        </View>
                                                        <View style={[
                                                            styles.levelBadge,
                                                            { backgroundColor: getGradeColor(mainTopic.grade) }
                                                        ]}>
                                                            <ThemedText style={styles.levelText}>Level {mainTopic.grade}</ThemedText>
                                                            <ThemedText style={styles.levelDescription}>
                                                                {mainTopic.gradeDescription}
                                                            </ThemedText>
                                                        </View>
                                                    </View>

                                                    {user?.uid === uid && (
                                                        <TouchableOpacity
                                                            style={[
                                                                styles.quizButton,
                                                                {
                                                                    backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#6366F1',
                                                                    borderColor: isDark ? 'rgba(99,102,241,0.4)' : '#6366F1',
                                                                }
                                                            ]}
                                                            onPress={() => {
                                                                router.push({
                                                                    pathname: '/quiz',
                                                                    params: {
                                                                        subjectName: getCleanSubjectName(subject.subject),
                                                                        topic: mainTopic.mainTopic
                                                                    }
                                                                });
                                                            }}
                                                        >
                                                            <Ionicons
                                                                name="play-circle"
                                                                size={20}
                                                                color={isDark ? '#FFFFFF' : '#FFFFFF'}
                                                            />
                                                            <ThemedText style={[styles.quizButtonText, { color: '#FFFFFF' }]}>
                                                                Start Quiz for this topic
                                                            </ThemedText>
                                                        </TouchableOpacity>
                                                    )}

                                                    {expandedTopics[mainTopic.mainTopic] && (
                                                        <View style={styles.subTopicsContainer}>
                                                            {mainTopic.subTopics.map((subTopic, subIndex) => (
                                                                <View key={subIndex} style={[
                                                                    styles.subTopicItem,
                                                                    {
                                                                        backgroundColor: isDark
                                                                            ? 'rgba(255, 255, 255, 0.02)'
                                                                            : 'rgba(0, 0, 0, 0.02)',
                                                                        borderColor: isDark
                                                                            ? 'rgba(255, 255, 255, 0.05)'
                                                                            : 'rgba(0, 0, 0, 0.05)'
                                                                    }
                                                                ]}>
                                                                    <ThemedText style={styles.subTopicName}>
                                                                        {subTopic.name}
                                                                    </ThemedText>
                                                                    <View style={styles.subTopicStats}>
                                                                        <View style={styles.subTopicStat}>
                                                                            <ThemedText style={styles.subTopicStatLabel}>Total</ThemedText>
                                                                            <ThemedText style={styles.subTopicStatValue}>{subTopic.totalAttempts}</ThemedText>
                                                                        </View>
                                                                        <View style={styles.subTopicStat}>
                                                                            <ThemedText style={styles.subTopicStatLabel}>Correct</ThemedText>
                                                                            <ThemedText style={[styles.subTopicStatValue, { color: '#10B981' }]}>
                                                                                {subTopic.correctAnswers}
                                                                            </ThemedText>
                                                                        </View>
                                                                        <View style={styles.subTopicStat}>
                                                                            <ThemedText style={styles.subTopicStatLabel}>Incorrect</ThemedText>
                                                                            <ThemedText style={[styles.subTopicStatValue, { color: '#EF4444' }]}>
                                                                                {subTopic.incorrectAnswers}
                                                                            </ThemedText>
                                                                        </View>
                                                                    </View>
                                                                    <View style={styles.subTopicGradeContainer}>
                                                                        <View style={styles.subTopicSuccessRate}>
                                                                            <ThemedText style={styles.subTopicStatLabel}>Success Rate</ThemedText>
                                                                            <ThemedText style={[
                                                                                styles.subTopicGradeValue,
                                                                                { color: subTopic.successRate === 0 ? '#EF4444' : '#3B82F6' }
                                                                            ]}>
                                                                                {subTopic.successRate.toFixed(2)}%
                                                                            </ThemedText>
                                                                        </View>
                                                                        <View style={[
                                                                            styles.subTopicLevelBadge,
                                                                            { backgroundColor: getGradeColor(subTopic.grade) }
                                                                        ]}>
                                                                            <ThemedText style={styles.subTopicLevelText}>Level {subTopic.grade}</ThemedText>
                                                                            <ThemedText style={styles.subTopicLevelDescription}>
                                                                                {subTopic.gradeDescription}
                                                                            </ThemedText>
                                                                        </View>
                                                                    </View>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                            ))
                                    ) : (
                                        <View style={styles.modalEmptyDataContainer}>
                                            <ThemedText style={styles.modalEmptyDataText}>
                                                No topic data available
                                            </ThemedText>
                                        </View>
                                    )}
                                </ThemedView>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default function LearnerPerformanceScreen() {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { uid, name } = useLocalSearchParams();
    const { user } = useAuth();
    const [performance, setPerformance] = useState<SubjectPerformance[]>([]);
    const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
    const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([]);
    const [subjectDailyActivity, setSubjectDailyActivity] = useState<DailyActivity[]>([]);
    const [subjectWeeklyProgress, setSubjectWeeklyProgress] = useState<WeeklyProgress[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubjectLoading, setIsSubjectLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<SubjectPerformance | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [badges, setBadges] = useState<LearnerBadge[]>([]);
    const [isBadgesLoading, setIsBadgesLoading] = useState(true);
    const [todayEvents, setTodayEvents] = useState<TodayEvent[]>([]);
    const [isTodayEventsLoading, setIsTodayEventsLoading] = useState(true);
    const [careerAdvice, setCareerAdvice] = useState<CareerAdvice | null>(null);
    const [isCareerAdviceLoading, setIsCareerAdviceLoading] = useState(false);
    const [isCareerAdviceRulesModalVisible, setIsCareerAdviceRulesModalVisible] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isFollowingLoading, setIsFollowingLoading] = useState(true);
    const [isCareerAdviceModalVisible, setIsCareerAdviceModalVisible] = useState(false);

    // Reset modal state when component mounts or uid changes
    useEffect(() => {
        setIsModalVisible(false);
        setSelectedSubject(null);
    }, [uid]);

    const handleClose = () => {
        router.back();
    };

    const openSubjectReport = async (subject: SubjectPerformance) => {
        setSelectedSubject(subject);
        setIsSubjectLoading(true);
        try {
            const [dailyResponse, weeklyResponse] = await Promise.all([
                getLearnerDailyActivity(uid as string, subject.subjectId),
                getLearnerWeeklyProgress(uid as string, subject.subjectId)
            ]);
            setSubjectDailyActivity(dailyResponse.data);
            setSubjectWeeklyProgress(weeklyResponse.data);
            setIsModalVisible(true);

            // Log analytics event
            await analytics.track('view_subject_report', {
                user_id: uid,
                subject_name: subject.subject,
                subject_id: subject.subjectId,
                total_answers: subject.totalAnswers,
                correct_answers: subject.correctAnswers,
                grade: subject.grade
            });
        } catch (err) {
            console.error('Error fetching subject data:', err);
            setError('Failed to load subject data');
        } finally {
            setIsSubjectLoading(false);
        }
    };

    const closeModal = () => {
        setIsModalVisible(false);
        setSelectedSubject(null);
        setSubjectDailyActivity([]);
        setSubjectWeeklyProgress([]);
    };

    // Handle navigation focus
    useFocusEffect(
        React.useCallback(() => {
            closeModal();
        }, [])
    );

    const showCareerAdvice = async () => {
        setIsCareerAdviceLoading(true);
        try {
            console.log('Fetching career advice for user:', uid);
            const response = await fetch(`${HOST_URL}/api/learner/${uid}/career-advice`);
            if (!response.ok) {
                console.error('Career advice API error:', response.status, response.statusText);
                throw new Error('Failed to fetch career advice');
            }
            const data = await response.json();
            console.log('Career advice API response:', JSON.stringify(data, null, 2));
            if (data.status === 'OK') {
                setCareerAdvice({
                    ...data.data,
                    advice: data.data.advice
                });
                setIsCareerAdviceModalVisible(true);
            }
        } catch (error) {
            console.error('Error fetching career advice:', error);
        } finally {
            setIsCareerAdviceLoading(false);
        }
    };

    const shouldShowCareerAdvice = () => {
        if (!performance || performance.length === 0) return false;

        // Group P1 and P2 subjects together
        const subjectGroups = new Map<string, number>();
        performance.forEach(subject => {
            const cleanSubject = getCleanSubjectName(subject.subject);
            const currentTotal = subjectGroups.get(cleanSubject) || 0;
            subjectGroups.set(cleanSubject, currentTotal + subject.totalAnswers);
        });

        // Check if there are at least 4 subjects with 25+ questions
        const subjectsWithEnoughQuestions = Array.from(subjectGroups.values())
            .filter(total => total >= 10).length;

        return subjectsWithEnoughQuestions >= 3;
    };

    const checkFollowingStatus = async () => {
        if (!user?.uid) return;

        try {
            const response = await fetch(`${HOST_URL}/api/learner-following/following/${user.uid}`);
            if (!response.ok) throw new Error('Failed to fetch following status');

            const data = await response.json();
            const isFollowingLearner = data.data.some((learner: FollowingLearner) => learner.learner_uid === uid);
            setIsFollowing(isFollowingLearner);
        } catch (error) {
            console.error('Error checking following status:', error);
        } finally {
            setIsFollowingLoading(false);
        }
    };

    const handleFollow = async () => {
        if (!user?.uid) return;

        try {
            const response = await fetch(`${HOST_URL}/api/learner-following/follow/${user.uid}/${uid}`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Failed to follow learner');

            setIsFollowing(true);

            // Log analytics event
            await analytics.track('follow_learner', {
                follower_id: user.uid,
                followed_id: uid,
            });
        } catch (error) {
            console.error('Error following learner:', error);
        }
    };

    const handleShare = async () => {
        try {
            const shareUrl = `https://examquiz.co.za/report/${uid}?name=${encodeURIComponent(name as string)}`;
            await Share.share({
                message: `📊 Check out ${name}'s performance report on ExamQuiz! See their progress and achievements in various subjects. Download ExamQuiz to track your own progress!\n\nView the report: ${shareUrl}`,
                title: `${name}'s Performance Report`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    useEffect(() => {
        async function fetchData() {
            try {
                const [performanceResponse, activityResponse, weeklyResponse, badgesResponse, todayEventsResponse] = await Promise.all([
                    getLearnerPerformance(uid as string),
                    getLearnerDailyActivity(uid as string),
                    getLearnerWeeklyProgress(uid as string),
                    getLearnerBadges(uid as string),
                    fetch(`${HOST_URL}/api/learner/${uid}/today-events`).then(res => res.json())
                ]);
                setPerformance(performanceResponse.data);
                setDailyActivity(activityResponse.data);
                setWeeklyProgress(weeklyResponse.data);
                setBadges(badgesResponse);
                setTodayEvents(todayEventsResponse.events || []);

                // Log analytics event for page load
                await analytics.track('view_performance_report', {
                    user_id: uid,
                    viewer_id: user?.uid,
                    is_own_report: uid === user?.uid,
                    total_subjects: performanceResponse.data.length,
                    has_badges: badgesResponse.length > 0,
                    has_daily_activity: activityResponse.data.length > 0,
                    has_weekly_progress: weeklyResponse.data.length > 0
                });
            } catch (err) {
                setError('Failed to load learner data');
                console.error(err);
            } finally {
                setIsLoading(false);
                setIsBadgesLoading(false);
                setIsTodayEventsLoading(false);
            }
        }

        fetchData();
    }, [uid]);

    useEffect(() => {
        checkFollowingStatus();
    }, [user?.uid, uid]);

    const dailyChartData = {
        labels: dailyActivity.map(item => {
            const date = new Date(item.date);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        }).reverse(),
        datasets: [
            {
                data: dailyActivity.map(item => item.count).reverse(),
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // green
                strokeWidth: 2
            }
        ]
    };

    const weeklyChartData = {
        labels: weeklyProgress.map(item => {
            const date = new Date(item.weekStart);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        }).reverse(),
        datasets: [
            {
                data: weeklyProgress.map(item => item.totalAnswers).reverse(),
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // blue
            },
            {
                data: weeklyProgress.map(item => item.correctAnswers).reverse(),
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // green
            }
        ]
    };

    return (
        <LinearGradient
            colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
            style={[styles.gradient, { paddingTop: insets.top }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <View style={styles.headerContainer}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={handleClose}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="close"
                            size={24}
                            color={isDark ? '#FFFFFF' : '#000000'}
                        />
                    </TouchableOpacity>
                    <ThemedText style={styles.headerTitle}>🏆 {name}'s Performance</ThemedText>
                    <View style={styles.closeButton} />
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={[
                            styles.shareButton,
                            {
                                backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#6366F1',
                                borderColor: isDark ? 'rgba(99,102,241,0.4)' : '#6366F1',
                            }
                        ]}
                        onPress={handleShare}
                    >
                        <Ionicons
                            name="share-outline"
                            size={20}
                            color={isDark ? '#FFFFFF' : '#FFFFFF'}
                        />
                        <ThemedText style={[styles.shareButtonText, { color: '#FFFFFF' }]}>
                            Share Report
                        </ThemedText>
                    </TouchableOpacity>
                    {user?.uid !== uid && !isFollowingLoading && (
                        <TouchableOpacity
                            style={[
                                styles.followButton,
                                {
                                    backgroundColor: isFollowing
                                        ? (isDark ? 'rgba(16, 185, 129, 0.2)' : '#10B981')
                                        : (isDark ? 'rgba(59, 130, 246, 0.2)' : '#3B82F6'),
                                    borderColor: isFollowing
                                        ? (isDark ? 'rgba(16, 185, 129, 0.4)' : '#10B981')
                                        : (isDark ? 'rgba(59, 130, 246, 0.4)' : '#3B82F6'),
                                }
                            ]}
                            onPress={handleFollow}
                            disabled={isFollowing}
                        >
                            <Ionicons
                                name={isFollowing ? "checkmark" : "person-add"}
                                size={20}
                                color={isDark ? '#FFFFFF' : '#FFFFFF'}
                            />
                            <ThemedText style={styles.followButtonText}>
                                {isFollowing ? 'Following' : 'Follow Learner'}
                            </ThemedText>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
            >
                {/* Study Plan for Today */}
                {todayEvents.length > 0 && (
                    <ThemedView style={[
                        styles.todayEventsContainer,
                        {
                            backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#E0E7FF',
                            borderColor: isDark ? 'rgba(99,102,241,0.2)' : '#6366F1',
                        }
                    ]} accessibilityRole="summary" accessibilityLabel="Today's Study Plan">
                        <ThemedText style={styles.todayEventsTitle}>Study Plan! ⏰</ThemedText>
                        {isTodayEventsLoading ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            todayEvents.map((event, idx) => {
                                const emoji = (subjectEmojis as Record<string, string>)[event.subject] || '📖';
                                return (
                                    <View key={idx} style={styles.todayEventCard}>
                                        <ThemedText style={styles.todayEventTitle}>{emoji} {event.title}</ThemedText>
                                        <ThemedText style={styles.todayEventTime}>{event.startTime} - {event.endTime}</ThemedText>
                                        <ThemedText style={styles.todayEventSubject}>{event.subject}</ThemedText>
                                    </View>
                                );
                            })
                        )}
                    </ThemedView>
                )}

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <ThemedText style={styles.loadingText}>Loading performance data...</ThemedText>
                    </View>
                ) : error ? (
                    <View style={styles.errorContainer}>
                        <ThemedText style={styles.errorText}>{error}</ThemedText>
                    </View>
                ) : (
                    <>
                        {!isBadgesLoading && badges.length > 0 && (
                            <ThemedView style={[styles.badgesContainer, {
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                            }]}>
                                <ThemedText style={styles.badgesTitle}>🏆 Achievements</ThemedText>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.badgesScrollContent}
                                >
                                    {badges.map((badge, index) => (
                                        <View key={index} style={styles.badgeItem}>
                                            <Image
                                                source={badgeImages[badge.image] || require('@/assets/images/badges/3-day-streak.png')}
                                                style={[
                                                    styles.badgeImage
                                                ]}
                                                resizeMode="contain"
                                            />
                                            <ThemedText style={styles.badgeName}>{badge.name}</ThemedText>
                                        </View>
                                    ))}
                                </ScrollView>
                            </ThemedView>
                        )}

                        {dailyActivity.length > 1 ? (
                            <ThemedView style={[styles.chartContainer, {
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                            }]}>
                                <ThemedText style={styles.chartTitle}>📊 Daily Answers</ThemedText>
                                <LineChart
                                    data={dailyChartData}
                                    width={Dimensions.get('window').width - 48}
                                    height={220}
                                    chartConfig={{
                                        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                                        backgroundGradientFrom: isDark ? '#1E1E1E' : '#FFFFFF',
                                        backgroundGradientTo: isDark ? '#1E1E1E' : '#FFFFFF',
                                        decimalPlaces: 0,
                                        color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                                        labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                                        style: {
                                            borderRadius: 16
                                        },
                                        propsForDots: {
                                            r: "6",
                                            strokeWidth: "2",
                                            stroke: isDark ? "#FFFFFF" : "#000000"
                                        }
                                    }}
                                    bezier
                                    style={styles.chart}
                                />

                            </ThemedView>
                        ) : null}

                        {weeklyProgress.length > 1 ? (
                            <ThemedView style={[styles.chartContainer, {
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                            }]}>
                                <ThemedText style={styles.chartTitle}>📈 Weekly Progress</ThemedText>
                                <LineChart
                                    data={weeklyChartData}
                                    width={Dimensions.get('window').width - 48}
                                    height={220}
                                    chartConfig={{
                                        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                                        backgroundGradientFrom: isDark ? '#1E1E1E' : '#FFFFFF',
                                        backgroundGradientTo: isDark ? '#1E1E1E' : '#FFFFFF',
                                        decimalPlaces: 0,
                                        color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                                        labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                                        style: {
                                            borderRadius: 16
                                        },
                                        propsForDots: {
                                            r: "6",
                                            strokeWidth: "2",
                                            stroke: isDark ? "#FFFFFF" : "#000000"
                                        }
                                    }}
                                    bezier
                                    style={styles.chart}
                                />
                                <View style={styles.legendContainer}>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendColor, { backgroundColor: '#3B82F6' }]} />
                                        <ThemedText style={styles.legendText}>Answers</ThemedText>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
                                        <ThemedText style={styles.legendText}>Correct</ThemedText>
                                    </View>
                                </View>
                            </ThemedView>
                        ) : null}

                        {!isLoading && !error && (user?.uid === uid || shouldShowCareerAdvice()) && (
                            <TouchableOpacity
                                style={[
                                    styles.careerAdviceButton,
                                    {
                                        backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : '#6366F1',
                                        borderColor: isDark ? 'rgba(99,102,241,0.4)' : '#6366F1',
                                    }
                                ]}
                                onPress={() => {
                                    if (user?.uid === uid || shouldShowCareerAdvice()) {
                                        showCareerAdvice();
                                    } else {
                                        setIsCareerAdviceRulesModalVisible(true);
                                    }
                                }}
                                disabled={isCareerAdviceLoading}
                            >
                                {isCareerAdviceLoading ? (
                                    <ActivityIndicator size="small" color={isDark ? '#FFFFFF' : '#FFFFFF'} />
                                ) : (
                                    <>
                                        <Ionicons
                                            name="bulb"
                                            size={24}
                                            color={isDark ? '#FFFFFF' : '#FFFFFF'}
                                        />
                                        <ThemedText style={styles.careerAdviceButtonText}>
                                            {user?.uid === uid ? 'Get Career Advice' : `View ${name}'s Career Advice`}
                                        </ThemedText>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}

                        <ThemedText style={styles.hintText}>
                            💡 Tap on any subject card below to view detailed performance report
                        </ThemedText>

                        <View style={styles.performanceContainer}>
                            {performance
                                .sort((a, b) => a.subject.localeCompare(b.subject))
                                .map((subject, index) => (
                                    <TouchableOpacity
                                        key={`${subject.subject}-${index}`}
                                        onPress={() => openSubjectReport(subject)}
                                        activeOpacity={0.7}
                                    >
                                        <ThemedView
                                            style={[
                                                styles.subjectCard,
                                                {
                                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                                                }
                                            ]}
                                        >
                                            <View style={styles.subjectHeader}>
                                                <ThemedText style={styles.subjectName}>
                                                    {(subjectEmojis as Record<string, string>)[getCleanSubjectName(subject.subject)] || '📚'} {subject.subject}
                                                </ThemedText>
                                                <Ionicons
                                                    name="stats-chart"
                                                    size={24}
                                                    color={isDark ? '#FFFFFF' : '#000000'}
                                                />
                                            </View>

                                            <View style={styles.statsGrid}>
                                                <View style={styles.statItem}>
                                                    <ThemedText style={styles.statLabel}>Total Answers</ThemedText>
                                                    <ThemedText style={styles.statValue}>{subject.totalAnswers}</ThemedText>
                                                </View>

                                                <View style={styles.statItem}>
                                                    <ThemedText style={styles.statLabel}>Correct</ThemedText>
                                                    <ThemedText style={[styles.statValue, { color: '#10B981' }]}>
                                                        {subject.correctAnswers}
                                                    </ThemedText>
                                                </View>

                                                <View style={styles.statItem}>
                                                    <ThemedText style={styles.statLabel}>Incorrect</ThemedText>
                                                    <ThemedText style={[styles.statValue, { color: '#EF4444' }]}>
                                                        {subject.incorrectAnswers}
                                                    </ThemedText>
                                                </View>
                                            </View>

                                            <View style={styles.performanceFooter}>
                                                <View style={styles.percentageContainer}>
                                                    <ThemedText style={styles.percentageLabel}>Success Rate</ThemedText>
                                                    <ThemedText style={[
                                                        styles.percentageValue,
                                                        { color: subject.grade === 1 ? '#EF4444' : '#3B82F6' }
                                                    ]}>
                                                        {subject.percentage}%
                                                    </ThemedText>
                                                </View>

                                                <View style={[
                                                    styles.levelBadge,
                                                    { backgroundColor: getGradeColor(subject.grade) }
                                                ]}>
                                                    <ThemedText style={styles.levelText}>Level {subject.grade}</ThemedText>
                                                    <ThemedText style={styles.levelDescription}>
                                                        {subject.grade === 1 ? 'Not achieved' :
                                                            subject.grade === 7 ? 'Outstanding achievement' :
                                                                subject.grade === 6 ? 'Meritorious achievement' :
                                                                    subject.grade === 5 ? 'Substantial achievement' :
                                                                        subject.grade === 4 ? 'Adequate achievement' :
                                                                            subject.grade === 3 ? 'Moderate achievement' :
                                                                                'Elementary achievement'}
                                                    </ThemedText>
                                                </View>
                                            </View>
                                        </ThemedView>
                                    </TouchableOpacity>
                                ))}
                        </View>
                    </>
                )}
            </ScrollView>

            {selectedSubject && (
                <SubjectReportModal
                    isVisible={isModalVisible}
                    onClose={closeModal}
                    subject={selectedSubject}
                    isDark={isDark}
                    dailyActivity={subjectDailyActivity}
                    weeklyProgress={subjectWeeklyProgress}
                    isLoading={isSubjectLoading}
                    uid={uid as string}
                    name={name as string}
                    user={user}
                />
            )}

            <Modal
                visible={isCareerAdviceRulesModalVisible}
                transparent={false}
                animationType="slide"
                onRequestClose={() => setIsCareerAdviceRulesModalVisible(false)}
                presentationStyle="fullScreen"
            >
                <View style={[styles.modalOverlay, {
                    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                    paddingTop: insets.top,
                    justifyContent: 'center',
                    alignItems: 'center',
                }]}>
                    <View style={[
                        styles.modalContent,
                        {
                            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                            flex: 0,
                            width: '90%',
                            maxWidth: 400,
                            alignSelf: 'center',
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingVertical: 32,
                        }
                    ]}>
                        <View style={[styles.modalHeader, { justifyContent: 'center', alignItems: 'center', width: '100%', position: 'relative', minHeight: 48 }]}>
                            <ThemedText style={[styles.modalTitle, { textAlign: 'center', flex: 1, fontSize: 22, paddingRight: 40 }]}>🔒 Unlock AI Career Advice</ThemedText>
                            <TouchableOpacity
                                onPress={() => setIsCareerAdviceRulesModalVisible(false)}
                                style={[styles.closeModalButton, { position: 'absolute', right: 0, top: 0, zIndex: 10 }]}
                            >
                                <Ionicons
                                    name="close"
                                    size={28}
                                    color={isDark ? '#FFFFFF' : '#000000'}
                                />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={[styles.modalScrollView, { width: '100%' }]} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
                            <ThemedText style={[styles.careerAdviceText, { textAlign: 'center', fontSize: 17, marginBottom: 18 }]}>✨ To unlock personalized career advice, complete these steps:</ThemedText>
                            <ThemedText style={[styles.careerAdviceText, { textAlign: 'center', fontSize: 16, marginBottom: 10 }]}>📚 Answer at least <ThemedText style={{ fontWeight: 'bold', fontSize: 16 }}>10 questions</ThemedText> in <ThemedText style={{ fontWeight: 'bold', fontSize: 16 }}>3 or more subjects</ThemedText>.</ThemedText>
                            <ThemedText style={[styles.careerAdviceText, { textAlign: 'center', fontSize: 16, marginBottom: 10 }]}>🤖 This helps our AI give you accurate and personalized guidance!</ThemedText>
                            <ThemedText style={[styles.careerAdviceText, { textAlign: 'center', fontSize: 15, marginTop: 18, opacity: 0.7 }]}>Keep learning and check back soon! 🚀</ThemedText>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Add Career Advice Modal */}
            <Modal
                visible={isCareerAdviceModalVisible}
                transparent={false}
                animationType="slide"
                onRequestClose={() => setIsCareerAdviceModalVisible(false)}
                presentationStyle="fullScreen"
            >
                <View style={[styles.modalOverlay, {
                    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                    paddingTop: insets.top,
                    justifyContent: 'center',
                    alignItems: 'center',
                }]}>
                    <View style={[
                        styles.modalContent,
                        {
                            backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                            flex: 0,
                            width: '90%',
                            maxWidth: 400,
                            alignSelf: 'center',
                            justifyContent: 'center',
                            alignItems: 'center',
                            paddingVertical: 32,
                        }
                    ]}>
                        <View style={[styles.modalHeader, { justifyContent: 'center', alignItems: 'center', width: '100%', position: 'relative', minHeight: 48 }]}>
                            <ThemedText style={[styles.modalTitle, { textAlign: 'center', flex: 1, fontSize: 22, paddingRight: 40 }]}>🎯 Career Advice</ThemedText>
                            <TouchableOpacity
                                onPress={() => setIsCareerAdviceModalVisible(false)}
                                style={[styles.closeModalButton, { position: 'absolute', right: 0, top: 0, zIndex: 10 }]}
                            >
                                <Ionicons
                                    name="close"
                                    size={28}
                                    color={isDark ? '#FFFFFF' : '#000000'}
                                />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={[styles.modalScrollView, { width: '100%' }]} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
                            {careerAdvice ? (
                                <>
                                    <ThemedText style={[styles.careerAdviceText, { textAlign: 'left', fontSize: 16, marginBottom: 16, lineHeight: 24 }]}>
                                        {careerAdvice.advice}
                                    </ThemedText>
                                    <ThemedText style={[styles.careerAdviceTimestamp, { textAlign: 'center', fontSize: 14, opacity: 0.7 }]}>
                                        Last updated: {new Date(careerAdvice.last_updated).toLocaleDateString()}
                                    </ThemedText>
                                </>
                            ) : (
                                <View style={styles.modalLoadingContainer}>
                                    <ActivityIndicator size="large" color={colors.primary} />
                                    <ThemedText style={styles.modalLoadingText}>Loading career advice...</ThemedText>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        opacity: 0.7,
        textAlign: 'center',
    },
    chartContainer: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
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
    chartTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    performanceContainer: {
        gap: 16,
    },
    subjectCard: {
        borderRadius: 16,
        padding: 16,
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
    subjectName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(128, 128, 128, 0.2)',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        fontSize: 13,
        opacity: 0.8,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '600',
    },
    performanceFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    percentageContainer: {
        flex: 1,
    },
    percentageLabel: {
        fontSize: 13,
        opacity: 0.8,
        marginBottom: 4,
    },
    percentageValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    levelBadge: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        minWidth: 160,
    },
    levelText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    levelDescription: {
        color: '#FFFFFF',
        fontSize: 14,
        opacity: 0.9,
    },
    headerContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    closeButton: {
        padding: 8,
        width: 40,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    shareButtonText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '600',
    },
    followButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        marginLeft: 8,
    },
    followButtonText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    topicItem: {
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        backgroundColor: '#FFFFFF',
    },
    topicHeader: {
        paddingVertical: 8,
    } as const,
    topicHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    } as const,
    mainTopicName: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    topicStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    statGroup: {
        alignItems: 'center',
        flex: 1,
    },
    topicStatLabel: {
        fontSize: 13,
        opacity: 0.7,
        marginBottom: 4,
    },
    topicStatValue: {
        fontSize: 20,
        fontWeight: '600',
    },
    gradeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    successRate: {
        flex: 1,
    },
    successRateLabel: {
        fontSize: 13,
        opacity: 0.7,
        marginBottom: 4,
    },
    successRateValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    subTopicsContainer: {
        marginTop: 16,
        gap: 12,
    },
    subTopicItem: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    subTopicName: {
        fontSize: 14,
        marginBottom: 12,
        opacity: 0.9,
    },
    subTopicStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    subTopicStat: {
        alignItems: 'center',
        flex: 1,
    },
    subTopicStatLabel: {
        fontSize: 12,
        opacity: 0.7,
        marginBottom: 4,
    },
    subTopicStatValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    subTopicGradeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    subTopicSuccessRate: {
        flex: 1,
    },
    subTopicGradeValue: {
        fontSize: 20,
        fontWeight: '600',
    },
    subTopicLevelBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 140,
    },
    subTopicLevelText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    subTopicLevelDescription: {
        color: '#FFFFFF',
        fontSize: 12,
        opacity: 0.9,
    },
    hintText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 16,
        opacity: 0.8,
        fontStyle: 'italic',
    },
    todayEventsContainer: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    todayEventsTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    todayEventsEmpty: {
        fontSize: 15,
        opacity: 0.7,
        fontStyle: 'italic',
    },
    todayEventCard: {
        marginTop: 8,
        marginBottom: 8,
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(99,102,241,0.08)',
    },
    todayEventTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    todayEventTime: {
        fontSize: 14,
        marginTop: 2,
        marginBottom: 2,
    },
    todayEventSubject: {
        fontSize: 14,
        marginBottom: 2,
    },
    todayEventReminder: {
        fontSize: 13,
        color: '#6366F1',
        fontWeight: '500',
    },
    careerAdviceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        gap: 8,
    },
    careerAdviceButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    careerAdviceText: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 16,
    },
    careerAdviceTimestamp: {
        fontSize: 14,
        opacity: 0.7,
        fontStyle: 'italic',
        marginBottom: 16,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: 'transparent',
        paddingTop: 24,
    },
    modalContent: {
        flex: 1,
        padding: 16,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '100%',
        height: '100%',
        borderWidth: 0,
        marginTop: 0,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    closeModalButton: {
        padding: 8,
    },
    modalScrollView: {
        flex: 1,
    },
    modalScrollViewContent: {
        paddingBottom: 0,
    },
    modalLoadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingImage: {
        width: 200,
        height: 200,
        marginBottom: 24,
    },
    modalLoadingText: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    modalLoadingSubtext: {
        fontSize: 16,
        opacity: 0.7,
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 24,
    },
    loadingIndicator: {
        marginTop: 16,
    },
    modalChartContainer: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
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
    modalChartTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    modalEmptyDataContainer: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalEmptyDataText: {
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.8,
    },
    modalStatsContainer: {
        marginBottom: 20,
    },
    modalStatItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    modalStatLabel: {
        fontSize: 13,
        opacity: 0.8,
    },
    modalStatValue: {
        fontSize: 20,
        fontWeight: '600',
    },
    modalGradeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalGradeInfo: {
        flex: 1,
    },
    modalGradeLabel: {
        fontSize: 13,
        opacity: 0.8,
        marginBottom: 4,
    },
    modalGradeValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    modalGradeBadge: {
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalGradeText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    modalGradeDescription: {
        color: '#FFFFFF',
        fontSize: 14,
        opacity: 0.9,
    },
    subjectHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    graphButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },
    modalLegendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
        gap: 24,
    },
    modalLegendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modalLegendColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    modalLegendText: {
        fontSize: 14,
        opacity: 0.9,
    },
    modalChart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    badgesContainer: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
    },
    badgesTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    badgesScrollContent: {
        paddingRight: 16,
    },
    badgeItem: {
        alignItems: 'center',
        marginRight: 16,
        width: 80,
    },
    badgeImage: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginBottom: 8,
    },
    badgeName: {
        fontSize: 14,
        textAlign: 'center'
    },
    topicActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quizButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 12,
        marginTop: 16,
        borderWidth: 1,
        gap: 8,
    },
    quizButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 16,
        gap: 24,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 14,
        opacity: 0.9,
    },
}); 