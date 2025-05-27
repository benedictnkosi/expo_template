import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Pressable, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { HOST_URL } from '@/config/api';
import { analytics } from '@/services/analytics';
import { ProPromoCard } from '../ProPromoCard';
import { useAuth } from '@/contexts/AuthContext';
import { getLearner } from '@/services/api';

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
    const { user } = useAuth();
    const [localProgress, setLocalProgress] = useState(0);
    const [chapterImageUrl, setChapterImageUrl] = useState<string | null>(null);
    const [hasStartedReading, setHasStartedReading] = useState(false);
    const [isFreeUser, setIsFreeUser] = useState(true);

    // Calculate word count from content
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    useEffect(() => {
        if (!user?.uid) return;
        getLearner(user.uid).then(learner => {
            setIsFreeUser((learner as any).subscription === 'free');
        }).catch(error => {
            console.error('Error fetching learner info:', error);
        });
    }, [user?.uid]);

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

    // Split content into paragraphs and find a natural break point
    const paragraphs = content.split('\n').filter(line => line.trim().length > 0);
    const totalParagraphs = paragraphs.length;

    // Find a natural break point (around 40% of the content)
    const breakPoint = Math.floor(totalParagraphs * 0.4);

    // Ensure we don't break in the middle of a sentence or too close to the start/end
    const safeBreakPoint = Math.max(2, Math.min(breakPoint, totalParagraphs - 2));

    // Create the content with promo card at the natural break point
    const contentWithPromo = isFreeUser
        ? [
            ...paragraphs.slice(0, safeBreakPoint).map((line, idx) => (
                <Text
                    key={`p-${idx}`}
                    style={[styles.content, { color: colors.text, fontSize }]}
                    accessibilityLabel={removeDoubleAsteriskText(line)}
                >
                    {removeDoubleAsteriskText(line)}
                </Text>
            )),
            <ProPromoCard
                key="promo-card"
                testID="reading-promo-card"
                onPress={() => { }}
                showCrown={false}
            />,
            ...paragraphs.slice(safeBreakPoint).map((line, idx) => (
                <Text
                    key={`p-${safeBreakPoint + idx}`}
                    style={[styles.content, { color: colors.text, fontSize }]}
                    accessibilityLabel={removeDoubleAsteriskText(line)}
                >
                    {removeDoubleAsteriskText(line)}
                </Text>
            ))
        ]
        : paragraphs.map((line, idx) => (
            <Text
                key={`p-${idx}`}
                style={[styles.content, { color: colors.text, fontSize }]}
                accessibilityLabel={removeDoubleAsteriskText(line)}
            >
                {removeDoubleAsteriskText(line)}
            </Text>
        ));

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
                {contentWithPromo}
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
        marginBottom: 12,
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