import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { getNextChapter, ChapterResponse } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { analytics } from '@/services/analytics';
import { useFocusEffect } from '@react-navigation/native';

export function NextChapterCard() {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const [chapterData, setChapterData] = useState<ChapterResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadNextChapter = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const data = await getNextChapter(user.uid);
            setChapterData(data);
        } catch (error) {
            console.error('Error loading next chapter:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.uid]);

    // Initial load
    useEffect(() => {
        loadNextChapter();
    }, [loadNextChapter]);

    // Refresh on tab focus
    useFocusEffect(
        useCallback(() => {
            loadNextChapter();
        }, [loadNextChapter])
    );

    if (isLoading || !chapterData) {
        return null;
    }

    if (!chapterData.chapter) {
        return (
            <Pressable
                style={({ pressed }) => [
                    styles.container,
                    pressed && styles.pressed
                ]}
                onPress={() => {
                    analytics.track('reading_card_clicked', {
                        userId: user?.uid,
                        type: 'completed',
                        chapter_name: 'all_completed'
                    });
                    router.push('/(tabs)/reading');
                }}
            >
                <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={styles.blurContainer}>
                    <LinearGradient
                        colors={['#4F46E5', '#7C3AED']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradient}
                    >
                        <View style={styles.content}>
                            <Text style={styles.title}>🎓 Congratulations! 🎉</Text>
                            <Text style={styles.subText}>Take 5 minutes to read about Dimpo's adventures</Text>
                            <Text style={styles.chapterName}>You've completed all available chapters</Text>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.startButton,
                                    pressed && styles.startButtonPressed
                                ]}
                                onPress={() => router.push('/(tabs)/reading')}
                            >
                                <Text style={styles.startButtonText}>View Progress 📊</Text>
                            </Pressable>
                        </View>
                    </LinearGradient>
                </BlurView>
            </Pressable>
        );
    }

    const publishDate = new Date(chapterData.chapter.publishDate);
    const now = new Date();
    const isPublished = now >= publishDate;
    const timeUntilPublish = publishDate.getTime() - now.getTime();
    const hoursUntilPublish = Math.floor(timeUntilPublish / (1000 * 60 * 60));
    const minutesUntilPublish = Math.ceil((timeUntilPublish % (1000 * 60 * 60)) / (1000 * 60));

    const timeDisplay = hoursUntilPublish > 0
        ? `${hoursUntilPublish} hour${hoursUntilPublish > 1 ? 's' : ''}`
        : `${minutesUntilPublish} minute${minutesUntilPublish > 1 ? 's' : ''}`;

    return (

        <Pressable
            style={({ pressed }) => [
                styles.container,
                pressed && styles.pressed
            ]}
            onPress={() => {
                analytics.track('reading_card_clicked', {
                    userId: user?.uid,
                    type: isPublished ? 'start_reading' : 'upcoming',
                    chapter_name: chapterData.chapter.chapterName,
                    chapter_number: chapterData.chapter.chapterNumber,
                    publish_date: chapterData.chapter.publishDate,
                    time_until_publish: timeUntilPublish
                });
                router.push('/(tabs)/reading');
            }}
        >
            <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={styles.blurContainer}>
                <LinearGradient
                    colors={['#4F46E5', '#7C3AED']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradient}
                >
                    <View style={styles.content}>
                        <Text style={styles.title}>📚 Daily Reading Habit 📖</Text>
                        <Text style={styles.subText}>Take 5 minutes to read about Dimpo's adventures</Text>
                        <Text style={styles.chapterName}>{chapterData.chapter.chapterName}</Text>
                        {chapterData.chapter && (
                            <Text style={styles.chapterNumber}>ch. {chapterData.chapter.chapterNumber}</Text>
                        )}
                        {isPublished ? (
                            <Pressable
                                style={({ pressed }) => [
                                    styles.startButton,
                                    pressed && styles.startButtonPressed
                                ]}
                                onPress={() => router.push('/(tabs)/reading')}
                            >
                                <Text style={styles.startButtonText}>
                                    {'Start Reading 📖'}
                                </Text>
                            </Pressable>
                        ) : (
                            <View style={styles.timerContainer}>
                                <Text style={styles.timerText}>
                                    Dropping in {timeDisplay} ⏰
                                </Text>
                            </View>
                        )}
                    </View>
                </LinearGradient>
            </BlurView>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginVertical: 8,
    },
    pressed: {
        transform: [{ scale: 0.98 }],
    },
    blurContainer: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    gradient: {
        padding: 20,
    },
    content: {
        gap: 12,
    },
    title: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.9,
    },
    subText: {
        color: 'white',
        fontSize: 14,
        opacity: 0.8,
        marginTop: -4,
    },
    chapterName: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    chapterNumber: {
        color: 'white',
        fontSize: 12,
        opacity: 0.7,
        marginTop: -4,
        marginBottom: 8,
    },
    timerContainer: {
        marginTop: 12,
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        alignItems: 'center',
    },
    timerText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    startButton: {
        marginTop: 12,
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        alignItems: 'center',
    },
    startButtonPressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    startButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
}); 