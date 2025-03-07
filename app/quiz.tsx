import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, Image, TextInput, ScrollView, View, Linking, Dimensions, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Modal from 'react-native-modal';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import WebView from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Audio } from 'expo-av';
import * as StoreReview from 'expo-store-review';
import ZoomableImageNew from '../components/ZoomableImageNew';

import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { checkAnswer, removeResults, trackStreak, getSubjectStats, setQuestionStatus } from '../services/api';
import { API_BASE_URL as ConfigAPI_BASE_URL } from '../config/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { Analytics, logEvent } from 'firebase/analytics';
import { analytics } from '../config/firebase';
import { useTheme } from '@/contexts/ThemeContext';

// Helper function for safe analytics logging
function logAnalyticsEvent(eventName: string, eventParams?: Record<string, any>) {
    if (analytics) {
        const analyticsInstance = analytics as Analytics;
        logEvent(analyticsInstance, eventName, eventParams);
    }
}

interface Question {
    id: number;
    question: string;
    type: string;
    context: string;
    answer: string;
    answer_image: string | null;
    image_path: string | null;
    options: {
        option1: string;
        option2: string;
        option3: string;
        option4: string;
    };
    question_image_path: string | null;
    year: string;
    term: string;
    explanation: string;
    curriculum?: string;
}


interface QuestionResponse extends Question {
    status: string;
    message?: string;
}

interface SubjectStats {
    status: string;
    data: {
        subject: {
            id: number;
            name: string;
        };
        stats: {
            total_answers: number;
            correct_answers: number;
            incorrect_answers: number;
            correct_percentage: number;
            incorrect_percentage: number;
        };
    };
}

// Helper function to clean the answer string
function cleanAnswer(answer: string): string {
    try {
        // If it's a JSON array, parse first
        let cleanedAnswer = answer;
        if (answer.startsWith('[')) {
            cleanedAnswer = JSON.parse(answer)
                .map((a: string) => a.trim())
                .join(', ');
        }

        // If answer contains pipe character, split into new lines
        if (cleanedAnswer.includes('|')) {
            return cleanedAnswer
                .split('|')
                .map(part => part.trim())
                .join('\n');
        }

        // Return single line answer
        return cleanedAnswer.trim();
    } catch {
        // If parsing fails, return the original answer
        return answer;
    }
}

