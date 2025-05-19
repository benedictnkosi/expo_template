import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, Animated, useColorScheme, Image } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { HOST_URL } from '@/config/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { analytics } from '@/services/analytics';
import { Ionicons } from '@expo/vector-icons';

interface BookQuizProps {
    chapterId: number;
    startTime: number; // Unix timestamp when reading started
    onClose?: () => void;
    wordCount?: number; // Add wordCount prop
}

interface QuizQuestion {
    question: string;
    options: string[];
    correct: number; // Index of the correct answer
}

interface QuizData {
    chapterId: number;
    chapterName: string;
    quiz: QuizQuestion[];
    wordCount?: number; // Add wordCount to QuizData
}

export function BookQuiz({ chapterId, startTime, onClose, wordCount }: BookQuizProps) {
    const { colors } = useTheme();
    const colorScheme = useColorScheme();
    const { user } = useAuth();
    const isDark = colorScheme === 'dark';
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [showFeedback, setShowFeedback] = useState(false);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [quizStartTime, setQuizStartTime] = useState<number>(Date.now());
    const [chapterImageUrl, setChapterImageUrl] = useState<string | null>(null);
    const [readingDuration, setReadingDuration] = useState<number>(0);

    useEffect(() => {
        if (chapterId) {
            // Calculate reading duration when quiz starts
            const duration = Math.floor((Date.now() - startTime) / 1000);
            setReadingDuration(duration);

            analytics.track('reading_quiz_started', {
                userId: user?.uid,
                chapterId,
                readingDuration: duration
            });
            fetchQuiz();
        }
    }, [chapterId]);

    async function fetchQuiz() {
        if (!chapterId) {
            setError('Invalid chapter ID');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${HOST_URL}/api/chapter/${chapterId}/quiz`);
            const data = await res.json();
            if (data?.status === 'OK' && data?.data?.quiz) {
                // Parse the quiz string into an array of questions
                const parsedQuiz = JSON.parse(data.data.quiz);
                setQuiz({
                    chapterId: data.data.chapterId,
                    chapterName: data.data.chapterName,
                    quiz: parsedQuiz,
                    wordCount: data.data.wordCount || wordCount // Use wordCount from API or prop
                });
                setQuizStartTime(Date.now());
                // Fetch chapter image
                const imageUrl = `${HOST_URL}/public/learn/learner/get-image?image=chapter-${data.data.chapterNumber}.png`;
                try {
                    const imgRes = await fetch(imageUrl, { method: 'HEAD' });
                    if (imgRes.ok) setChapterImageUrl(imageUrl);
                    else setChapterImageUrl(null);
                } catch {
                    setChapterImageUrl(null);
                }
            } else {
                setError('Quiz not available.');
            }
        } catch (e) {
            console.error('Error fetching quiz:', e);
            setError('Failed to load quiz.');
        } finally {
            setIsLoading(false);
        }
    }

    async function completeChapter(percentage: number) {
        if (!user?.uid || !chapterId) return;

        setIsCompleting(true);
        try {
            const response = await fetch(`${HOST_URL}/api/learner/complete-chapter`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    learnerUid: user.uid,
                    chapterId,
                    duration: readingDuration,
                    score: Math.floor(percentage),
                }),
            });
            //log json response
            if (!response.ok) {
                throw new Error('Failed to complete chapter');
            }
        } catch (error) {
            console.error('Error completing chapter:', error);
        } finally {
            setIsCompleting(false);
        }
    }

    function handleSelect(qid: number, option: string) {
        if (!quiz?.quiz[currentQuestionIndex]) return;

        setAnswers(a => ({ ...a, [qid]: option }));
        setShowFeedback(true);
        const currentQuestion = quiz.quiz[currentQuestionIndex];
        if (option === currentQuestion.options[currentQuestion.correct]) {
            setScore(prev => prev + 1);
        }
    }

    function handleNext() {
        if (!quiz?.quiz) return;

        if (currentQuestionIndex < quiz.quiz.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setShowFeedback(false);
        } else {
            const percentage = (score / quiz.quiz.length) * 100;
            completeChapter(percentage);
            setShowResults(true);

            // Enhanced quiz completion analytics
            analytics.track('reading_quiz_completed', {
                userId: user?.uid,
                chapterId,
                chapterName: quiz.chapterName,
                score,
                totalQuestions: quiz.quiz.length,
                percentage,
                duration: Math.floor((Date.now() - quizStartTime) / 1000),
                readingDuration,
                performance: percentage >= 90 ? 'excellent' :
                    percentage >= 75 ? 'good' :
                        percentage >= 60 ? 'average' : 'needs_improvement',
                correctAnswers: score,
                incorrectAnswers: quiz.quiz.length - score,
                timePerQuestion: Math.floor((Date.now() - quizStartTime) / 1000 / quiz.quiz.length)
            });
        }
    }

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
            </View>
        );
    }

    if (!quiz?.quiz?.length) {
        return (
            <View style={styles.errorContainer}>
                <Text style={[styles.error, { color: colors.error }]}>No questions available.</Text>
            </View>
        );
    }

    const currentQuestion = quiz.quiz[currentQuestionIndex];
    if (!currentQuestion) return null;

    const progress = ((currentQuestionIndex + 1) / quiz.quiz.length) * 100;
    const isCorrect = answers[currentQuestionIndex] === currentQuestion.options[currentQuestion.correct];

    // Format duration for display
    const formatDuration = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    // Calculate WPM
    const calculateWPM = (words: number, seconds: number) => {
        if (!words || !seconds) return 0;
        const minutes = seconds / 60;
        return Math.round(words / minutes);
    };

    const wpm = calculateWPM(quiz?.wordCount || 0, readingDuration);

    // Dynamic colors
    const cardBg = isDark ? '#181A20' : '#fff';
    const gradientColors: [string, string] = isDark
        ? ['rgba(124,58,237,0.18)', 'rgba(124,58,237,0.08)']
        : ['rgba(124,58,237,0.10)', 'rgba(124,58,237,0.05)'];
    const optionBg = isDark ? '#23242A' : '#F3F4F6';
    const optionText = isDark ? '#E5E7EB' : '#374151';
    const borderColor = isDark ? '#33364A' : '#E5E7EB';
    const progressBg = isDark ? '#23242A' : '#F3F4F6';
    const progressBar = isDark ? '#A78BFA' : '#7C3AED';
    const correctBg = isDark ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.15)';
    const correctBorder = isDark ? 'rgba(34,197,94,0.5)' : 'rgba(34,197,94,0.5)';
    const correctText = isDark ? '#4ADE80' : '#16A34A';
    const wrongBg = isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.15)';
    const wrongBorder = isDark ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.5)';
    const wrongText = isDark ? '#F87171' : '#DC2626';
    const feedbackBadgeBg = (isCorrect: boolean) => isCorrect ? correctBg : wrongBg;
    const feedbackBadgeText = (isCorrect: boolean) => isCorrect ? correctText : wrongText;
    const nextButtonGradient: [string, string] = isDark ? ['#7C3AED', '#6366F1'] : [colors.primary, `${colors.primary}CC`];
    const shadow = isDark ? {} : styles.lightShadow;

    const getOptionStyle = (opt: string) => {
        if (!showFeedback) {
            return answers[currentQuestionIndex] === opt
                ? { backgroundColor: progressBar, transform: [{ scale: 1.02 }] }
                : { backgroundColor: optionBg, borderColor, borderWidth: 1 };
        }
        if (opt === currentQuestion.options[currentQuestion.correct]) {
            return {
                backgroundColor: correctBg,
                borderColor: correctBorder,
                borderWidth: 1,
            };
        }
        if (answers[currentQuestionIndex] === opt && opt !== currentQuestion.options[currentQuestion.correct]) {
            return {
                backgroundColor: wrongBg,
                borderColor: wrongBorder,
                borderWidth: 1,
            };
        }
        return { backgroundColor: optionBg, borderColor, borderWidth: 1 };
    };

    const getOptionTextStyle = (opt: string) => {
        if (!showFeedback) {
            return answers[currentQuestionIndex] === opt
                ? { color: '#fff' }
                : { color: optionText };
        }
        if (opt === currentQuestion.options[currentQuestion.correct]) {
            return { color: correctText, fontWeight: '700' as const };
        }
        if (answers[currentQuestionIndex] === opt && opt !== currentQuestion.options[currentQuestion.correct]) {
            return { color: wrongText, fontWeight: '700' as const };
        }
        return { color: optionText };
    };

    if (showResults) {
        const percentage = (score / quiz.quiz.length) * 100;
        let resultEmoji, resultMessage, resultColor, shouldRetry, resultSubText;

        if (percentage >= 90) {
            resultEmoji = '🎉';
            resultMessage = 'Amazing! You and Dimpo are totally in sync with the story!';
            resultSubText = 'You caught every detail — like a true story explorer!';
            resultColor = '#10B981'; // Emerald
            shouldRetry = false;
        } else if (percentage >= 75) {
            resultEmoji = '🌟';
            resultMessage = "Great work! You're catching all the key moments!";
            resultSubText = "Dimpo's impressed. You're really following the journey!";
            resultColor = '#3B82F6'; // Blue
            shouldRetry = false;
        } else if (percentage >= 60) {
            resultEmoji = '👍';
            resultMessage = "Nice try! You're getting the hang of it — keep going!";
            resultSubText = "Some twists might've slipped by — read closely next time!";
            resultColor = '#F59E0B'; // Amber
            shouldRetry = true;
        } else {
            resultEmoji = '📖';
            resultMessage = "Let's dive back into the story together. Dimpo believes in you!";
            resultSubText = "Sometimes it takes a second read — every hero learns with time!";
            resultColor = '#EF4444'; // Red
            shouldRetry = true;
        }

        return (
            <View style={[styles.resultsContainer, { backgroundColor: cardBg }, shadow]}>
                <LinearGradient
                    colors={gradientColors}
                    style={styles.gradientBackground}
                />
                <Text style={styles.resultEmoji}>{resultEmoji}</Text>
                <Text style={[styles.quizTitle, { color: colors.primary }]}>
                    {resultEmoji} Quiz Results
                </Text>
                <View style={styles.scoreContainer}>
                    <Text style={[styles.scoreText, { color: resultColor }]}>
                        {score} / {quiz.quiz.length}
                    </Text>
                </View>
                <Text style={[styles.resultMessage, { color: isDark ? '#E5E7EB' : '#374151' }]}>
                    {resultEmoji} {resultMessage}
                </Text>
                {shouldRetry && (
                    <Text style={[styles.retryMessage, { color: colors.textSecondary }]}>
                        We recommend reading the chapter again to better understand the content.
                    </Text>
                )}
                <Pressable
                    style={[styles.quizButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                        if (shouldRetry) {
                            // Reset quiz state
                            setCurrentQuestionIndex(0);
                            setAnswers({});
                            setShowResults(false);
                            setScore(0);
                            setShowFeedback(false);
                            // Close quiz and return to reading
                            if (onClose) {
                                onClose();
                            }
                        } else {
                            // Just close the quiz for good scores
                            if (onClose) {
                                onClose();
                            }
                        }
                    }}
                    disabled={isCompleting}
                >
                    {isCompleting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.quizButtonText}>
                            {shouldRetry ? 'Try Again' : 'Done'}
                        </Text>
                    )}
                </Pressable>
            </View>
        );
    }

    return (
        <View style={[styles.quizContainer, { backgroundColor: cardBg }, shadow]}>
            <LinearGradient
                colors={gradientColors}
                style={styles.gradientBackground}
            />
            <Pressable
                style={styles.closeButton}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close quiz"
            >
                <Ionicons
                    name="close"
                    size={24}
                    color={isDark ? '#E5E7EB' : '#374151'}
                />
            </Pressable>
            {chapterImageUrl && (
                <Image
                    source={{ uri: chapterImageUrl }}
                    style={{ width: '100%', height: 180, borderRadius: 16, marginBottom: 16 }}
                    resizeMode="cover"
                />
            )}
            <View style={[styles.progressContainer, { backgroundColor: progressBg }]}>
                <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: progressBar }]} />
            </View>
            <Text style={[styles.quizTitle, { color: progressBar }]}>{quiz.chapterName}</Text>
            <Text style={[styles.progressText, { color: isDark ? '#A1A1AA' : '#6B7280' }]}>
                Question {currentQuestionIndex + 1} of {quiz.quiz.length}
            </Text>
            <View style={styles.statsContainer}>
                <View style={[styles.statItem, { backgroundColor: isDark ? '#23242A' : '#F3F4F6' }]}>
                    <Ionicons name="time-outline" size={16} color={isDark ? '#A1A1AA' : '#6B7280'} />
                    <Text style={[styles.statText, { color: isDark ? '#A1A1AA' : '#6B7280' }]}>
                        {formatDuration(readingDuration)}
                    </Text>
                </View>
                <View style={[styles.statItem, { backgroundColor: isDark ? '#23242A' : '#F3F4F6' }]}>
                    <Ionicons name="speedometer-outline" size={16} color={isDark ? '#A1A1AA' : '#6B7280'} />
                    <Text style={[styles.statText, { color: isDark ? '#A1A1AA' : '#6B7280' }]}>
                        {wpm} WPM
                    </Text>
                </View>
            </View>
            <View style={styles.questionBlock}>
                <Text style={[styles.questionText, { color: isDark ? '#F3F4F6' : colors.text }]}>{currentQuestion.question}</Text>
                {currentQuestion.options.map((opt, index) => (
                    <Pressable
                        key={opt}
                        style={[
                            styles.optionButton,
                            getOptionStyle(opt),
                        ]}
                        onPress={() => !showFeedback && handleSelect(currentQuestionIndex, opt)}
                        disabled={showFeedback}
                        accessibilityRole="button"
                    >
                        <Text style={[styles.optionText, getOptionTextStyle(opt)]}>{opt}</Text>
                    </Pressable>
                ))}
            </View>
            <View style={styles.feedbackContainer}>
                {showFeedback && (
                    <View style={[
                        styles.feedbackBadge,
                        { backgroundColor: feedbackBadgeBg(isCorrect) }
                    ]}>
                        <Text style={[
                            styles.feedbackText,
                            { color: feedbackBadgeText(isCorrect) }
                        ]}>
                            {isCorrect ? 'Correct!' : 'Incorrect!'}
                        </Text>
                    </View>
                )}
                <Pressable
                    style={[
                        styles.nextButton,
                        !answers[currentQuestionIndex] && styles.disabledButton
                    ]}
                    onPress={handleNext}
                    disabled={!answers[currentQuestionIndex]}
                >
                    <LinearGradient
                        colors={answers[currentQuestionIndex] ? nextButtonGradient : ['#9CA3AF', '#9CA3AF']}
                        style={styles.nextButtonGradient}
                    >
                        <Text style={[
                            styles.nextButtonText,
                            !answers[currentQuestionIndex] && styles.disabledButtonText
                        ]}>
                            {currentQuestionIndex < quiz.quiz.length - 1 ? 'Next Question' : 'See Results'}
                        </Text>
                    </LinearGradient>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    quizContainer: {
        marginTop: 16,
        borderRadius: 24,
        padding: 20,
        elevation: 3,
        overflow: 'hidden',
    },
    lightShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    gradientBackground: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    progressContainer: {
        height: 6,
        borderRadius: 3,
        marginBottom: 20,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
    quizTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    progressText: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        fontWeight: '500',
    },
    questionBlock: {
        marginBottom: 24,
    },
    questionText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
        lineHeight: 26,
    },
    optionButton: {
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    optionText: {
        fontSize: 16,
        fontWeight: '500',
    },
    feedbackContainer: {
        alignItems: 'center',
        marginTop: 24,
    },
    feedbackBadge: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginBottom: 20,
    },
    feedbackText: {
        fontSize: 16,
        fontWeight: '600',
    },
    nextButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
    },
    nextButtonGradient: {
        paddingVertical: 14,
        alignItems: 'center',
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    error: {
        marginTop: 24,
        fontSize: 16,
        textAlign: 'center',
        color: '#DC2626',
    },
    resultsContainer: {
        alignItems: 'center',
        marginTop: 32,
        padding: 24,
        borderRadius: 24,
        overflow: 'hidden',
    },
    resultEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    scoreContainer: {
        alignItems: 'center',
        marginVertical: 24,
    },
    scoreText: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    percentageText: {
        fontSize: 24,
        fontWeight: '600',
    },
    resultMessage: {
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 26,
    },
    quizButton: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 8,
        minWidth: 200,
    },
    quizButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.7,
    },
    disabledButtonText: {
        color: '#E5E7EB',
    },
    retryMessage: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
        fontStyle: 'italic',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 24,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 8,
    },
    statText: {
        fontSize: 14,
        fontWeight: '500',
    },
}); 