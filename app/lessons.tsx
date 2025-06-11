import React, { useEffect, useState, useRef, useCallback } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, ScrollView, View, Animated } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HOST_URL } from '@/config/api';
import { LessonHeader } from '@/components/LessonHeader';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import type { DownloadProgressData } from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Lesson {
    id: number;
    title: string;
    lessonOrder: number;
    unitId: number;
    unitName: string;
    hasLanguageWords: boolean;
    unitOrder: number;
    unitDescription?: string;
}

interface Unit {
    id: number;
    name: string;
    description?: string;
    lessons: Lesson[];
    unitOrder: number;
}

interface LessonProgress {
    id: number;
    lessonId: number;
    lessonTitle: string;
    unitId: number;
    status: 'started' | 'completed' | 'not_started';
    lastUpdate: string;
}

interface UnitResources {
    audio: string[];
    images: string[];
}

interface DownloadProgress {
    total: number;
    completed: number;
    currentFile?: {
        name: string;
        progress: number;
    };
}

const LESSON_STATUS = {
    completed: { icon: '⭐️', color: '#22c55e', label: 'Perfect!' },
    started: { icon: '✅', color: '#fbbf24', label: 'In Progress' },
    not_started: { icon: '🎯', color: '#38bdf8', label: 'Locked' },
};

