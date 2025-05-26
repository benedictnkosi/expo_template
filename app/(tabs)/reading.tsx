import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { BlurView } from 'expo-blur';
import { ChapterContent } from '@/components/reading/chapter-content';
import { Header } from '@/components/Header';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BookQuiz } from '@/components/reading/book-quiz';
import { getNextChapter, ChapterResponse, getPastChapters, PastChapter, getChapterById, getLearnerStats, getLearner } from '@/services/api';
import { ReadingSpeedGraph } from '@/components/reading/reading-speed-graph';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { analytics } from '@/services/analytics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const QUOTES = [
    { text: "📚 Read a little. Grow a lot.", emoji: "📚" },
    { text: "🌱 One word today. A thousand tomorrow.", emoji: "🌱" },
    { text: "💪 Don't worry. Just try.", emoji: "💪" },
    { text: "📖 Reading makes you strong.", emoji: "📖" },
    { text: "🌍 Your future speaks English — so will you.", emoji: "🌍" },
    { text: "✨ Small steps become big change.", emoji: "✨" },
    { text: "🌱 You're not slow — you're growing.", emoji: "🌱" },
];

const FONT_SIZE_KEY = 'readingFontSize';

export default function ReadingScreen() {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [chapterData, setChapterData] = useState<ChapterResponse | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [contentFontSize, setContentFontSize] = useState(18);
    const [progress, setProgress] = useState(0);
    const [showQuiz, setShowQuiz] = useState(false);
    const [readingStartTime, setReadingStartTime] = useState<number>(0);
    const [wordCount, setWordCount] = useState<number>(0);
    const [noMoreChapters, setNoMoreChapters] = useState(false);
    const [showPastChapters, setShowPastChapters] = useState(false);
    const [pastChapters, setPastChapters] = useState<PastChapter[]>([]);
    const [isLoadingPastChapters, setIsLoadingPastChapters] = useState(false);
    const [selectedPastChapter, setSelectedPastChapter] = useState<PastChapter | null>(null);
    const [timeUntilPublish, setTimeUntilPublish] = useState<number>(0);
    const [pastChaptersError, setPastChaptersError] = useState<string | null>(null);
    const [learnerInfo, setLearnerInfo] = useState<{
        name: string;
        grade: string;
        school?: string;
        avatar?: string;
        follow_me_code?: string;
    } | null>(null);
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef<ScrollView>(null);

    // Fetch learner info
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
            console.log('Failed to fetch learner info:', error);
        }
    }, [user?.uid]);

    // Load learner info when component mounts
    useEffect(() => {
        fetchLearnerInfo();
    }, [fetchLearnerInfo]);

    const randomQuote = useMemo(() => {
        const randomIndex = Math.floor(Math.random() * QUOTES.length);
        return QUOTES[randomIndex];
    }, []);

    // Load font size from AsyncStorage on mount
    useEffect(() => {
        AsyncStorage.getItem(FONT_SIZE_KEY)
            .then(value => {
                if (value) setContentFontSize(Number(value));
            })
            .catch(() => { });
    }, []);

    // Save font size to AsyncStorage when changed
    function handleSetFontSize(newSize: number) {
        setContentFontSize(newSize);
        AsyncStorage.setItem(FONT_SIZE_KEY, String(newSize)).catch(() => { });
    }

    // Helper to format time until publish for next chapter
    function getTimeUntil(dateString: string) {
        const publishDate = new Date(dateString);
        const now = new Date();
        const diffMs = publishDate.getTime() - now.getTime();
        if (diffMs <= 0) return null;
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.ceil((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }

    // Extract loadChapter function to be reusable
    const loadChapter = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const [data, stats] = await Promise.all([
                getNextChapter(user.uid),
                getLearnerStats(user.uid)
            ]);

            const mergedChapterData = {
                ...data,
                streak: stats.streak,
                readingPoints: stats.readingPoints,
                stats: stats.stats,
                nextLevelWPM: stats.nextLevelWPM,
                nextLevelNumber: stats.nextLevelNumber,
                promotionProgress: stats.promotionProgress,
                nextChapter: data.nextChapter
            };

            if (data.status === 'OK' && data.chapter === null) {
                setNoMoreChapters(true);
                setChapterData(mergedChapterData);
            } else {
                setChapterData(mergedChapterData);
            }
        } catch (error) {
            console.log('Error loading chapter:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.uid]);

    // Initial load
    useEffect(() => {
        loadChapter();
    }, [loadChapter]);

    // Reload on tab focus
    useFocusEffect(
        useCallback(() => {
            if (!hasStarted) {
                loadChapter();
            }
        }, [loadChapter, hasStarted])
    );

    useEffect(() => {
        if (chapterData?.chapter?.publishDate) {
            const publishDate = new Date(chapterData.chapter.publishDate);
            const now = new Date();
            const timeUntilPublish = publishDate.getTime() - now.getTime();
            setTimeUntilPublish(timeUntilPublish);
        }
    }, [chapterData?.chapter?.publishDate]);

    const loadPastChapters = async () => {
        if (!user?.uid) return;
        setIsLoadingPastChapters(true);
        setPastChaptersError(null);
        try {
            const response = await getPastChapters(user.uid);
            setPastChapters(response.chapters);
        } catch (error) {
            console.log('Error loading past chapters:', error);
            setPastChaptersError('Unable to load past chapters. Please try again.');
        } finally {
            setIsLoadingPastChapters(false);
        }
    };

    useEffect(() => {
        if (showPastChapters) {
            loadPastChapters();
        }
    }, [showPastChapters]);

    // Calculate currentWPM for conditional rendering
    const currentWPM = chapterData?.stats?.speeds?.length
        ? chapterData.stats.speeds[chapterData.stats.speeds.length - 1].speed
        : 0;

    const formatTimeUntilPublish = (timeUntilPublish: number) => {
        const hoursUntilPublish = Math.floor(timeUntilPublish / (1000 * 60 * 60));
        const minutesUntilPublish = Math.ceil((timeUntilPublish % (1000 * 60 * 60)) / (1000 * 60));

        return hoursUntilPublish > 0
            ? `${hoursUntilPublish} hour${hoursUntilPublish > 1 ? 's' : ''}`
            : `${minutesUntilPublish} minute${minutesUntilPublish > 1 ? 's' : ''}`;
    };

    const handleReadPastChapter = async (chapter: PastChapter) => {
        if (!user?.uid) return;

        try {
            const [chapterData, learnerStats] = await Promise.all([
                getChapterById(user.uid, chapter.id),
                getLearnerStats(user.uid)
            ]);

            // Merge the chapter data with learner stats
            const mergedData = {
                ...chapterData,
                streak: learnerStats.streak,
                readingPoints: learnerStats.readingPoints,
                stats: learnerStats.stats
            };

            setChapterData(mergedData);
            setSelectedPastChapter(chapter);
            setShowPastChapters(false);
            setHasStarted(true);
            setReadingStartTime(Date.now());
        } catch (error) {
            console.log('Error loading past chapter:', error);
        }
    };

    // Add effect to reset scroll position when starting to read
    useEffect(() => {
        if (hasStarted) {
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        }
    }, [hasStarted]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {!hasStarted && <Header learnerInfo={learnerInfo} />}
            {hasStarted && !showQuiz && (
                <View style={[
                    styles.stickyProgressContainer,
                    {
                        backgroundColor: isDark ? 'rgba(24,26,42,0.98)' : 'rgba(255,255,255,0.98)',
                        borderBottomColor: isDark ? 'rgba(120,120,140,0.24)' : 'rgba(120,120,140,0.12)',
                        top: 0,
                        paddingTop: insets.top,
                    },
                ]}>
                    <View style={styles.stickyBarRow}>
                        <Pressable
                            style={styles.stickyIconButton}
                            onPress={() => handleSetFontSize(Math.max(14, contentFontSize - 2))}
                            accessibilityRole="button"
                            accessibilityLabel="Decrease font size"
                        >
                            <Ionicons name="remove" size={22} color={colors.text} />
                        </Pressable>
                        <Text
                            style={styles.stickyChapterTitle}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                        >
                            {selectedPastChapter?.chapterName || chapterData?.chapter?.chapterName || ''}
                        </Text>
                        <Pressable
                            style={styles.stickyIconButton}
                            onPress={() => handleSetFontSize(Math.min(32, contentFontSize + 2))}
                            accessibilityRole="button"
                            accessibilityLabel="Increase font size"
                        >
                            <Ionicons name="add" size={22} color={colors.text} />
                        </Pressable>
                        <Pressable
                            style={styles.stickyIconButton}
                            onPress={() => {
                                setHasStarted(false);
                                setSelectedPastChapter(null);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Close chapter content"
                        >
                            <Ionicons name="close" size={24} color="#7C3AED" />
                        </Pressable>
                    </View>
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBar, { width: `${Math.round(progress * 100)}%` }]} />
                    </View>
                </View>
            )}
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Spacer to prevent overlap with sticky bar */}
                {hasStarted && !showQuiz && <View style={styles.stickySpacer} />}
                {isLoading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                ) : noMoreChapters ? (
                    <View style={styles.completionContainer}>
                        <Text style={styles.completionEmoji}>🎓</Text>
                        <Text style={[styles.completionTitle, { color: colors.primary }]}>
                            Congratulations!
                        </Text>
                        <Text style={[styles.completionMessage, { color: colors.textSecondary }]}>
                            You've completed all available chapters at your current level.
                        </Text>
                        <View style={[styles.statsContainer, { backgroundColor: isDark ? '#23263A' : '#fff', borderColor: isDark ? '#23263A' : '#E5E7EB' }]}>
                            <View style={styles.statItem}>
                                <Text style={styles.statEmoji}>🔥</Text>
                                <Text style={[styles.statValue, { color: '#7C3AED' }]}>{chapterData?.streak}</Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
                            </View>
                            <View style={styles.verticalDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statEmoji}>⭐</Text>
                                <Text style={[styles.statValue, { color: '#FBBF24' }]}>{chapterData?.readingPoints ?? 0}</Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Reading Points</Text>
                            </View>
                            <View style={styles.verticalDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statEmoji}>📖</Text>
                                <Text style={[styles.statValue, { color: '#4F46E5' }]}>{chapterData?.stats?.completedChapters}</Text>
                                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Chapters</Text>
                            </View>
                        </View>
                        <Pressable
                            style={({ pressed }) => [
                                styles.buttonContainer,
                                pressed && styles.buttonPressed
                            ]}
                            onPress={() => router.push('/(tabs)')}
                        >
                            <LinearGradient
                                colors={['#4F46E5', '#7C3AED']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.gradient}
                            >
                                <Text style={styles.buttonText}>
                                    Return to Home
                                </Text>
                            </LinearGradient>
                        </Pressable>
                    </View>
                ) : chapterData ? (
                    hasStarted ? (
                        showQuiz ? (
                            <BookQuiz
                                chapterId={selectedPastChapter?.id || chapterData.chapter.id}
                                startTime={readingStartTime}
                                wordCount={wordCount}
                                onClose={(shouldRetry) => {
                                    setShowQuiz(false);
                                    // Only reset everything if we're not retrying
                                    if (!shouldRetry) {
                                        setHasStarted(false);
                                        setSelectedPastChapter(null);
                                    }
                                }}
                            />
                        ) : (
                            <>
                                <ChapterContent
                                    chapterName={selectedPastChapter?.chapterName || chapterData.chapter.chapterName}
                                    chapterNumber={selectedPastChapter?.chapterNumber || chapterData.chapter.chapterNumber}
                                    content={selectedPastChapter?.content || chapterData.chapter.content}
                                    fontSize={contentFontSize}
                                    onProgress={setProgress}
                                    onStartQuiz={(count) => {
                                        setWordCount(count);
                                        setShowQuiz(true);
                                    }}
                                />
                            </>
                        )
                    ) : (
                        <>
                            <View style={styles.bookTitleContainer}>
                                <Text style={[styles.bookTitle, { color: colors.primary }]}>
                                    The Dimpo Chronicles
                                </Text>
                                <View style={styles.bookTitleUnderlineContainer}>
                                    <View style={[styles.bookTitleUnderline, { backgroundColor: colors.primary }]} />
                                </View>
                            </View>
                            <Text style={[styles.quote, { color: colors.textSecondary }]}>
                                {randomQuote.text}
                            </Text>
                            <View style={[styles.statsContainer, { backgroundColor: isDark ? '#23263A' : '#fff', borderColor: isDark ? '#23263A' : '#E5E7EB' }]}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statEmoji}>🔥</Text>
                                    <Text style={[styles.statValue, { color: '#7C3AED' }]}>{chapterData?.streak}</Text>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Day Streak</Text>
                                </View>
                                <View style={styles.verticalDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statEmoji}>⭐</Text>
                                    <Text style={[styles.statValue, { color: '#FBBF24' }]}>{chapterData?.readingPoints ?? 0}</Text>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Reading Points</Text>
                                </View>
                                <View style={styles.verticalDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statEmoji}>📖</Text>
                                    <Text style={[styles.statValue, { color: '#4F46E5' }]}>{chapterData?.stats?.completedChapters}</Text>
                                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Chapters</Text>
                                </View>
                            </View>

                            <View style={styles.levelContainer}>

                                <Text style={[styles.levelText, { color: colors.textSecondary }]}>
                                    Reading Level {chapterData?.chapter?.level || 1} of 4
                                </Text>
                                <View style={styles.levelProgress}>
                                    {[1, 2, 3, 4].map((level) => (
                                        <View
                                            key={level}
                                            style={[
                                                styles.levelDot,
                                                level <= (chapterData?.chapter?.level || 1) && styles.levelDotActive,
                                                { backgroundColor: level <= (chapterData?.chapter?.level || 1) ? '#7C3AED' : 'rgba(120,120,140,0.18)' }
                                            ]}
                                        />
                                    ))}
                                </View>
                                {chapterData?.promotionProgress && chapterData.promotionProgress.chaptersCompleted > 0 && (
                                    <View style={styles.promotionProgressContainer}>
                                        <Text style={[styles.promotionProgressText, { color: colors.textSecondary }]}>
                                            {chapterData.promotionProgress.chaptersRemaining} chapter{chapterData.promotionProgress.chaptersRemaining !== 1 ? 's' : ''} until Level {chapterData.nextLevelNumber}
                                        </Text>
                                        <View style={styles.promotionProgressBar}>
                                            <View
                                                style={[
                                                    styles.promotionProgressFill,
                                                    {
                                                        width: `${(chapterData.promotionProgress.chaptersCompleted / chapterData.promotionProgress.chaptersRequired) * 100}%`,
                                                        backgroundColor: '#7C3AED'
                                                    }
                                                ]}
                                            />
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Only show the level up card if currentWPM is a positive number */}
                            {currentWPM > 0 && (
                                <>
                                    <View style={[styles.wpmProgressContainer, { backgroundColor: isDark ? '#23263A' : '#fff', borderColor: isDark ? '#23263A' : '#E5E7EB' }]}>
                                        <View style={styles.wpmProgressHeader}>
                                            <Text style={[styles.wpmProgressTitle, { color: colors.text }]}>Next Level</Text>
                                            <Text style={[styles.wpmProgressTarget, { color: colors.textSecondary }]}>
                                                Level {chapterData?.nextLevelNumber}: {chapterData?.nextLevelWPM} WPM
                                            </Text>
                                        </View>

                                        <View style={styles.wpmProgressFooter}>
                                            <View style={styles.wpmProgressInfo}>
                                                <Text style={[styles.wpmProgressCurrent, { color: colors.textSecondary }]}>
                                                    Current Speed: {currentWPM} WPM
                                                </Text>
                                            </View>
                                        </View>
                                        {chapterData?.promotionProgress && (
                                            <Text style={[styles.chapterProgressRemaining, { color: colors.textSecondary, marginTop: 12 }]}>
                                                {chapterData.promotionProgress.chaptersRemaining} chapter{chapterData.promotionProgress.chaptersRemaining !== 1 ? 's' : ''} until Level {chapterData.nextLevelNumber}
                                            </Text>
                                        )}
                                    </View>
                                </>
                            )}
                            {chapterData?.stats?.speeds && chapterData.stats.speeds.length >= 3 && (
                                <View style={styles.graphContainer}>
                                    <ReadingSpeedGraph speeds={chapterData.stats.speeds.map(speed => ({
                                        ...speed,
                                        score: speed.speed
                                    }))} />
                                </View>
                            )}

                            <Text style={[styles.unlockNote, { color: colors.textSecondary }]}>🔓 Next chapter unlocks after you score 100% on the chapter quiz!</Text>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.buttonContainer,
                                    pressed && styles.buttonPressed,
                                    timeUntilPublish > 0 && styles.buttonDisabled
                                ]}
                                onPress={() => {
                                    if (timeUntilPublish <= 0) {
                                        analytics.track('reading_started', {
                                            userId: user?.uid,
                                            chapterId: chapterData.chapter.id,
                                            chapterName: chapterData.chapter.chapterName
                                        });
                                        setHasStarted(true);
                                        setReadingStartTime(Date.now());
                                    }
                                }}
                                disabled={timeUntilPublish > 0 || !chapterData?.chapter}
                            >
                                <LinearGradient
                                    colors={['#4F46E5', '#7C3AED']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.gradient}
                                >
                                    <Text style={styles.buttonText}>
                                        {!chapterData?.chapter
                                            ? 'No More Chapters'
                                            : timeUntilPublish > 0
                                                ? `Dropping in ${formatTimeUntilPublish(timeUntilPublish)} ⏰`
                                                : 'Start Reading 📖'}
                                    </Text>
                                    <Text style={styles.chapterName}>
                                        {chapterData?.chapter?.chapterName || 'No Chapter Available'}
                                    </Text>
                                </LinearGradient>
                            </Pressable>

                            {/* After the unlock note, show the next chapter card if available */}
                            {chapterData?.nextChapter && !(timeUntilPublish > 0) && (
                                <View style={[styles.nextChapterCard, { backgroundColor: isDark ? '#23263A' : '#fff' }]}>
                                    <Text style={[styles.nextChapterLabel, { color: colors.textSecondary }]}>
                                        Next Chapter
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        {chapterData.nextChapter.publishDate && !getTimeUntil(chapterData.nextChapter.publishDate) && (
                                            <Ionicons name="lock-closed" size={18} color={colors.primary} />
                                        )}
                                        <Text style={[styles.nextChapterTitle, { color: colors.text }]}>
                                            {chapterData.nextChapter.chapterName}
                                        </Text>
                                    </View>
                                    {chapterData.nextChapter.publishDate && getTimeUntil(chapterData.nextChapter.publishDate) && (
                                        <Text style={[styles.nextChapterDrop, { color: colors.textSecondary }]}>
                                            Dropping in {getTimeUntil(chapterData.nextChapter.publishDate)} ⏰
                                        </Text>
                                    )}
                                </View>
                            )}
                            <Pressable
                                style={({ pressed }) => [
                                    styles.pastChaptersButton,
                                    pressed && styles.buttonPressed
                                ]}
                                onPress={() => setShowPastChapters(true)}
                            >
                                <Text style={[styles.pastChaptersButtonText, { color: colors.primary }]}>
                                    View Past Chapters
                                </Text>
                            </Pressable>
                        </>
                    )
                ) : null}
            </ScrollView>

            <Modal
                visible={showPastChapters}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPastChapters(false)}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Past Chapters</Text>
                        <Pressable
                            style={styles.closeModalButton}
                            onPress={() => setShowPastChapters(false)}
                        >
                            <Ionicons name="close" size={24} color={colors.text} />
                        </Pressable>
                    </View>
                    {isLoadingPastChapters ? (
                        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                    ) : pastChaptersError ? (
                        <View style={styles.emptyStateContainer}>
                            <Text style={styles.emptyStateEmoji}>⚠️</Text>
                            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                                {pastChaptersError}
                            </Text>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.retryButton,
                                    pressed && styles.buttonPressed
                                ]}
                                onPress={loadPastChapters}
                            >
                                <Text style={[styles.retryButtonText, { color: colors.primary }]}>
                                    Try Again
                                </Text>
                            </Pressable>
                        </View>
                    ) : pastChapters.length === 0 ? (
                        <View style={styles.emptyStateContainer}>
                            <Text style={styles.emptyStateEmoji}>📚</Text>
                            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                                No past chapters yet. Keep reading to build your history!
                            </Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.pastChaptersList}>
                            {pastChapters.map((chapter, index) => (
                                <Pressable
                                    key={`${chapter.id}-${index}`}
                                    style={({ pressed }) => [
                                        styles.pastChapterItem,
                                        { backgroundColor: isDark ? '#23263A' : '#fff' },
                                        pressed && styles.buttonPressed
                                    ]}
                                    onPress={() => handleReadPastChapter(chapter)}
                                >
                                    <View style={styles.pastChapterHeader}>
                                        <Text style={[styles.pastChapterTitle, { color: colors.text }]}>
                                            {chapter.chapterName}
                                        </Text>
                                        <Text style={[styles.pastChapterLevel, { color: colors.textSecondary }]}>
                                            Level {chapter.level}
                                        </Text>
                                    </View>
                                    <Text style={[styles.pastChapterSummary, { color: colors.textSecondary }]}>
                                        {chapter.summary}
                                    </Text>
                                    <View style={styles.pastChapterFooter}>
                                        <Text style={[styles.pastChapterMeta, { color: colors.textSecondary }]}>
                                            {chapter.wordCount} words
                                        </Text>
                                    </View>
                                </Pressable>
                            ))}
                        </ScrollView>
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: 16,
        gap: 16,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        gap: 16,
    },
    quote: {
        fontSize: 20,
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 26,
        marginBottom: 8,
    },
    buttonContainer: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    buttonPressed: {
        transform: [{ scale: 0.98 }],
    },
    gradient: {
        padding: 24,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    chapterName: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 16,
        textAlign: 'center',
    },
    loader: {
        marginTop: 32,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        maxWidth: 320,
        padding: 10,
        borderRadius: 12,
        marginBottom: 16,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 1,
        overflow: 'visible',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    statEmoji: {
        fontSize: 22,
        marginBottom: 2,
        textShadowColor: 'rgba(124,58,237,0.12)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 1,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '600',
        opacity: 0.85,
        letterSpacing: 0.2,
    },
    verticalDivider: {
        width: 1,
        height: 28,
        backgroundColor: 'rgba(120,120,140,0.10)',
        marginHorizontal: 4,
        borderRadius: 1,
    },
    closeButton: {
        alignSelf: 'flex-end',
        margin: 4,
        padding: 4,
        borderRadius: 16,
        backgroundColor: 'rgba(120,120,140,0.12)',
    },
    contentControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        alignSelf: 'flex-end',
        margin: 12,
    },
    fontButton: {
        padding: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(120,120,140,0.10)',
        marginHorizontal: 1,
    },
    contentTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 0,
        marginBottom: 0,
        paddingHorizontal: 0,
    },
    stickyProgressContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 1000,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(120,120,140,0.12)',
        paddingTop: 0,
        paddingBottom: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    stickyBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 44,
        paddingHorizontal: 8,
        gap: 4,
    },
    stickyIconButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        marginHorizontal: 2,
    },
    stickyChapterTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: '600',
        color: '#7C3AED',
        textAlign: 'center',
        marginHorizontal: 6,
    },
    stickySpacer: {
        height: 52, // 44 for bar + 8 for progress bar
        width: '100%',
    },
    completionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    completionEmoji: {
        fontSize: 64,
        marginBottom: 8,
    },
    completionTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4,
    },
    completionMessage: {
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 8,
    },
    pastChaptersButton: {
        marginTop: 24,
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(120,120,140,0.10)',
    },
    pastChaptersButtonText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    modalContainer: {
        flex: 1,
        marginTop: 60,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(120,120,140,0.18)',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeModalButton: {
        padding: 8,
    },
    pastChaptersList: {
        flex: 1,
        padding: 8,
    },
    pastChapterItem: {
        marginBottom: 8,
        padding: 10,
        borderRadius: 16,
        backgroundColor: 'rgba(30, 41, 59, 0.35)',
    },
    pastChapterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    pastChapterTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
    },
    pastChapterLevel: {
        fontSize: 14,
        fontWeight: '500',
    },
    pastChapterSummary: {
        fontSize: 14,
        lineHeight: 18,
        marginBottom: 6,
    },
    pastChapterFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    pastChapterMeta: {
        fontSize: 12,
        fontWeight: '500',
    },
    readAgainButton: {
        marginTop: 6,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    readAgainGradient: {
        padding: 8,
        alignItems: 'center',
    },
    readAgainButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        gap: 12,
    },
    emptyStateEmoji: {
        fontSize: 48,
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        opacity: 0.8,
    },
    retryButton: {
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: 'rgba(120,120,140,0.10)',
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    levelContainer: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        gap: 8,
    },
    levelHint: {
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.8,
        marginBottom: 4,
    },
    levelText: {
        fontSize: 16,
        fontWeight: '600',
    },
    levelProgress: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    levelDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    levelDotActive: {
        transform: [{ scale: 1.2 }],
    },
    graphContainer: {
        width: '100%',
        alignSelf: 'center',
        height: 280,
        marginBottom: 24,
        borderRadius: 20,
        paddingBottom: 16,
        backgroundColor: 'rgba(30, 41, 59, 0.35)',
    },
    wpmProgressContainer: {
        width: '100%',
        maxWidth: 320,
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 1,
    },
    wpmProgressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    wpmProgressTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    wpmProgressTarget: {
        fontSize: 14,
        fontWeight: '500',
    },
    wpmProgressBarContainer: {
        height: 8,
        backgroundColor: 'rgba(120,120,140,0.10)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    wpmProgressBar: {
        height: '100%',
        borderRadius: 4,
        transitionProperty: 'width',
        transitionDuration: '200ms',
    },
    wpmProgressFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    wpmProgressInfo: {
        flex: 1,
        gap: 4,
    },
    wpmProgressCurrent: {
        fontSize: 14,
        fontWeight: '500',
    },
    wpmProgressRemaining: {
        fontSize: 13,
        fontWeight: '500',
        opacity: 0.8,
    },
    promotionProgressContainer: {
        width: '100%',
        marginTop: 12,
        alignItems: 'center',
        gap: 8,
    },
    promotionProgressText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    promotionProgressBar: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(120,120,140,0.10)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    promotionProgressFill: {
        height: '100%',
        borderRadius: 3,
        transitionProperty: 'width',
        transitionDuration: '200ms',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(120,120,140,0.18)',
        marginVertical: 16,
    },
    chapterProgressSection: {
        gap: 8,
    },
    chapterProgressTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    chapterProgressBarContainer: {
        height: 8,
        backgroundColor: 'rgba(120,120,140,0.10)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    chapterProgressBar: {
        height: '100%',
        borderRadius: 4,
        transitionProperty: 'width',
        transitionDuration: '200ms',
    },
    chapterProgressText: {
        fontSize: 14,
        fontWeight: '500',
    },
    chapterProgressRemaining: {
        fontSize: 13,
        fontWeight: '500',
        opacity: 0.8,
    },
    unlockNote: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 10,
        opacity: 0.85,
    },
    nextChapterCard: {
        marginTop: 18,
        borderRadius: 14,
        padding: 14,
        alignItems: 'flex-start',
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(120,120,140,0.10)',
        width: '100%',
        maxWidth: '100%',
    },
    nextChapterTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    nextChapterDrop: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 2,
    },
    nextChapterLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    bookTitleContainer: {
        alignItems: 'center',
        marginBottom: 28,
        marginTop: 12,
    },
    bookTitle: {
        fontSize: 36,
        fontWeight: '800',
        letterSpacing: 0.5,
        textAlign: 'center',
        marginBottom: 8,
    },
    bookTitleUnderlineContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
    },
    bookTitleUnderline: {
        width: 80,
        height: 3,
        borderRadius: 2,
        opacity: 0.8,
    },
    progressBarContainer: {
        height: 8,
        width: '100%',
        backgroundColor: 'rgba(120,120,140,0.10)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 0,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#7C3AED',
        borderRadius: 4,
        transitionProperty: 'width',
        transitionDuration: '200ms',
    },
}); 