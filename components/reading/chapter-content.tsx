import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Pressable, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { HOST_URL } from '@/config/api';
import { analytics } from '@/services/analytics';

interface ChapterContentProps {
    chapterName: string;
    chapterNumber: number;
    content: string;
    fontSize?: number;
    onProgress?: (progress: number) => void;
    onStartQuiz?: (wordCount: number) => void;
}

function removeDoubleAsteriskText(text: string): string {
    return text.replace(/\*\*.*?\*\*/g, '');
}

// Helper function for safe analytics logging
async function logAnalyticsEvent(eventName: string, eventParams?: Record<string, any>) {
    try {
        await analytics.track(eventName, eventParams);
    } catch (error) {
        console.error('[Analytics] Error logging event:', error);
    }
}

export function ChapterContent({ chapterName, chapterNumber, content, fontSize = 18, onProgress, onStartQuiz }: ChapterContentProps) {
    const { colors } = useTheme();
    const [localProgress, setLocalProgress] = useState(0);
    const [chapterImageUrl, setChapterImageUrl] = useState<string | null>(null);
    const [hasStartedReading, setHasStartedReading] = useState(false);

    // Calculate word count from content
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    useEffect(() => {
        if (!chapterNumber) return;
        const imageUrl = `${HOST_URL}/public/learn/learner/get-image?image=chapter-${chapterNumber}.png`;
        console.log('imageUrl', imageUrl);
        fetch(imageUrl, { method: 'HEAD' })
            .then(res => setChapterImageUrl(res.ok ? imageUrl : null))
            .catch(() => setChapterImageUrl(null));

        console.log('chapterImageUrl', chapterImageUrl);
        // Log chapter view event
        logAnalyticsEvent('chapter_view', {
            chapter_name: chapterName,
            chapter_number: chapterNumber
        });
    }, [chapterNumber]);

    function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const totalScrollable = contentSize.height - layoutMeasurement.height;

        // Log reading start event when user first scrolls
        if (!hasStartedReading && contentOffset.y > 0) {
            setHasStartedReading(true);
            logAnalyticsEvent('reading_started', {
                chapter_name: chapterName,
                chapter_number: chapterNumber
            });
        }

        if (totalScrollable <= 0) {
            onProgress?.(1);
            setLocalProgress(1);
            return;
        }
        const progress = Math.min(1, Math.max(0, contentOffset.y / totalScrollable));
        onProgress?.(progress);
        setLocalProgress(progress);
    }

    const handleStartQuiz = () => {
        logAnalyticsEvent('quiz_started', {
            chapter_name: chapterName,
            chapter_number: chapterNumber,
            reading_progress: localProgress,
            word_count: wordCount
        });
        onStartQuiz?.(wordCount);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={true}
                accessibilityRole="scrollbar"
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                <Text
                    style={[styles.chapterName, { color: colors.primary }]}
                    accessibilityRole="header"
                    accessibilityLabel={`Chapter: ${chapterName}`}
                >
                    {chapterName}
                </Text>

                {chapterImageUrl && (
                    <Image
                        source={{ uri: chapterImageUrl }}
                        style={{ width: '100%', height: 180, borderRadius: 16, marginBottom: 16 }}
                        resizeMode="cover"
                    />
                )}
                {content.split('\n').map((line, idx) => {
                    const cleanedLine = removeDoubleAsteriskText(line);
                    return (
                        <Text
                            key={idx}
                            style={[styles.content, { color: colors.text, fontSize }]}
                            accessibilityLabel={cleanedLine}
                        >
                            {cleanedLine || ' '}
                        </Text>
                    );
                })}
            </ScrollView>
            {onStartQuiz && (
                <View style={styles.buttonContainer}>
                    <Pressable
                        style={[styles.quizButton, { backgroundColor: colors.primary }]}
                        onPress={handleStartQuiz}
                        accessibilityRole="button"
                    >
                        <Text style={[styles.quizButtonText, { color: colors.background }]}>Take a Quick Quiz</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 16,
        margin: 8,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        paddingTop: 8,
        paddingHorizontal: 12,
        paddingBottom: 20,
        gap: 8,
    },
    chapterName: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    content: {
        fontSize: 18,
        lineHeight: 24,
        textAlign: 'left',
        fontWeight: '400',
    },
    buttonContainer: {
        padding: 16,
        backgroundColor: 'transparent',
    },
    quizButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 16,
        alignItems: 'center',
        minWidth: 200,
        alignSelf: 'center',
    },
    quizButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
}); 