function KaTeX({ latex, isOption }: { latex: string, isOption?: boolean }) {
    const [webViewHeight, setWebViewHeight] = useState(60);
    const { isDark } = useTheme();

    const html = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
                <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
                <style>
                    body {
                        margin: 0;
                        padding: 8px;
                        background-color: transparent;
                    }
                    #formula {
                        width: 100%;
                        overflow-x: auto;
                        overflow-y: visible;
                        padding: 5px 0;
                    }
                    .katex {
                        font-size: ${isOption && latex.length > 70 ? '0.8em' : '1em'};
                        color: ${isDark ? '#FFFFFF' : '#000000'};
                    }
                    .katex-display {
                        margin: 0;
                        padding: 5px 0;
                        overflow: visible;
                    }
                </style>
            </head>
            <body>
                <div id="formula"></div>
                <script>
                    document.addEventListener("DOMContentLoaded", function() {
                        katex.render(String.raw\`${latex}\`, document.getElementById("formula"), {
                            throwOnError: false,
                            displayMode: true,
                            trust: true,
                            strict: false,
                            output: 'html'
                        });
                        // Send height to React Native
                        window.ReactNativeWebView.postMessage(document.documentElement.scrollHeight);
                    });
                </script>
            </body>
        </html>
    `;

    return (
        <WebView
            source={{ html }}
            style={{ height: webViewHeight, backgroundColor: 'transparent' }}
            scrollEnabled={false}
            onMessage={(event) => {
                const height = parseInt(event.nativeEvent.data);
                setWebViewHeight(height);
            }}
        />
    );
}

// Add helper function
function renderMixedContent(text: string, isDark: boolean, colors: any) {
    const parts = text.split(/(\$[^$]+\$)/g);
    return (
        <View style={styles.mixedContentContainer}>
            {parts.map((part, index) => {
                if (part.startsWith('$') && part.endsWith('$')) {
                    // LaTeX content
                    return (
                        <View key={index} style={[styles.latexContainer, {
                            backgroundColor: isDark ? colors.surface : '#FFFFFF'
                        }]}>
                            <KaTeX
                                latex={part.slice(1, -1)} // Remove $ signs
                            />
                        </View>
                    );
                }
                // Regular text (only if not empty)
                if (part.trim()) {
                    return (
                        <ThemedText key={index} style={[styles.contentText, { color: colors.text }]}>
                            {part.trim()}
                        </ThemedText>
                    );
                }
                return null;
            })}
        </View>
    );
}

// Add this array at the top level
const SUCCESS_MESSAGES = [
    '🎉 Great Job!',
    '🎯 You Nailed It!',
    '🚀 Superstar Move!',
    '🔥 You\'re on Fire!',
    '🧠 Big Brain Energy!',
    '🎖️ Champion Level Unlocked!',
    '⚡ Lightning Fast Thinking!',
    '🌟 Brilliant Answer!',
    '🏆 Winner Vibes!',
    '📚 Smart Cookie Alert!'
];

// Add this helper function
function getRandomSuccessMessage(): string {
    const randomIndex = Math.floor(Math.random() * SUCCESS_MESSAGES.length);
    return SUCCESS_MESSAGES[randomIndex];
}

// Add with the SUCCESS_MESSAGES array
const WRONG_ANSWER_MESSAGES = [
    '🤔 Hmm... Let\'s Learn!',
    '🎯 Oops! Let\'s Nail This!',
    '🚧 Not Quite! Try Again!',
    '🔄 Almost There! Keep Going!',
    '🧐 Think Again, You Got This!'
];

// Add helper function
function getRandomWrongMessage(): string {
    const randomIndex = Math.floor(Math.random() * WRONG_ANSWER_MESSAGES.length);
    return WRONG_ANSWER_MESSAGES[randomIndex];
}

const NO_QUESTIONS_ILLUSTRATION = require('@/assets/images/illustrations/stressed.png');


const ImageLoadingPlaceholder = () => (
    <View style={styles.imagePlaceholderContainer}>
        <View style={styles.imagePlaceholderContent}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <ThemedText style={styles.loadingText}>Loading image...</ThemedText>
        </View>
    </View>
);

export default function QuizScreen() {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const { subjectName, learnerRole } = useLocalSearchParams();
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [noMoreQuestions, setNoMoreQuestions] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(true);
    const [isAnswerImageLoading, setIsAnswerImageLoading] = useState(true);
    const scrollViewRef = React.useRef<ScrollView>(null);
    const [selectedPaper, setSelectedPaper] = useState<string | null>(null);
    const [stats, setStats] = useState<SubjectStats['data']['stats'] | null>(null);
    const [isReportModalVisible, setIsReportModalVisible] = useState(false);
    const [reportComment, setReportComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const insets = useSafeAreaInsets();
    const correctSound = useRef<Audio.Sound>();
    const incorrectSound = useRef<Audio.Sound>();
    const [isExplanationModalVisible, setIsExplanationModalVisible] = useState(false);
    const [aiExplanation, setAiExplanation] = useState<string>('');
    const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
    const [isAnswerLoading, setIsAnswerLoading] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string>('');
    const [isZoomModalVisible, setIsZoomModalVisible] = useState(false);
    const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
    const [isRestartModalVisible, setIsRestartModalVisible] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [hasShownRating, setHasShownRating] = useState(false);

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({
                animated: true
            });
        }, 500);
    };


    useEffect(() => {
        async function loadSounds() {
            try {
                const { sound: correct } = await Audio.Sound.createAsync(
                    require('@/assets/audio/correct_answer.mp3')
                );
                const { sound: incorrect } = await Audio.Sound.createAsync(
                    require('@/assets/audio/bad_answer.mp3')
                );
                correctSound.current = correct;
                incorrectSound.current = incorrect;
            } catch (error) {
                console.log('Error loading sounds:', error);
            }
        }
        loadSounds();

        return () => {
            if (correctSound.current) {
                correctSound.current.unloadAsync();
            }
            if (incorrectSound.current) {
                incorrectSound.current.unloadAsync();
            }
        };
    }, []);

    const playSound = async (isCorrect: boolean) => {
        try {
            const soundToPlay = isCorrect ? correctSound.current : incorrectSound.current;
            if (soundToPlay) {
                await soundToPlay.replayAsync();
            }
        } catch (error) {
            console.log('Error playing sound:', error);
        }
    };

    useEffect(() => {
        logAnalyticsEvent('quiz_screen_view', {
            user_id: user?.uid,
            subject_name: subjectName,
            learner_role: learnerRole
        });

        console.log("learner role", learnerRole);
    }, []);

    const reportIssue = () => {
        setIsReportModalVisible(true);
    };

    const handleSubmitReport = async () => {
        if (!reportComment.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please enter a comment',
                position: 'bottom'
            });
            return;
        }

        try {
            setIsSubmitting(true);
            await setQuestionStatus({
                question_id: currentQuestion?.id || 0,
                status: 'rejected',
                email: user?.email || '',
                uid: user?.uid || '',
                comment: reportComment
            });

            Toast.show({
                type: 'success',
                text1: 'Thank you',
                text2: 'Issue reported successfully',
                position: 'bottom'
            });
            setIsReportModalVisible(false);
            setReportComment('');
            loadRandomQuestion(selectedPaper || '');
        } catch (error) {
            console.error('Error reporting issue:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to report issue',
                position: 'bottom'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const loadRandomQuestion = async (paper: string) => {
        if (!user?.uid || !subjectName) {

            return;
        }
        // Reset all states before loading new question
        setSelectedAnswer(null);
        setShowFeedback(false);
        setIsCorrect(null);

        try {
            setIsLoading(true); const response = await fetch(
                `${ConfigAPI_BASE_URL}/public/learn/question/byname?subject_name=${subjectName}&paper_name=${paper}&uid=${user.uid}&question_id=0`
            );
            if (!response.ok) {
                throw new Error('Failed to fetch question');
            }

            const data: QuestionResponse = await response.json();

            if (data.status === "NOK" && data.message === "No more questions available") {
                setNoMoreQuestions(true);
                setCurrentQuestion(null);
            } else {
                // Shuffle the options
                const options = data.options;
                const entries = Object.entries(options);
                const shuffledEntries = entries.sort(() => Math.random() - 0.5);
                data.options = {
                    option1: shuffledEntries[0][1],
                    option2: shuffledEntries[1][1],
                    option3: shuffledEntries[2][1],
                    option4: shuffledEntries[3][1]
                };
                setCurrentQuestion(data);
                setNoMoreQuestions(false);
            }

            const newStats = await getSubjectStats(user.uid, subjectName + " " + paper);
            setStats(newStats.data.stats);
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load question',
                position: 'bottom'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswer = async (answer: string) => {
        if (!user?.uid || !currentQuestion) return;

        try {
            setIsAnswerLoading(true);
            setSelectedAnswer(answer);

            // Log answer submission
            logAnalyticsEvent('submit_answer', {
                user_id: user.uid,
                question_id: currentQuestion.id,
                answer: answer
            });

            const response = await checkAnswer(user.uid, currentQuestion.id, answer);
            setShowFeedback(true);
            setIsCorrect(response.is_correct);
            setFeedbackMessage(response.is_correct ? getRandomSuccessMessage() : getRandomWrongMessage());

            // Play sound using the new playSound function
            await playSound(response.is_correct);

            trackStreak(user.uid);

            // Check if we should show rating prompt after correct answer
            if (response.is_correct) {
                try {
                    const hasRated = await SecureStore.getItemAsync('has_reviewed_app');
                    const nextPromptDateStr = await SecureStore.getItemAsync('next_rating_prompt_date');

                    if (!hasRated && !hasShownRating) {
                        if (nextPromptDateStr) {
                            const nextPromptDate = new Date(nextPromptDateStr);
                            const now = new Date();

                            // Only show if we've passed the next prompt date
                            if (now >= nextPromptDate) {
                                setTimeout(() => {
                                    setShowRatingModal(true);
                                    setHasShownRating(true);
                                }, 2000);
                            }
                        } else {
                            // First time showing the prompt
                            setTimeout(() => {
                                setShowRatingModal(true);
                                setHasShownRating(true);
                            }, 2000);
                        }
                    }
                } catch (error) {
                    console.error('Error checking rating status:', error);
                }
            }

            requestAnimationFrame(() => {
                scrollToBottom();
            });

        } catch (error) {
            console.error('Error submitting answer:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to submit answer',
                position: 'bottom'
            });
        } finally {
            setIsAnswerLoading(false);
        }
    };

    const handleNext = () => {
        if (!selectedPaper) return;
        setSelectedAnswer(null);
        setShowFeedback(false);
        loadRandomQuestion(selectedPaper);
    };


    const handleRestart = async () => {
        if (!user?.uid || !subjectName) return;

        try {
            setIsLoading(true);


            // Log quiz restart
            logAnalyticsEvent('restart_quiz', {
                user_id: user.uid,
                subject_name: subjectName
            });

            await removeResults(user.uid, subjectName + " " + selectedPaper);

            setCurrentQuestion(null);
            setSelectedAnswer(null);
            setShowFeedback(false);
            setIsCorrect(null);
            setNoMoreQuestions(false);
            setIsRestartModalVisible(false);

            await loadRandomQuestion(selectedPaper || '');
            Toast.show({
                type: 'success',
                text1: 'Progress Reset',
                position: 'bottom'
            });
        } catch (error) {
            console.error('Error restarting quiz:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to restart quiz',
                position: 'bottom'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAIExplanation = async (questionId: number) => {
        setIsLoadingExplanation(true);
        try {
            const response = await fetch(
                `${ConfigAPI_BASE_URL}/public/learn/question/ai-explanation?question_id=${questionId}`
            );
            const data = await response.json();
            if (data.status === "OK") {
                let explanation = data.explanation
                    .replace(/\\n/g, '\\newline')
                    .replace(/\\\(/g, '$')
                    .replace(/\\\),/g, '$')
                    .replace(/\\\[/g, '$')
                    .replace(/\\\]/g, '$')
                    .replace(/\\\)\./g, '$')
                    .replace(/\\\)/g, '$')
                    .replace(/\\\\/g, '\\')
                    .replace(/\\text\{([^}]+)\}/g, '\\text{$1}')
                    .replace(/\[/g, '$')
                    .replace(/\]/g, '$')
                    .replace(/\\[\[\]]/g, '$')
                    // Remove newlines between $ signs to keep LaTeX on one line
                    .replace(/\$\s*\n\s*([^$]+)\s*\n\s*\$/g, '$ $1 $');

                setAiExplanation(explanation);
                setIsExplanationModalVisible(true);
            }
        } catch (error) {
            console.error('Error fetching AI explanation:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Could not load AI explanation',
            });
        } finally {
            setIsLoadingExplanation(false);
        }
    };

    const handleApproveQuestion = async () => {
        if (!currentQuestion?.id || !user?.uid || !user?.email || learnerRole !== 'admin') {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'You do not have permission to approve questions.',
                position: 'bottom'
            });
            return;
        }

        setIsApproving(true);
        try {
            await setQuestionStatus({
                question_id: currentQuestion.id,
                status: 'approved',
                email: user.email,
                uid: user.uid,
                comment: 'Question approved by admin'
            });
            Toast.show({
                type: 'success',
                text1: 'Question Approved',
                text2: 'The question has been approved successfully.',
                position: 'bottom'
            });
            await loadRandomQuestion(selectedPaper || '');
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to approve question.',
                position: 'bottom'
            });
        } finally {
            setIsApproving(false);
        }
    };

    const SubjectHeader = () => (
        <LinearGradient
            colors={isDark ? ['#4F46E5', '#4338CA'] : ['#10B981', '#047857']}
            style={styles.subjectHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
        >
            <View style={styles.headerContent}>
                <Image
                    source={getSubjectIcon(subjectName as string)}
                    style={styles.subjectheaderIcon}
                />
                <View style={styles.titleContainer}>
                    <ThemedText style={[styles.subjectTitle, { color: '#FFFFFF' }]}>{subjectName}</ThemedText>
                    <View style={styles.badgeContainer}>
                        {currentQuestion && (
                            <>
                                <View style={[styles.badge, {
                                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'
                                }]}>
                                    <ThemedText style={styles.badgeText}>{currentQuestion.year}</ThemedText>
                                </View>
                                <View style={[styles.badge, {
                                    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'
                                }]}>
                                    <ThemedText style={styles.badgeText}>Term {currentQuestion.term}</ThemedText>
                                </View>
                                {currentQuestion.curriculum && (
                                    <View style={[styles.badge, {
                                        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)'
                                    }]}>
                                        <ThemedText style={styles.badgeText}>{currentQuestion.curriculum}</ThemedText>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </View>
        </LinearGradient>
    );

    const PerformanceSummary = () => {
        if (!stats) return null;

        const progress = stats.total_answers === 0 ? 0 :
            Math.round((stats.correct_answers / stats.total_answers) * 100);

        return (
            <View style={[styles.performanceContainer, {
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                borderColor: colors.border,
                borderWidth: 1,
                shadowColor: isDark ? '#000000' : '#000000',
                shadowOpacity: isDark ? 0.3 : 0.1,
            }]}>
                <View style={styles.performanceHeader}>
                    <ThemedText style={[styles.performanceTitle, { color: colors.text }]}>Your Scoreboard! 🏆</ThemedText>
                    <TouchableOpacity
                        style={styles.restartIconButton}
                        onPress={() => {
                            setIsRestartModalVisible(true);
                        }}
                    >
                        <Ionicons name="refresh-circle" size={28} color={isDark ? '#FF3B30' : '#EF4444'} />
                    </TouchableOpacity>
                </View>
                <View style={styles.statsContainer}>
                    <View style={[styles.statItem, {
                        backgroundColor: isDark ? colors.surface : '#FFFFFF',
                        borderColor: colors.border,
                        borderWidth: 1,
                        shadowColor: isDark ? '#000000' : '#000000',
                        shadowOpacity: isDark ? 0.3 : 0.1,
                    }]}>
                        <View style={styles.statContent}>
                            <ThemedText style={styles.statIcon}>🎯</ThemedText>
                            <View style={styles.statTextContainer}>
                                <ThemedText style={[styles.statCount, { color: colors.text }]}>{stats?.correct_answers || 0}</ThemedText>
                                <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>Bullseyes</ThemedText>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.statItem, {
                        backgroundColor: isDark ? colors.surface : '#FFFFFF',
                        borderColor: colors.border,
                        borderWidth: 1,
                        shadowColor: isDark ? '#000000' : '#000000',
                        shadowOpacity: isDark ? 0.3 : 0.1,
                    }]}>
                        <View style={styles.statContent}>
                            <ThemedText style={styles.statIcon}>💥</ThemedText>
                            <View style={styles.statTextContainer}>
                                <ThemedText style={[styles.statCount, { color: colors.text }]}>{stats?.incorrect_answers || 0}</ThemedText>
                                <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>Oopsies</ThemedText>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={[styles.progressBarContainer, {
                    backgroundColor: isDark ? colors.border : '#E2E8F0',
                    marginHorizontal: 16,
                    marginTop: 16,
                    marginBottom: 8
                }]}>
                    <View
                        style={[
                            styles.progressBar,
                            {
                                width: `${progress}%`,
                                backgroundColor: getProgressBarColor(progress)
                            }
                        ]}
                    />
                </View>
                <ThemedText style={[styles.masteryText, {
                    color: colors.textSecondary,
                    marginHorizontal: 16,
                    marginBottom: 8
                }]}>
                    {progress}% GOAT 🐐
                </ThemedText>
            </View>
        );
    };

    // Add this function to handle rating
    const handleRating = async () => {
        if (await StoreReview.hasAction()) {
            await StoreReview.requestReview();
        } else {
            // Fallback to store URLs if StoreReview is not available
            const storeUrl = Platform.select({
                ios: 'https://apps.apple.com/app/6742684696',
                android: 'https://play.google.com/store/apps/details?id=za.co.examquizafrica',
            });
            if (storeUrl) {
                await Linking.openURL(storeUrl);
            }
        }
        setShowRatingModal(false);
        // Store that user has reviewed
        await SecureStore.setItemAsync('has_reviewed_app', 'true');
    };

    // Add this function to handle postponing the rating
    const handlePostponeRating = async () => {
        setShowRatingModal(false);
        // Store the current date for next prompt
        const nextPromptDate = new Date();
        nextPromptDate.setDate(nextPromptDate.getDate() + 10); // Add 10 days
        await SecureStore.setItemAsync('next_rating_prompt_date', nextPromptDate.toISOString());
    };

    if (isLoading) {
        return (
            <ThemedView style={[styles.loadingContainer, { backgroundColor: isDark ? '#121212' : '#FFFFFF' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</ThemedText>
            </ThemedView>
        );
    }

    if (!selectedPaper) {
        return (
            <LinearGradient
                colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
                style={[styles.gradient, { paddingTop: insets.top }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={styles.paperSelectionContainer}>
                    <TouchableOpacity
                        style={[styles.closeHeaderButton, {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                        }]}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Image
                        source={getSubjectIcon(subjectName as string)}
                        style={styles.subjectIcon}
                    />
                    <ThemedText style={[styles.subjectTitle, { color: colors.text }]}>{subjectName}</ThemedText>
                    <ThemedText style={[styles.paperSelectionText, { color: colors.textSecondary }]}>Select a paper to continue</ThemedText>

                    <View style={styles.paperButtons}>
                        <LinearGradient
                            colors={isDark ? ['#7C3AED', '#4F46E5'] : ['#9333EA', '#4F46E5']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.paperButton}
                        >
                            <TouchableOpacity
                                style={styles.buttonContent}
                                onPress={() => {
                                    setSelectedPaper('P1');
                                    loadRandomQuestion('P1');
                                }}
                            >
                                <ThemedText style={styles.paperButtonText}>Paper 1</ThemedText>
                            </TouchableOpacity>
                        </LinearGradient>

                        <LinearGradient
                            colors={isDark ? ['#EA580C', '#C2410C'] : ['#F59E0B', '#F97316']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.paperButton}
                        >
                            <TouchableOpacity
                                style={styles.buttonContent}
                                onPress={() => {
                                    setSelectedPaper('P2');
                                    loadRandomQuestion('P2');
                                }}
                            >
                                <ThemedText style={styles.paperButtonText}>Paper 2</ThemedText>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                </View>
            </LinearGradient>
        );
    }

    if (!currentQuestion) {
        return (
            <LinearGradient
                colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
                style={[styles.gradient, { paddingTop: insets.top }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <ScrollView style={styles.container}>
                    <ThemedView style={[styles.noQuestionsContainer, {
                        backgroundColor: isDark ? colors.card : '#FFFFFF'
                    }]}>
                        <Image
                            source={NO_QUESTIONS_ILLUSTRATION}
                            style={styles.noQuestionsIllustration}
                            resizeMode="contain"
                        />
                        <ThemedText style={[styles.noQuestionsTitle, { color: colors.text }]}>
                            🐛 Oops! Looks like the quiz gremlins ate all the questions!
                        </ThemedText>
                        <ThemedText style={[styles.noQuestionsSubtitle, { color: colors.textSecondary }]}>
                            Check your profile for selected school terms and curriculum
                        </ThemedText>

                        <TouchableOpacity
                            style={[styles.profileSettingsButton, {
                                backgroundColor: isDark ? colors.primary : '#4F46E5'
                            }]}
                            onPress={() => router.push('/(tabs)/profile')}
                        >
                            <View style={styles.buttonContent}>
                                <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
                                <ThemedText style={styles.buttonText}>Go to Profile Settings</ThemedText>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.buttonGroup}>
                            <TouchableOpacity
                                style={[styles.restartButton, {
                                    backgroundColor: isDark ? '#DC2626' : '#EF4444'
                                }]}
                                onPress={() => {
                                    setIsRestartModalVisible(true);
                                }}
                            >
                                <View style={styles.buttonContent}>
                                    <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                                    <ThemedText style={styles.buttonText}>Restart Subject</ThemedText>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.goHomeButton, {
                                    backgroundColor: isDark ? colors.surface : '#64748B'
                                }]}
                                onPress={() => router.replace('/(tabs)')}
                            >
                                <View style={styles.buttonContent}>
                                    <Ionicons name="home-outline" size={20} color="#FFFFFF" />
                                    <ThemedText style={styles.buttonText}>Go Home</ThemedText>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </ThemedView>
                </ScrollView>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient
            colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
            style={[styles.gradient, { paddingTop: insets.top }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <ScrollView style={styles.container} ref={scrollViewRef}>
                <SubjectHeader />
                <PerformanceSummary />
                <ThemedView style={styles.content}>
                    <ThemedView style={[styles.sectionCard, {
                        backgroundColor: isDark ? colors.card : '#FFFFFF',
                        borderColor: colors.border
                    }]}>

                        {(currentQuestion.context || currentQuestion.image_path) && (
                            <ThemedText style={styles.questionMeta} testID='question-meta'>
                                Context
                            </ThemedText>
                        )}

                        {currentQuestion.context && (
                            <View style={styles.questionContainer} testID='question-context'>
                                {renderMixedContent(currentQuestion.context, isDark, colors)}
                            </View>
                        )}

                        {(currentQuestion.image_path || currentQuestion.question_image_path) && (
                            <ThemedText style={[styles.imageCaption, { color: colors.textSecondary }]}>
                                Click image to enlarge
                            </ThemedText>
                        )}

                        {currentQuestion.image_path && (
                            <View style={styles.imageWrapper}>
                                <TouchableOpacity
                                    style={styles.touchableImage}
                                    onPress={() => {
                                        setZoomImageUrl(currentQuestion.image_path);
                                        setIsZoomModalVisible(true);
                                    }}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    testID='question-context-image-container'
                                >
                                    {isImageLoading && <ImageLoadingPlaceholder />}
                                    <Image
                                        source={{
                                            uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${currentQuestion.image_path}`
                                        }}
                                        style={styles.questionImage}
                                        resizeMode="contain"
                                        onLoadStart={() => setIsImageLoading(true)}
                                        onLoadEnd={() => setIsImageLoading(false)}
                                        testID='question-context-image'
                                    />
                                </TouchableOpacity>
                            </View>
                        )}

                        {(currentQuestion.question || currentQuestion.question_image_path) && (
                            <ThemedText style={styles.questionMeta} testID='question-meta'>
                                Question
                            </ThemedText>
                        )}

                        {currentQuestion.question_image_path && (
                            <View style={styles.imageWrapper}>
                                <TouchableOpacity
                                    style={styles.touchableImage}
                                    onPress={() => {
                                        setZoomImageUrl(currentQuestion.question_image_path);
                                        setIsZoomModalVisible(true);
                                    }}
                                    activeOpacity={0.7}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    testID='question-additional-image-container'
                                >
                                    <Image
                                        source={{
                                            uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${currentQuestion.question_image_path}`
                                        }}
                                        style={[styles.questionImage, { opacity: isImageLoading ? 0 : 1 }]}
                                        resizeMode="contain"
                                        onLoadStart={() => setIsImageLoading(true)}
                                        onLoadEnd={() => setIsImageLoading(false)}
                                        testID='question-image'
                                    />
                                    {isImageLoading && <ImageLoadingPlaceholder />}
                                </TouchableOpacity>
                            </View>
                        )}



                        {currentQuestion.question && (
                            <View style={styles.questionContainer} testID='question-text'>
                                {renderMixedContent(currentQuestion.question, isDark, colors)}
                            </View>
                        )}

                        <View>
                            <ThemedText style={[styles.hintText, { color: colors.textSecondary }]}>
                                Tap to select your answer
                            </ThemedText>
                        </View>

                        {currentQuestion.type === 'multiple_choice' && (
                            <>
                                <ThemedView style={styles.optionsContainer}>
                                    {Object.entries(currentQuestion.options)
                                        .filter(([_, value]) => value)
                                        .map(([key, value]) => (
                                            <TouchableOpacity
                                                key={key}
                                                style={[
                                                    styles.option,
                                                    {
                                                        backgroundColor: isDark ? colors.surface : '#FFFFFF',
                                                        borderColor: colors.border
                                                    },
                                                    selectedAnswer === value && [
                                                        styles.selectedOption,
                                                        { backgroundColor: isDark ? colors.primary + '20' : '#00000020' }
                                                    ],
                                                    showFeedback && selectedAnswer === value && (
                                                        JSON.parse(currentQuestion.answer).includes(value)
                                                            ? [styles.correctOption, { borderColor: '#22C55E' }]
                                                            : [styles.wrongOption, { borderColor: '#FF3B30' }]
                                                    )
                                                ]}
                                                onPress={() => handleAnswer(value)}
                                                disabled={showFeedback || isAnswerLoading}
                                            >
                                                {isAnswerLoading && selectedAnswer === value ? (
                                                    <View style={styles.optionLoadingContainer}>
                                                        <ActivityIndicator size="small" color={colors.primary} />
                                                    </View>
                                                ) : (
                                                    cleanAnswer(value).includes('$') ? (
                                                        <KaTeX
                                                            latex={cleanAnswer(value).replace(/\$/g, '')}
                                                            isOption={true}
                                                        />
                                                    ) : (
                                                        <ThemedText style={[styles.optionText, { color: colors.text }]}>
                                                            {value}
                                                        </ThemedText>
                                                    )
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                </ThemedView>

                                <TouchableOpacity
                                    style={[styles.reportButton, {
                                        marginTop: 16,
                                        marginHorizontal: 16,
                                        backgroundColor: isDark ? colors.surface : '#FEE2E2'
                                    }]}
                                    onPress={reportIssue}
                                    testID='report-issue-button'
                                >
                                    <ThemedText style={[styles.reportButtonText, { color: isDark ? '#FF3B30' : '#DC2626' }]}>
                                        🛑 Report an Issue with this Question
                                    </ThemedText>
                                </TouchableOpacity>
                            </>
                        )}
                        {showFeedback && (
                            <ThemedView style={styles.feedbackContainer}>
                                <ThemedText style={[styles.feedbackEmoji, { color: colors.text }]} testID='feedback-emoji'>
                                    {feedbackMessage}
                                </ThemedText>

                                <ThemedView style={[styles.correctAnswerContainer, {
                                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                                    borderColor: '#22C55E'
                                }]}>
                                    <ThemedText style={[styles.correctAnswerLabel, { color: colors.textSecondary }]} testID='correct-answer-label'>
                                        ✅ Right Answer!
                                    </ThemedText>
                                    {cleanAnswer(currentQuestion.answer).includes('$') ? (
                                        <KaTeX latex={cleanAnswer(currentQuestion.answer).replace(/\$/g, '')} />
                                    ) : (
                                        <ThemedText style={[styles.correctAnswerText, { color: isDark ? '#4ADE80' : '#166534' }]} testID='correct-answer-text'>
                                            {cleanAnswer(currentQuestion.answer)}
                                        </ThemedText>
                                    )}
                                    {currentQuestion.explanation && (
                                        <View style={styles.questionContainer} testID='explanation-container'>
                                            {renderMixedContent(cleanAnswer(currentQuestion.explanation), isDark, colors)}
                                        </View>
                                    )}
                                </ThemedView>

                                {/* Question approval button - only show for admin users */}
                                {learnerRole === 'admin' && showFeedback && currentQuestion && (
                                    <TouchableOpacity
                                        style={[styles.approveButton, isApproving && styles.approveButtonDisabled]}
                                        onPress={handleApproveQuestion}
                                        disabled={isApproving}
                                    >
                                        <ThemedText style={styles.approveButtonText}>
                                            {isApproving ? 'Approving...' : 'Question looks good'}
                                        </ThemedText>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={[styles.aiExplanationButton, {
                                        backgroundColor: isDark ? '#4338CA' : '#4F46E5'
                                    }]}
                                    onPress={() => {
                                        fetchAIExplanation(currentQuestion?.id || 0)
                                    }}
                                    disabled={isLoadingExplanation}
                                >
                                    <ThemedText style={styles.aiExplanationButtonText}>
                                        {isLoadingExplanation ? (
                                            <View style={styles.loaderContainer}>
                                                <ThemedText style={styles.aiExplanationButtonText}>
                                                    🤖 Pretending to think...
                                                </ThemedText>
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            </View>
                                        ) : (
                                            '🤖 Break it Down for Me!'
                                        )}
                                    </ThemedText>
                                </TouchableOpacity>
                            </ThemedView>
                        )}

                    </ThemedView>
                </ThemedView>
            </ScrollView>

            <ThemedView style={[styles.footer, {
                backgroundColor: isDark ? colors.card : '#FFFFFF'
            }]}>
                <LinearGradient
                    colors={isDark ? ['#7C3AED', '#4F46E5'] : ['#9333EA', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.footerButton}
                >
                    <TouchableOpacity
                        style={styles.buttonContent}
                        onPress={handleNext}
                    >
                        <Ionicons name="play" size={20} color="#FFFFFF" />
                        <ThemedText style={styles.footerButtonText}>🎯 Keep Going!</ThemedText>
                    </TouchableOpacity>
                </LinearGradient>

                <LinearGradient
                    colors={isDark ? ['#EA580C', '#C2410C'] : ['#F59E0B', '#F97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.footerButton}
                >
                    <TouchableOpacity
                        style={styles.buttonContent}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="cafe" size={20} color="#FFFFFF" />
                        <ThemedText style={styles.footerButtonText}>Chill Time!</ThemedText>
                    </TouchableOpacity>
                </LinearGradient>
            </ThemedView>

            <Modal
                isVisible={isReportModalVisible}
                onBackdropPress={() => setIsReportModalVisible(false)}
                onSwipeComplete={() => setIsReportModalVisible(false)}
                swipeDirection={['down']}
                useNativeDriver={true}
                style={[styles.modal, { marginTop: insets.top }]}
            >
                <View style={[styles.reportModalContent, {
                    backgroundColor: isDark ? colors.card : '#FFFFFF'
                }]}>
                    <ThemedText style={[styles.reportModalTitle, { color: colors.text }]}>Report Issue</ThemedText>
                    <TextInput
                        style={[styles.reportInput, {
                            backgroundColor: isDark ? colors.surface : '#F8FAFC',
                            borderColor: colors.border,
                            color: colors.text
                        }]}
                        placeholder="Describe the issue..."
                        placeholderTextColor={isDark ? '#666666' : '#64748B'}
                        value={reportComment}
                        onChangeText={setReportComment}
                        onSubmitEditing={handleSubmitReport}
                        maxLength={200}
                    />
                    <View style={styles.reportModalButtons}>
                        <TouchableOpacity
                            style={[styles.reportModalButton, styles.cancelButton, {
                                backgroundColor: isDark ? colors.surface : '#E2E8F0'
                            }]}
                            onPress={() => setIsReportModalVisible(false)}
                        >
                            <ThemedText style={[styles.buttonText, { color: colors.text }]}>Cancel</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.reportModalButton, styles.submitButton, {
                                backgroundColor: colors.primary
                            }]}
                            onPress={handleSubmitReport}
                            disabled={isSubmitting}
                        >
                            <ThemedText style={[styles.buttonText, { color: '#FFFFFF' }]}>
                                {isSubmitting ? 'Submitting...' : 'Submit'}
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                isVisible={isExplanationModalVisible}
                onBackdropPress={() => setIsExplanationModalVisible(false)}
                style={styles.modal}
            >
                <View style={[styles.explanationModal, {
                    backgroundColor: isDark ? colors.card : '#FFFFFF'
                }]}>
                    <View style={styles.explanationHeader}>
                        <ThemedText style={[styles.explanationTitle, { color: colors.text }]}>
                            🔬 AI Science Scoop! 🤖✨
                        </ThemedText>
                        <TouchableOpacity
                            onPress={() => setIsExplanationModalVisible(false)}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={24} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.explanationContent}>
                        {aiExplanation.split('\n').map((line, index) => {
                            const trimmedLine = line.trim();
                            if (trimmedLine.startsWith('-')) {
                                const content = trimmedLine.substring(1).trim();
                                const indentLevel = line.indexOf('-') / 2;

                                return (
                                    <View
                                        key={index}
                                        style={[
                                            styles.explanationLine,
                                            { marginLeft: indentLevel * 20 }
                                        ]}
                                    >
                                        <ThemedText style={styles.bulletPoint}>✅</ThemedText>
                                        <View style={styles.explanationTextContainer}>
                                            {renderMixedContent(content, isDark, colors)}
                                        </View>
                                    </View>
                                );
                            }
                            return (
                                <View key={index} style={styles.explanationTextContainer}>
                                    {renderMixedContent(line, isDark, colors)}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </Modal>

            <Modal
                isVisible={isZoomModalVisible}
                onBackdropPress={() => setIsZoomModalVisible(false)}
                onSwipeComplete={() => setIsZoomModalVisible(false)}
                swipeDirection={['down']}
                useNativeDriver={true}
                style={styles.zoomModal}
                animationIn="fadeIn"
                animationOut="fadeOut"
                backdropOpacity={1}
                statusBarTranslucent
            >
                <View style={styles.zoomModalContent}>
                    <TouchableOpacity
                        style={styles.zoomCloseButton}
                        onPress={() => setIsZoomModalVisible(false)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={28} color="#FFFFFF" />
                    </TouchableOpacity>
                    {zoomImageUrl && (
                        <ZoomableImageNew imageUrl={zoomImageUrl} />
                    )}
                </View>
            </Modal>

            <Modal
                isVisible={isRestartModalVisible}
                onBackdropPress={() => setIsRestartModalVisible(false)}
                onSwipeComplete={() => setIsRestartModalVisible(false)}
                swipeDirection={['down']}
                useNativeDriver={true}
                style={styles.modal}
                animationIn="fadeIn"
                animationOut="fadeOut"
                backdropOpacity={0.5}
            >
                <View style={[styles.restartModalContent, {
                    backgroundColor: isDark ? colors.card : '#FFFFFF'
                }]}>
                    <ThemedText style={[styles.restartModalTitle, { color: colors.text }]}>Reset Progress</ThemedText>
                    <ThemedText style={[styles.restartModalText, { color: colors.textSecondary }]}>
                        Are you sure you want to reset your progress for this paper? This action cannot be undone.
                    </ThemedText>
                    <View style={styles.restartModalButtons}>
                        <TouchableOpacity
                            style={[styles.restartModalButton, styles.cancelButton, {
                                backgroundColor: isDark ? colors.surface : '#E2E8F0'
                            }]}
                            onPress={() => setIsRestartModalVisible(false)}
                        >
                            <ThemedText style={[styles.buttonText, { color: colors.text }]}>Cancel</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.restartModalButton, styles.resetButton]}
                            onPress={handleRestart}
                        >
                            <ThemedText style={[styles.buttonText, { color: '#FFFFFF' }]}>Reset</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                isVisible={showRatingModal}
                onBackdropPress={handlePostponeRating}
                style={styles.modal}
                animationIn="fadeIn"
                animationOut="fadeOut"
            >
                <View style={[styles.ratingModalContent, {
                    backgroundColor: isDark ? colors.card : '#FFFFFF'
                }]}>
                    <ThemedText style={[styles.ratingTitle, { color: colors.text }]}>Loving Exam Quiz? 🎉✨</ThemedText>
                    <ThemedText style={[styles.ratingText, { color: colors.textSecondary }]}>
                        Hey superstar! 🌟 Your opinion matters! Give us a quick rating and help make Exam Quiz even more awesome! 🚀💡
                    </ThemedText>
                    <View style={styles.ratingButtons}>
                        <TouchableOpacity
                            style={[styles.ratingButton, styles.ratingSecondaryButton, {
                                backgroundColor: isDark ? colors.surface : '#E2E8F0'
                            }]}
                            onPress={handlePostponeRating}
                        >
                            <ThemedText style={[styles.ratingSecondaryButtonText, { color: colors.text }]}>Maybe Later</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.ratingButton, styles.ratingPrimaryButton, {
                                backgroundColor: isDark ? colors.primary : '#8B5CF6'
                            }]}
                            onPress={handleRating}
                        >
                            <ThemedText style={styles.ratingPrimaryButtonText}>Rate Now!</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}

// Add helper function to get subject icons
function getSubjectIcon(subjectName: string) {
    const icons = {
        'Agricultural Sciences': require('@/assets/images/subjects/agriculture.png'),
        'Economics': require('@/assets/images/subjects/economics.png'),
        'Business Studies': require('@/assets/images/subjects/business-studies.png'),
        'Geography': require('@/assets/images/subjects/geography.png'),
        'Life Sciences': require('@/assets/images/subjects/life-science.png'),
        'mathematics': require('@/assets/images/subjects/mathematics.png'),
        'Physical Sciences': require('@/assets/images/subjects/physics.png'),
        'Mathematical Literacy': require('@/assets/images/subjects/maths.png'),
        'History': require('@/assets/images/subjects/history.png'),
        'default': require('@/assets/images/subjects/mathematics.png')
    };
    return icons[subjectName as keyof typeof icons] || icons.default;
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    scoreSection: {
        flexDirection: 'row',
        gap: 24,
    },
    scoreItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    scoreEmoji: {
        fontSize: 20,
    },
    scoreValue: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '600',
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF9F43',
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
    },
    toggleLabel: {
        color: '#000000',
        marginRight: 8,
        fontSize: 14,

    },
    subjectHeader: {
        padding: 24,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        marginBottom: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 12,
        borderRadius: 9999,
    },
    titleContainer: {
        gap: 4,
    },
    subjectTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000',
    },
    badgeContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    badge: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 14,
    },
    content: {
        gap: 20,
        backgroundColor: 'transparent',
        padding: 16,
    },
    sectionCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#444',
    },
    footer: {
        flexDirection: 'row',
        gap: 16,
        padding: 16,
        paddingBottom: 24,
        backgroundColor: '#FFFFFF',
    },
    footerButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
    },
    footerButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    progressBarContainer: {
        height: 4,
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
    questionContainer: {
        borderRadius: 12,
        padding: 16,
        margin: 16,
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        color: '#000000',
    },
    questionText: {
        fontSize: 16,
        color: '#1E293B',
        lineHeight: 24,
        fontWeight: '500',
    },
    optionsContainer: {
        gap: 12,
        marginTop: 20,
        borderColor: '#000000',
    },
    option: {
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#444',
        width: '100%',
    },
    selectedOption: {
        backgroundColor: '#00000020',
        borderColor: '#000000',
    },
    correctOption: {
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderColor: '#22C55E',
    },
    wrongOption: {
        backgroundColor: 'rgba(255, 59, 48, 0.2)',
        borderColor: '#FF3B30',
    },
    optionText: {
        fontSize: 16,
        color: '#1E293B',
    },
    nextButton: {
        backgroundColor: 'rgba(130, 122, 122, 0.2)'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        color: '#000000',
    },
    contextText: {
        fontSize: 14,
        marginBottom: 16,
        color: '#000000',
        lineHeight: 20,
    },
    questionImage: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 3,
    },
    singleAnswerContainer: {
        gap: 16,
        marginBottom: 20,
    },
    answerInput: {
        backgroundColor: '#333',
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        height: 48,
        color: '#000000',
    },
    submitButton: {
        backgroundColor: '#000000',
        marginTop: 8,
    },
    feedbackEmoji: {
        fontSize: 22,
        textAlign: 'center',
        marginVertical: 16,
        includeFontPadding: false,
        lineHeight: 60,
    },
    noQuestionsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#FFFFFF',
    },
    noQuestionsIllustration: {
        width: 280,
        height: 280,
        marginBottom: 32,
    },
    noQuestionsTitle: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 16,
        color: '#1E293B',
        lineHeight: 32,
        paddingHorizontal: 20,
    },
    noQuestionsSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 32,
        color: '#64748B',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    profileSettingsButton: {
        backgroundColor: '#4F46E5',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        width: '100%',
        marginBottom: 24,
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    restartButton: {
        flex: 1,
        backgroundColor: '#EF4444',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    goHomeButton: {
        flex: 1,
        backgroundColor: '#64748B',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    modal: {
        justifyContent: 'center',
        margin: 0,
    },
    modalContent: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: '100%',
        height: '90%',
        resizeMode: 'contain',
    },
    closeButton: {
        padding: 8,
    },
    feedbackContainer: {
        borderRadius: 12,
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    correctAnswerContainer: {
        backgroundColor: '#FFFFFF',
        borderColor: '#22C55E',
        borderRadius: 8,
        marginTop: 12,

        padding: 12,
    },
    correctAnswerLabel: {
        fontSize: 14,
        color: '#999',
        marginBottom: 4,
        marginLeft: 16,
    },
    correctAnswerText: {
        color: '#166534',
        marginLeft: 16,

    },
    answerImage: {
        width: '100%',
        height: 200,
        marginTop: 8,
        borderRadius: 8,
    },
    imageWrapper: {
        width: '100%',
        height: 200,
        marginVertical: 10,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#F8FAFC',
        position: 'relative',
        zIndex: 1
    },
    touchableImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        zIndex: 2
    },
    imagePlaceholderContainer: {
        width: '100%',
        height: 200,
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'absolute',
        zIndex: 4,
        justifyContent: 'center',
        alignItems: 'center'
    },
    imagePlaceholderContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        color: '#6B7280',
        fontSize: 14,
        fontWeight: '500',
    },
    completionButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginTop: 24,
    },
    imageCaption: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        fontStyle: 'italic'
    },

    contentText: {
        fontSize: 16,
        lineHeight: 24,
        marginVertical: 4,
        color: '#000000',
    },
    reportButton: {
        backgroundColor: '#FEE2E2',
        padding: 8,
        borderRadius: 8,
        flex: 1,
    },
    reportButtonText: {
        color: '#DC2626',
        fontSize: 14,
        fontWeight: '500',
    },
    paperSelectionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    paperSelectionText: {
        color: '#999',
        fontSize: 16,
        marginTop: 8,
        marginBottom: 32,
    },
    paperButtons: {
        flexDirection: 'row',
        gap: 16,
    },
    paperButton: {
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        width: 175,
    },
    paperButtonGradient: {
        padding: 16,
        alignItems: 'center',
    },
    paperButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    subjectIcon: {
        width: 240,
        height: 240,
        marginBottom: 16,
    },

    subjectheaderIcon: {
        width: 48,
        height: 48,
        marginBottom: 16,
    },

    zoomControls: {
        position: 'absolute',
        bottom: 40,
        right: 20,
        flexDirection: 'row',
        gap: 8,
        zIndex: 1,
    },
    zoomButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
    },
    zoomButtonText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: 'bold',
    },
    optionContent: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        color: '#000000',
    },
    latexOptionContainer: {
        width: '100%',
        flexWrap: 'wrap',
        color: '#000000',
    },
    latexContainer: {
        width: '100%',
        marginVertical: 4,
        backgroundColor: '#FFFFFF',
        color: '#000000',
    },
    mixedContentContainer: {
        width: '100%',
        gap: 12,
        color: '#000000',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reportModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxWidth: 400,
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    reportModalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 16,
    },
    reportInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        padding: 12,
        color: '#1E293B',
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    reportModalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
    },
    reportModalButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        minWidth: 80,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#E2E8F0',
    },

    performanceContainer: {
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    performanceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    performanceTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
    },
    statItem: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    statContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statIcon: {
        fontSize: 24,
    },
    statTextContainer: {
        flex: 1,
    },
    statCount: {
        fontSize: 20,
        fontWeight: '700',
    },
    statLabel: {
        fontSize: 12,
    },
    masteryText: {
        fontSize: 12,
        textAlign: 'right',
    },
    closeHeaderButton: {
        position: 'absolute',
        right: 16,
        top: 16,
        padding: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 20,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    aiExplanationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4338CA',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginTop: 16,
        gap: 8,
    },
    aiExplanationButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    aiExplanationBugText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '500',
        marginTop: 8,
    },
    explanationModal: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '80%',
        width: '100%',
    },
    explanationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        zIndex: 1,
    },
    explanationTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1E293B',
    },
    explanationContent: {
        maxHeight: '100%',
        paddingHorizontal: 8,
        width: '100%',
    },
    explanationLine: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        paddingRight: 8,
        width: '100%',
    },
    bulletPoint: {
        fontSize: 16,
        marginRight: 8,
        marginTop: 4,
    },
    explanationTextContainer: {
        flex: 1,
        paddingRight: 4,
        width: '100%',
    },
    explanationText: {
        fontSize: 16,
        lineHeight: 28,
        color: '#1E293B',
        paddingVertical: 20,
        width: '100%',
    },
    questionMeta: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 8,
        fontWeight: '500'
    },
    loaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    hintText: {
        fontSize: 12,
        color: '#64748B',
        fontStyle: 'italic',
        marginBottom: 8,
    },
    optionLoadingContainer: {
        minHeight: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    approveButton: {
        backgroundColor: '#4F46E5',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 16,
        alignItems: 'center',
    },
    approveButtonDisabled: {
        opacity: 0.5,
    },
    approveButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    zoomModal: {
        margin: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoomModalContent: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    zoomCloseButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    restartModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    restartModalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 12,
    },
    restartModalText: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 24,
        lineHeight: 24,
    },
    restartModalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    restartModalButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        minWidth: 80,
        alignItems: 'center',
    },
    resetButton: {
        backgroundColor: '#EF4444',
    },
    restartIconButton: {
        padding: 8,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ratingModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    ratingTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'center',
        marginBottom: 16,
    },
    ratingText: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    ratingButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    ratingButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    ratingPrimaryButton: {
        backgroundColor: '#8B5CF6',
    },
    ratingSecondaryButton: {
        backgroundColor: '#E2E8F0',
    },
    ratingPrimaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    ratingSecondaryButtonText: {
        color: '#1E293B',
        fontSize: 16,
        fontWeight: '600',
    },
});

function getProgressBarColor(progress: number): string {
    if (progress >= 80) return '#22C55E'; // Green
    if (progress >= 60) return '#3B82F6'; // Blue
    if (progress >= 40) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
} 