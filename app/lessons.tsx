import { useEffect, useState } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HOST_URL } from '@/config/api';
import { ProfileHeader } from '@/components/ProfileHeader';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

interface Lesson {
    id: number;
    title: string;
    lessonOrder: number;
    unitId: number;
    unitName: string;
    hasLanguageWords: boolean;
    unitOrder: number;
}

interface Unit {
    id: number;
    name: string;
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

export default function LessonsScreen() {
    const { languageCode, languageName } = useLocalSearchParams();
    const [units, setUnits] = useState<Unit[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [learnerProgress, setLearnerProgress] = useState<LessonProgress[]>([]);
    const [downloadedResources, setDownloadedResources] = useState<Set<string>>(new Set());
    const router = useRouter();

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

        // Lock if this lesson's order is higher than the highest started/completed lesson
        return currentLessonOrder > highestLessonOrder;
    };

    // Function to check if resources are already downloaded
    const areResourcesDownloaded = async (unitId: number): Promise<boolean> => {
        const key = `unit_${unitId}_${languageCode}_resources`;
        const downloaded = await SecureStore.getItemAsync(key);

        if (downloaded === 'true') {
            // Log the paths of downloaded resources
            const audioDir = `${FileSystem.documentDirectory}audio`;
            const imageDir = `${FileSystem.documentDirectory}image`;

            try {
                const audioFiles = await FileSystem.readDirectoryAsync(audioDir);
                const imageFiles = await FileSystem.readDirectoryAsync(imageDir);

                console.log(`[Unit ${unitId}] Resources already downloaded at:`);
                console.log(`[Unit ${unitId}] Audio directory: ${audioDir}`);
                console.log(`[Unit ${unitId}] Audio files:`, audioFiles);
                console.log(`[Unit ${unitId}] Image directory: ${imageDir}`);
                console.log(`[Unit ${unitId}] Image files:`, imageFiles);
            } catch (error) {
                console.error(`[Unit ${unitId}] Error reading resource directories:`, error);
            }

            return true;
        }
        return false;
    };

    // Function to mark resources as downloaded
    const markResourcesAsDownloaded = async (unitId: number) => {
        const key = `unit_${unitId}_${languageCode}_resources`;
        await SecureStore.setItemAsync(key, 'true');
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

        console.log(`[Resource] Starting download of ${type} ${resourceName}`);
        console.log(`[Resource] From: ${endpoint}`);
        console.log(`[Resource] To: ${fileUri}`);

        try {
            const downloadResult = await FileSystem.downloadAsync(endpoint, fileUri);
            if (downloadResult.status === 200) {
                console.log(`[Resource] Successfully downloaded ${type} ${resourceName}`);
                console.log(`[Resource] File size: ${downloadResult.headers['content-length'] || 'unknown'} bytes`);
                setDownloadedResources(prev => new Set([...prev, resourceName]));
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
            // Check if already downloaded
            if (await areResourcesDownloaded(unitId)) {
                console.log(`[Unit ${unitId}] Resources already downloaded`);
                return;
            }

            console.log(`[Unit ${unitId}] Starting resource download process`);

            // Fetch resource list
            const response = await fetch(`${HOST_URL}/api/unit-resources/${unitId}/${languageCode}`);
            if (!response.ok) {
                console.error(`[Unit ${unitId}] Failed to fetch resource list - Status: ${response.status}`);
                throw new Error('Failed to fetch resource list');
            }

            const resources: UnitResources = await response.json();
            console.log(`[Unit ${unitId}] Found resources:`, {
                audioCount: resources.audio.length,
                imageCount: resources.images.length
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
            await markResourcesAsDownloaded(unitId);
            console.log(`[Unit ${unitId}] Successfully completed all resource downloads`);
        } catch (error) {
            console.error(`[Unit ${unitId}] Error in resource download process:`, error);
        }
    };

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

                // Fetch progress separately to handle 404 case
                let progress: LessonProgress[] = [];
                try {
                    const progressResponse = await fetch(`${HOST_URL}/api/language-learners/${user.uid}/progress/${languageCode}`);
                    if (progressResponse.ok) {
                        progress = await progressResponse.json();
                        console.log(`[App] Fetched progress for ${progress.length} lessons`);
                    } else if (progressResponse.status !== 404) {
                        throw new Error('Failed to fetch progress');
                    } else {
                        console.log('[App] No progress found for this language');
                    }
                } catch (progressError) {
                    console.error('[App] Error fetching progress:', progressError);
                }

                // Group lessons by unit
                const unitMap = new Map<number, Unit>();
                lessons.forEach(lesson => {
                    if (!unitMap.has(lesson.unitId)) {
                        unitMap.set(lesson.unitId, {
                            id: lesson.unitId,
                            name: lesson.unitName,
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
                setLearnerProgress(progress);

                // Download resources for started units or the lowest order unit if no progress
                if (progress.length > 0) {
                    const startedUnits = new Set(progress
                        .filter(p => p.status === 'started')
                        .map(p => p.unitId));

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

    return (
        <ThemedView style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
            <ProfileHeader title={languageName as string} languageName={languageName as string} />

            {isLoading ? (
                <ActivityIndicator size="large" />
            ) : error ? (
                <ThemedText>{error}</ThemedText>
            ) : (
                <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 32 }}>
                    {units.map((unit) => {
                        const unitLocked = isUnitLocked(unit.id);

                        return (
                            <ThemedView key={unit.id} style={styles.unitContainer}>
                                <ThemedView style={[
                                    styles.unitHeader,
                                    unitLocked && styles.unitHeaderLocked
                                ]}>
                                    <ThemedText style={styles.unitName}>
                                        📦 {unit.name}
                                    </ThemedText>
                                    {unitLocked && (
                                        <ThemedText style={styles.lockedText}>🔒</ThemedText>
                                    )}
                                </ThemedView>
                                <ThemedView style={styles.lessonsContainer}>
                                    {unit.lessons.map((lesson) => {
                                        const progress = getLessonProgress(lesson.id);
                                        const isCompleted = progress?.status === 'completed';
                                        const isStarted = progress?.status === 'started';
                                        const lessonLocked = isLessonLocked(unit.id, lesson.id);

                                        // Always use globe emoji for lesson
                                        let lessonEmoji = '🌍';
                                        const emojiStyle = [
                                            { fontSize: 48 },
                                            lessonLocked && { color: '#A1A1AA' } // greyed out if locked
                                        ];

                                        return (
                                            <Pressable
                                                key={lesson.id}
                                                style={({ pressed }) => [
                                                    styles.lessonButton,
                                                    pressed && !lessonLocked && styles.lessonButtonPressed,
                                                    isCompleted && styles.lessonCompleted,
                                                    isStarted && styles.lessonStarted,
                                                    lessonLocked && styles.lessonLocked
                                                ]}
                                                onPress={() => !lessonLocked && handleLessonPress(lesson)}
                                                disabled={lessonLocked}
                                                accessibilityRole="button"
                                                accessibilityLabel={lessonLocked ? 'Locked lesson' : 'Lesson'}
                                            >
                                                <ThemedView style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                                                    <ThemedText style={emojiStyle}>{lessonEmoji}</ThemedText>
                                                    {lessonLocked && (
                                                        <ThemedText style={{
                                                            position: 'absolute',
                                                            top: 16,
                                                            right: 16,
                                                            fontSize: 18,
                                                            color: '#A1A1AA',
                                                            backgroundColor: 'transparent',
                                                        }}>🔒</ThemedText>
                                                    )}
                                                </ThemedView>
                                            </Pressable>
                                        );
                                    })}
                                </ThemedView>
                            </ThemedView>
                        );
                    })}
                </ScrollView>
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
    lessonsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 12,
        gap: 16,
        justifyContent: 'flex-start',
    },
    lessonButton: {
        // Remove all background, border, and shadow styles for a plain emoji
        alignItems: 'center',
        justifyContent: 'center',
        width: 60, // Make the touch area a reasonable size for accessibility
        height: 60,
        marginBottom: 0,
        backgroundColor: 'transparent',
        shadowColor: 'transparent',
        borderRadius: 0,
        paddingVertical: 0,
        paddingHorizontal: 0,
        elevation: 0,
    },
    lessonButtonPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.97 }],
    },
    lessonCompleted: {
        backgroundColor: '#D1FAE5',
    },
    lessonStarted: {
        backgroundColor: '#FEF9C3',
    },
    lessonTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#0F172A',
    },
    lessonTitleLocked: {
        color: '#A1A1AA',
    },
    completionText: {
        fontSize: 15,
        color: '#059669',
        marginLeft: 12,
        fontWeight: '500',
    },
    startedText: {
        fontSize: 15,
        color: '#B45309',
        marginLeft: 12,
        fontWeight: '500',
    },
    lockedText: {
        fontSize: 16,
        marginLeft: 12,
        color: '#A1A1AA',
        fontWeight: '500',
    },
    lessonLocked: {
        opacity: 0.6,
        backgroundColor: '#F1F5F9',
    },
}); 