export default function LessonsScreen() {
    const { languageCode, languageName } = useLocalSearchParams();
    const [units, setUnits] = useState<Unit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [learnerProgress, setLearnerProgress] = useState<LessonProgress[]>([]);
    const [downloadedResources, setDownloadedResources] = useState<Set<string>>(new Set());
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
    const router = useRouter();
    const [showScrollTop, setShowScrollTop] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Function to determine if a unit is locked
    const isUnitLocked = (unitId: number): boolean => {
        // If there's no progress, only unlock the unit with the lowest order
        if (learnerProgress.length === 0) {
            const lowestOrderUnit = units.reduce((lowest, current) =>
                (current.unitOrder < lowest.unitOrder) ? current : lowest
            );
            return unitId !== lowestOrderUnit.id;
        }

        // Check if any lesson in this unit has been started or completed
        return !learnerProgress.some(p =>
            p.unitId === unitId &&
            (p.status === 'started' || p.status === 'completed')
        );
    };

    // Function to determine if a lesson is locked
    const isLessonLocked = (unitId: number, lessonId: number): boolean => {
        // If the unit is locked, all its lessons are locked
        if (isUnitLocked(unitId)) {
            return true;
        }

        // If there's no progress, only unlock the first lesson of the lowest order unit
        if (learnerProgress.length === 0) {
            const lowestOrderUnit = units.reduce((lowest, current) =>
                (current.unitOrder < lowest.unitOrder) ? current : lowest
            );
            const unitLessons = lowestOrderUnit.lessons;
            const lowestOrderLesson = unitLessons.reduce((lowest, current) =>
                (current.lessonOrder < lowest.lessonOrder) ? current : lowest
            );
            return unitId !== lowestOrderUnit.id || lessonId !== lowestOrderLesson.id;
        }

        // Find the highest lesson order that has been started or completed in this unit
        const unitLessons = units.find(u => u.id === unitId)?.lessons || [];
        const highestLessonOrder = Math.max(
            ...learnerProgress
                .filter(p =>
                    p.unitId === unitId &&
                    (p.status === 'started' || p.status === 'completed')
                )
                .map(p => {
                    const lesson = unitLessons.find(l => l.id === p.lessonId);
                    return lesson?.lessonOrder || 0;
                })
        );

        // Find the current lesson's order
        const currentLesson = unitLessons.find(l => l.id === lessonId);
        const currentLessonOrder = currentLesson?.lessonOrder || 0;

        // If the previous lesson is completed, unlock this lesson
        const previousLesson = unitLessons.find(l => l.lessonOrder === currentLessonOrder - 1);
        if (previousLesson) {
            const previousLessonProgress = learnerProgress.find(p => p.lessonId === previousLesson.id);
            if (previousLessonProgress?.status === 'completed') {
                return false;
            }
        }

        // Lock if this lesson's order is higher than the highest started/completed lesson
        return currentLessonOrder > highestLessonOrder;
    };

    // Function to download a single resource
    const downloadResource = async (resourceName: string, type: 'audio' | 'image'): Promise<void> => {
        if (downloadedResources.has(resourceName)) {
            console.log(`[Resource] Skipping ${type} ${resourceName} - already downloaded`);
            return;
        }

        const endpoint = type === 'audio'
            ? `${HOST_URL}/api/word/audio/get/${resourceName}`
            : `${HOST_URL}/api/word/image/get/${resourceName}`;

        const fileUri = `${FileSystem.documentDirectory}${type}/${resourceName}`;

        // Check if file already exists
        try {
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (fileInfo.exists) {
                console.log(`[Resource] ${type} ${resourceName} already exists on disk`);
                setDownloadedResources(prev => new Set([...prev, resourceName]));
                setDownloadProgress(prev => prev ? {
                    ...prev,
                    completed: prev.completed + 1,
                    currentFile: undefined
                } : null);
                return;
            }
        } catch (error) {
            console.error(`[Resource] Error checking file existence for ${type} ${resourceName}:`, error);
        }

        console.log(`[Resource] Starting download of ${type} ${resourceName}`);
        console.log(`[Resource] From: ${endpoint}`);
        console.log(`[Resource] To: ${fileUri}`);

        try {
            const downloadResumable = FileSystem.createDownloadResumable(
                endpoint,
                fileUri,
                {},
                (progress) => {
                    setDownloadProgress(prev => prev ? {
                        ...prev,
                        currentFile: {
                            name: resourceName,
                            progress: progress.totalBytesWritten / progress.totalBytesExpectedToWrite
                        }
                    } : null);
                }
            );

            const downloadResult = await downloadResumable.downloadAsync();

            if (!downloadResult) {
                throw new Error('Download failed - no result returned');
            }

            if (downloadResult.status === 200) {
                console.log(`[Resource] Successfully downloaded ${type} ${resourceName}`);
                console.log(`[Resource] File size: ${downloadResult.headers['content-length'] || 'unknown'} bytes`);
                setDownloadedResources(prev => new Set([...prev, resourceName]));
                setDownloadProgress(prev => prev ? {
                    ...prev,
                    completed: prev.completed + 1,
                    currentFile: undefined
                } : null);
            } else {
                console.error(`[Resource] Failed to download ${type} ${resourceName} - Status: ${downloadResult.status}`);
            }
        } catch (error) {
            console.error(`[Resource] Error downloading ${type} ${resourceName}:`, error);
        }
    };

    // Function to download all resources for a unit
    const downloadUnitResources = async (unitId: number) => {
        try {
            console.log(`[Unit ${unitId}] Starting resource download process`);

            // Fetch resource list
            const response = await fetch(`${HOST_URL}/api/unit-resources/${unitId}/${languageCode}`);
            if (!response.ok) {
                console.error(`[Unit ${unitId}] Failed to fetch resource list - Status: ${response.status}`);
                throw new Error('Failed to fetch resource list');
            }

            const resources: UnitResources = await response.json();
            const totalResources = resources.audio.length + resources.images.length;

            console.log(`[Unit ${unitId}] Found resources:`, {
                audioCount: resources.audio.length,
                imageCount: resources.images.length
            });

            // Initialize download progress
            setDownloadProgress({
                total: totalResources,
                completed: 0
            });

            // Create directories if they don't exist
            console.log(`[Unit ${unitId}] Creating resource directories`);
            await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}audio`, { intermediates: true });
            await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}image`, { intermediates: true });

            // Download all resources
            console.log(`[Unit ${unitId}] Starting parallel download of all resources`);
            const downloadPromises = [
                ...resources.audio.map(audio => downloadResource(audio, 'audio')),
                ...resources.images.map(image => downloadResource(image, 'image'))
            ];

            await Promise.all(downloadPromises);
            setDownloadProgress(null);
            console.log(`[Unit ${unitId}] Successfully completed all resource downloads`);
        } catch (error) {
            console.error(`[Unit ${unitId}] Error in resource download process:`, error);
            setDownloadProgress(null);
        }
    };

    // Function to fetch learner progress
    const fetchProgress = useCallback(async () => {
        try {
            const authData = await SecureStore.getItemAsync('auth');
            if (!authData) {
                throw new Error('No auth data found');
            }
            const { user } = JSON.parse(authData);

            const progressResponse = await fetch(`${HOST_URL}/api/language-learners/${user.uid}/progress/${languageCode}`);
            if (progressResponse.ok) {
                const progress: LessonProgress[] = await progressResponse.json();
                console.log(`[App] Fetched progress for ${progress.length} lessons`);
                setLearnerProgress(progress);
                return progress;
            } else if (progressResponse.status !== 404) {
                throw new Error('Failed to fetch progress');
            } else {
                console.log('[App] No progress found for this language');
                setLearnerProgress([]);
                return [];
            }
        } catch (error) {
            console.error('[App] Error fetching progress:', error);
            return [];
        }
    }, [languageCode]);

    // Use focus effect to fetch progress when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            console.log('[App] Screen focused - fetching latest progress');
            fetchProgress();
        }, [fetchProgress])
    );

    useEffect(() => {
        async function fetchData() {
            try {
                // Get learner UID from secure storage
                const authData = await SecureStore.getItemAsync('auth');
                if (!authData) {
                    throw new Error('No auth data found');
                }
                const { user } = JSON.parse(authData);

                console.log('[App] Starting data fetch process');
                console.log(`[App] Language: ${languageCode}`);

                // Fetch lessons first
                const lessonsResponse = await fetch(`${HOST_URL}/api/lessons?language=${languageCode}`);
                if (!lessonsResponse.ok) {
                    throw new Error('Failed to fetch lessons');
                }
                const lessons: Lesson[] = await lessonsResponse.json();
                console.log(`[App] Fetched ${lessons.length} lessons`);

                // Fetch initial progress
                const progress: LessonProgress[] = await fetchProgress();

                // Group lessons by unit
                const unitMap = new Map<number, Unit>();
                lessons.forEach(lesson => {
                    if (!unitMap.has(lesson.unitId)) {
                        unitMap.set(lesson.unitId, {
                            id: lesson.unitId,
                            name: lesson.unitName,
                            description: lesson.unitDescription,
                            lessons: [],
                            unitOrder: lesson.unitOrder
                        });
                    }
                    unitMap.get(lesson.unitId)?.lessons.push(lesson);
                });

                // Sort units by unitOrder
                const sortedUnits = Array.from(unitMap.values()).sort((a, b) => a.unitOrder - b.unitOrder);
                console.log(`[App] Organized lessons into ${sortedUnits.length} units`);

                // Sort lessons within each unit
                sortedUnits.forEach(unit => {
                    unit.lessons.sort((a, b) => a.lessonOrder - b.lessonOrder);
                });

                setUnits(sortedUnits);

                // Download resources for started units or the lowest order unit if no progress
                if (progress.length > 0) {
                    const startedUnits = new Set(progress
                        .filter((p: LessonProgress) => p.status === 'started')
                        .map((p: LessonProgress) => p.unitId));

                    console.log(`[App] Found ${startedUnits.size} units with started lessons`);
                    for (const unitId of startedUnits) {
                        await downloadUnitResources(unitId);
                    }
                } else {
                    // If no progress, download resources for the lowest order unit
                    const lowestOrderUnit = sortedUnits[0];
                    if (lowestOrderUnit) {
                        console.log(`[App] No progress found - downloading resources for lowest order unit: ${lowestOrderUnit.id}`);
                        await downloadUnitResources(lowestOrderUnit.id);
                    }
                }
            } catch (err) {
                console.error('[App] Error in data fetch process:', err);
                setError('Error fetching lessons');
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();
    }, [languageCode]);

    const handleLessonPress = async (lesson: Lesson) => {
        // If this is the first lesson being started, download resources
        if (learnerProgress.length === 0) {
            console.log('[App] First lesson being started - downloading unit resources');
            try {
                await downloadUnitResources(lesson.unitId);
            } catch (error) {
                console.error('[App] Error downloading resources for first lesson:', error);
                // Continue with navigation even if download fails
            }
        }

        // Update learner progress
        try {
            const authData = await SecureStore.getItemAsync('auth');
            if (!authData) {
                throw new Error('No auth data found');
            }
            const { user } = JSON.parse(authData);

            const progressResponse = await fetch(`${HOST_URL}/api/language-learners/${user.uid}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    lessonId: lesson.id,
                    language: languageCode,
                    status: 'started'
                })
            });

            if (!progressResponse.ok) {
                throw new Error('Failed to update progress');
            }

            const updatedProgress = await progressResponse.json();
            console.log('[App] Updated learner progress:', updatedProgress);

            // Update local progress state
            setLearnerProgress(prev => {
                const existingProgress = prev.find(p => p.lessonId === lesson.id);
                if (existingProgress) {
                    // Do not downgrade from completed to started
                    if (existingProgress.status === 'completed') {
                        return prev;
                    }
                    return prev.map(p => p.lessonId === lesson.id ? updatedProgress : p);
                }
                return [...prev, updatedProgress];
            });
        } catch (error) {
            console.error('[App] Error updating learner progress:', error);
            // Continue with navigation even if progress update fails
        }

        console.log('[App] Navigating to lesson:', lesson.title);

        router.push({
            pathname: '/lesson',
            params: {
                lessonId: lesson.id,
                lessonTitle: lesson.title,
                languageCode: languageCode as string,
                unitName: lesson.unitName,
                lessonNumber: lesson.lessonOrder,
            }
        });
    };

    const getLessonProgress = (lessonId: number) => {
        return learnerProgress.find(p => p.lessonId === lessonId);
    };

    const handleScroll = (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const shouldShow = offsetY > 300;

        if (shouldShow !== showScrollTop) {
            setShowScrollTop(shouldShow);
            Animated.timing(fadeAnim, {
                toValue: shouldShow ? 1 : 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    };

    const scrollToTop = () => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    function LessonCard({
        lesson,
        progress,
        locked,
        onPress,
    }: {
        lesson: Lesson;
        progress?: LessonProgress;
        locked: boolean;
        onPress: () => void;
    }) {
        let status: keyof typeof LESSON_STATUS = 'not_started';
        if (progress?.status === 'completed') status = 'completed';
        else if (progress?.status === 'started') status = 'started';

        const { icon, color, label } = LESSON_STATUS[status];

        return (
            <Pressable
                onPress={onPress}
                disabled={locked}
                style={[
                    styles.lessonCard,
                    { backgroundColor: locked ? '#f1f5f9' : '#fff', borderColor: locked ? '#e5e7eb' : color },
                    locked && styles.lessonCardLocked,
                ]}
                accessibilityRole="button"
                accessibilityLabel={locked ? 'Locked lesson' : 'Lesson'}
            >
                <View style={styles.lessonIconContainer}>
                    <ThemedText style={[styles.lessonIcon, { color: locked ? '#a1a1aa' : color }]}>{icon}</ThemedText>
                </View>
                <ThemedText style={[styles.lessonLevel, locked && styles.lessonTitleLocked]}>
                    Level {lesson.lessonOrder}
                </ThemedText>
                <ThemedText style={[styles.lessonStatus, { color: locked ? '#a1a1aa' : color }]}>
                    {locked ? 'Locked' : (status === 'not_started' ? 'Continue' : label)}
                </ThemedText>
            </Pressable>
        );
    }

    function ProgressCard({
        completed,
        total,
        level,
    }: {
        completed: number;
        total: number;
        level: number;
    }) {
        const percent = total > 0 ? completed / total : 0;
        return (
            <View style={styles.progressCard}>
                <View style={styles.progressCardHeader}>
                    <ThemedText style={styles.progressCardTitle}>Your Progress</ThemedText>
                    <View style={styles.progressLevelBadge}>
                        <Ionicons name="trophy" size={16} color="#22c55e" />
                        <ThemedText style={styles.progressLevelText}>Level {level}</ThemedText>
                    </View>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${percent * 100}%` }]} />
                </View>
                <ThemedText style={styles.progressCardSubtext}>
                    {completed} of {total} levels completed
                </ThemedText>
            </View>
        );
    }

    function UnitCard({ unit }: { unit: Unit }) {
        return (
            <LinearGradient
                colors={['#2563EB', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.unitCard}
            >
                <View style={styles.unitCardIconContainer}>
                    <Ionicons name="cube-outline" size={32} color="#fff" style={{ opacity: 0.85 }} />
                </View>
                <View style={styles.unitCardTextContainer}>
                    <ThemedText style={styles.unitCardTitle}>{unit.name}</ThemedText>
                    {unit.description && (
                        <ThemedText style={styles.unitCardDescription}>{unit.description}</ThemedText>
                    )}
                    <ThemedText style={styles.unitCardLessonCount}>
                        {unit.lessons.length} lessons
                    </ThemedText>
                </View>
            </LinearGradient>
        );
    }

    // Calculate overall progress above the return statement
    const allLessons = units.flatMap(u => u.lessons);
    const completedLessons = allLessons.filter(l => {
        const progress = getLessonProgress(l.id);
        return progress?.status === 'completed';
    }).length;
    const currentLevel = completedLessons + 1;

    return (
        <ThemedView style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
            <LessonHeader title={languageName as string} languageName={languageName as string} />

            {isLoading ? (
                <ActivityIndicator size="large" />
            ) : error ? (
                <ThemedText>{error}</ThemedText>
            ) : (
                <>
                    {downloadProgress && (
                        <ThemedView style={styles.downloadProgressContainer}>
                            <ThemedText style={styles.downloadProgressText}>
                                Downloading resources: {downloadProgress.completed}/{downloadProgress.total}
                            </ThemedText>
                            {downloadProgress.currentFile && (
                                <ThemedView style={styles.currentFileProgress}>
                                    <ThemedText style={styles.currentFileName} numberOfLines={1}>
                                        {downloadProgress.currentFile.name}
                                    </ThemedText>
                                    <View style={styles.progressBarContainer}>
                                        <View
                                            style={[
                                                styles.progressBar,
                                                { width: `${downloadProgress.currentFile.progress * 100}%` }
                                            ]}
                                        />
                                    </View>
                                </ThemedView>
                            )}
                        </ThemedView>
                    )}
                    <ProgressCard completed={completedLessons} total={allLessons.length} level={currentLevel} />
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.scrollView}
                        contentContainerStyle={{ paddingBottom: 32 }}
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                    >

                        {units.map((unit) => {
                            const unitLocked = isUnitLocked(unit.id);
                            // Calculate progress for this unit
                            const totalLessons = unit.lessons.length;
                            const completedLessons = unit.lessons.filter(l => {
                                const progress = getLessonProgress(l.id);
                                return progress?.status === 'completed';
                            }).length;
                            const progressPercent = totalLessons > 0 ? completedLessons / totalLessons : 0;

                            return (
                                <ThemedView key={unit.id} style={styles.unitContainer}>
                                    <UnitCard unit={unit} />
                                    <ThemedView style={styles.lessonsGrid}>
                                        {unit.lessons.map((lesson) => {
                                            const progress = getLessonProgress(lesson.id);
                                            const lessonLocked = isLessonLocked(unit.id, lesson.id);
                                            return (
                                                <LessonCard
                                                    key={lesson.id}
                                                    lesson={lesson}
                                                    progress={progress}
                                                    locked={lessonLocked}
                                                    onPress={() => !lessonLocked && handleLessonPress(lesson)}
                                                />
                                            );
                                        })}
                                    </ThemedView>
                                </ThemedView>
                            );
                        })}
                    </ScrollView>
                    <Animated.View
                        style={[
                            styles.scrollTopButton,
                            { opacity: fadeAnim }
                        ]}
                    >
                        <Pressable
                            onPress={scrollToTop}
                            style={({ pressed }) => [
                                styles.scrollTopPressable,
                                pressed && styles.scrollTopPressed
                            ]}
                        >
                            <ThemedText style={styles.scrollTopText}>↑</ThemedText>
                        </Pressable>
                    </Animated.View>
                </>
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    unitContainer: {
        marginBottom: 32,
        marginHorizontal: 8,
    },
    unitHeader: {
        backgroundColor: '#2563EB',
        padding: 16,
        marginHorizontal: 8,
        marginTop: 16,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    unitHeaderLocked: {
        backgroundColor: '#94A3B8',
    },
    unitName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        flex: 1,
    },
    lessonsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        paddingHorizontal: 8,
        paddingBottom: 8,
    },
    lessonCard: {
        width: '31%',
        margin: '1%',
        borderRadius: 16,
        borderWidth: 2,
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
        backgroundColor: '#fff',
        minWidth: 100,
        maxWidth: 140,
    },
    lessonCardLocked: {
        opacity: 0.5,
    },
    lessonIconContainer: {
        marginBottom: 8,
    },
    lessonIcon: {
        fontSize: 36,
    },
    lessonLevel: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 2,
        color: '#0f172a',
    },
    lessonStatus: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
    },
    lessonTitleLocked: {
        color: '#A1A1AA',
    },
    lockedText: {
        fontSize: 16,
        marginLeft: 12,
        color: '#A1A1AA',
        fontWeight: '500',
    },
    downloadProgressContainer: {
        padding: 16,
        backgroundColor: '#EFF6FF',
        borderBottomWidth: 1,
        borderBottomColor: '#DBEAFE',
    },
    downloadProgressText: {
        fontSize: 14,
        color: '#1E40AF',
        marginBottom: 8,
    },
    currentFileProgress: {
        marginTop: 4,
    },
    currentFileName: {
        fontSize: 12,
        color: '#3B82F6',
        marginBottom: 4,
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: '#DBEAFE',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 2,
    },
    scrollTopButton: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        zIndex: 1000,
    },
    scrollTopPressable: {
        backgroundColor: '#2563EB',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    scrollTopPressed: {
        transform: [{ scale: 0.95 }],
        backgroundColor: '#1D4ED8',
    },
    scrollTopText: {
        fontSize: 24,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    unitProgressBarContainer: {
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 4,
        alignItems: 'flex-start',
    },
    unitProgressBarBg: {
        width: '100%',
        height: 8,
        backgroundColor: '#e5e7eb',
        borderRadius: 4,
        overflow: 'hidden',
    },
    unitProgressBarFill: {
        height: '100%',
        backgroundColor: '#2563EB',
        borderRadius: 4,
    },
    unitProgressText: {
        fontSize: 12,
        color: '#2563EB',
        marginTop: 4,
        fontWeight: '500',
    },
    progressCard: {
        backgroundColor: '#fff',
        borderRadius: 18,
        padding: 20,
        margin: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    progressCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressCardTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    progressLevelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0fbe3',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 3,
    },
    progressLevelText: {
        color: '#22c55e',
        fontWeight: 'bold',
        marginLeft: 4,
        fontSize: 14,
    },
    progressBarBg: {
        width: '100%',
        height: 10,
        backgroundColor: '#e5e7eb',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#22c55e',
        borderRadius: 5,
    },
    progressCardSubtext: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
        fontWeight: '500',
    },
    unitCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        padding: 24,
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
        justifyContent: 'space-between',
    },
    unitCardIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    unitCardTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    unitCardTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    unitCardDescription: {
        color: '#e0e7ef',
        fontSize: 14,
        marginBottom: 0,
    },
    unitCardLessonCount: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
        marginTop: 8,
        textAlign: 'right',
        alignSelf: 'flex-end',
    },
}); 