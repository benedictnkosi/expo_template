import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, Image, TextInput, ScrollView, View, Linking, Switch } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Modal from 'react-native-modal';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import WebView from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Audio } from 'expo-av';

import { ThemedView } from '../components/ThemedView';
import { ThemedText } from '../components/ThemedText';
import { checkAnswer, removeResults, trackStreak, getSubjectStats, setQuestionStatus } from '../services/api';
import { API_BASE_URL as ConfigAPI_BASE_URL } from '../config/api';
import { trackEvent, Events } from '../services/mixpanel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
                        color: '#000000',
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
function renderMixedContent(text: string) {
    const parts = text.split(/(\$[^$]+\$)/g);
    return (
        <View style={styles.mixedContentContainer}>
            {parts.map((part, index) => {
                if (part.startsWith('$') && part.endsWith('$')) {
                    // LaTeX content
                    return (
                        <View key={index} style={styles.latexContainer}>
                            <KaTeX
                                latex={part.slice(1, -1)} // Remove $ signs
                            />
                        </View>
                    );
                }
                // Regular text (only if not empty)
                if (part.trim()) {
                    return (
                        <ThemedText key={index} style={styles.contentText}>
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

interface ZoomableImageProps {
    imageUrl: string;
    zoomLevel: number;
    onZoomChange: (value: number) => void;
}

const ImageLoadingPlaceholder = () => (
    <View style={styles.imagePlaceholderContainer}>
        <View style={styles.imagePlaceholderContent}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <ThemedText style={styles.loadingText}>Loading image...</ThemedText>
        </View>
    </View>
);

export default function QuizScreen() {
    const { subjectName } = useLocalSearchParams();
    const [question, setQuestion] = useState<Question | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [inputAnswer, setInputAnswer] = useState('');
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [noMoreQuestions, setNoMoreQuestions] = useState(false);
    const [learnerInfo, setLearnerInfo] = useState<{ name: string; grade: string } | null>(null);
    const [isImageVisible, setIsImageVisible] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(true);
    const [isAnswerImageVisible, setIsAnswerImageVisible] = useState(false);
    const [isAnswerImageLoading, setIsAnswerImageLoading] = useState(true);
    const scrollViewRef = React.useRef<ScrollView>(null);
    const [showAllTerms, setShowAllTerms] = useState(true);
    const [subjectId, setSubjectId] = useState<string | null>(null);
    const [selectedPaper, setSelectedPaper] = useState<string | null>(null);
    const [stats, setStats] = useState<SubjectStats['data']['stats'] | null>(null);
    const [zoomLevel, setZoomLevel] = useState(0.5);
    const [user, setUser] = useState<{ uid: string; email: string } | null>(null);
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

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({
                animated: true
            });
        }, 500);
    };

    useEffect(() => {
        async function loadUser() {
            try {
                const authData = await SecureStore.getItemAsync('auth');
                if (authData) {
                    const parsed = JSON.parse(authData);
                    const idToken = parsed.authentication.idToken;
                    const tokenParts = idToken.split('.');
                    const tokenPayload = JSON.parse(atob(tokenParts[1]));
                    const uid = tokenPayload.sub;

                    setUser({
                        uid,
                        email: parsed.userInfo.email
                    });

                    if (selectedPaper) {
                        loadRandomQuestion(selectedPaper);
                    }
                }
            } catch (error) {
                console.error('Error loading user:', error);
            }
        }
        loadUser();
    }, [selectedPaper]);

    useEffect(() => {
        async function loadSounds() {
            const { sound: correct } = await Audio.Sound.createAsync(
                require('@/assets/audio/correct_answer.mp3')
            );
            const { sound: incorrect } = await Audio.Sound.createAsync(
                require('@/assets/audio/bad_answer.mp3')
            );
            correctSound.current = correct;
            incorrectSound.current = incorrect;
        }
        loadSounds();

        return () => {
            correctSound.current?.unloadAsync();
            incorrectSound.current?.unloadAsync();
        };
    }, []);

    const reportIssue = (questionId: number) => {
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
                question_id: question?.id || 0,
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
        setInputAnswer('');
        setIsCorrect(null);

        try {
            setIsLoading(true); const response = await fetch(
                `${ConfigAPI_BASE_URL}/public/learn/question/byname?subject_name=${subjectName}&paper_name=${paper}&uid=${user.uid}&question_id=0${showAllTerms ? '&show_all_questions=yes' : '&show_all_questions=no'}`
            );
            if (!response.ok) {
                throw new Error('Failed to fetch question');
            }

            const data: QuestionResponse = await response.json();

            if (data.status === "NOK" && data.message === "No more questions available") {
                setNoMoreQuestions(true);
                setQuestion(null);
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
                setQuestion(data);
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
        if (!user?.uid || !question) return;

        setIsAnswerLoading(true);
        try {
            const response = await checkAnswer(user.uid, question.id, answer);
            setSelectedAnswer(answer);
            setShowFeedback(true);
            setIsCorrect(response.is_correct);
            setFeedbackMessage(response.is_correct ? getRandomSuccessMessage() : getRandomWrongMessage());

            if (response.is_correct) {
                await correctSound.current?.replayAsync();
                trackStreak(user.uid);
            } else {
                await incorrectSound.current?.replayAsync();
            }

            trackEvent(Events.SUBMIT_ANSWER, {
                "user_id": user?.uid,
                "subject_id": subjectId,
                "question_id": question.id,
                "is_correct": response.is_correct
            });

            requestAnimationFrame(() => {
                scrollToBottom();
            });

        } catch (error) {
            console.error('Failed to check answer:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to check answer',
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
        setInputAnswer('');
        loadRandomQuestion(selectedPaper);
    };


    const handleRestart = async () => {
        if (!user?.uid || !subjectName) return;

        trackEvent(Events.RESTART_QUIZ, {
            "user_id": user?.uid,
            "subject_name": subjectName
        });
        try {
            setIsLoading(true);
            await removeResults(user.uid, subjectName as string);
            await loadRandomQuestion(selectedPaper || '');
            Toast.show({
                type: 'success',
                text1: 'Progress Reset',
                position: 'bottom'
            });
        } catch (error) {
            console.error('Failed to restart:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to reset progress',
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
        if (!question?.id || !user?.uid || !user?.email) return;

        setIsApproving(true);
        try {
            await setQuestionStatus({
                question_id: question.id,
                status: 'approved',
                email: user.email,
                uid: user.uid,
                comment: 'Question approved by admin'
            });

            Toast.show({
                type: 'success',
                text1: 'Question Approved',
                text2: 'Thank you for your feedback!',
                position: 'bottom'
            });
        } catch (error) {
            console.error('Error approving question:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to approve question',
                position: 'bottom'
            });
        } finally {
            setIsApproving(false);
        }
    };

    const SubjectHeader = () => (
        <LinearGradient
            colors={['#10B981', '#047857']} // emerald-500 to emerald-700
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.subjectHeader}
        >
            <View style={styles.headerContent}>
                <Image
                    source={getSubjectIcon(subjectName as string)}
                    style={styles.subjectheaderIcon}
                />
                <View style={styles.titleContainer}>
                    <ThemedText style={styles.subjectTitle}>{subjectName}</ThemedText>
                    <View style={styles.badgeContainer}>
                        <View style={styles.badge}>
                            <ThemedText style={styles.badgeText}>2024</ThemedText>
                        </View>
                        <View style={styles.badge}>
                            <ThemedText style={styles.badgeText}>Term 2</ThemedText>
                        </View>
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
            <View style={styles.performanceContainer}>
                <View style={styles.performanceHeader}>
                    <ThemedText style={styles.performanceTitle}>Your Scoreboard! 🏆</ThemedText>
                    <View style={styles.termToggle}>
                        <ThemedText style={styles.termToggleText}>
                            {showAllTerms ? 'All Terms' : 'Term 2 only'}
                        </ThemedText>
                        <Switch
                            value={!showAllTerms}
                            onValueChange={(value) => setShowAllTerms(!value)}
                        />
                    </View>
                </View>
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <View style={styles.statContent}>
                            <ThemedText style={styles.statIcon}>🎯</ThemedText>
                            <View style={styles.statTextContainer}>
                                <ThemedText style={styles.statCount}>{stats?.correct_answers || 0}</ThemedText>
                                <ThemedText style={styles.statLabel}>Bullseyes</ThemedText>
                            </View>
                        </View>
                    </View>

                    <View style={styles.statItem}>
                        <View style={styles.statContent}>
                            <ThemedText style={styles.statIcon}>💥</ThemedText>
                            <View style={styles.statTextContainer}>
                                <ThemedText style={styles.statCount}>{stats?.incorrect_answers || 0}</ThemedText>
                                <ThemedText style={styles.statLabel}>Oopsies</ThemedText>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.progressBarContainer}>
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
                <ThemedText style={styles.masteryText}>
                    {progress}% GOAT 🐐
                </ThemedText>
            </View>
        );
    };

    if (isLoading) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
            </ThemedView>
        );
    }

    if (!selectedPaper) {
        return (
            <LinearGradient
                colors={['#FFFFFF', '#F8FAFC', '#F1F5F9']}
                style={[styles.gradient, { paddingTop: insets.top }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <View style={styles.paperSelectionContainer}>
                    <Image
                        source={getSubjectIcon(subjectName as string)}
                        style={styles.subjectIcon}
                    />
                    <ThemedText style={styles.subjectTitle}>{subjectName}</ThemedText>
                    <ThemedText style={styles.paperSelectionText}>Select a paper to continue</ThemedText>

                    <View style={styles.paperButtons}>
                        <LinearGradient
                            colors={['#9333EA', '#4F46E5']} // purple-600 to indigo-600
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
                            colors={['#F59E0B', '#F97316']} // amber-500 to orange-500
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

    if (!question) {
        return (
            <LinearGradient
                colors={['#FFFFFF', '#F8FAFC', '#F1F5F9']}
                style={[styles.gradient, { paddingTop: insets.top }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <ScrollView style={styles.container}>
                    <ThemedView style={styles.noQuestionsContainer}>
                        <Image
                            source={NO_QUESTIONS_ILLUSTRATION}
                            style={styles.noQuestionsIllustration}
                            resizeMode="contain"
                        />
                        <ThemedText style={styles.noQuestionsText}>
                            🐛 Oops! Looks like the quiz gremlins ate all the questions!
                        </ThemedText>
                        <ThemedText style={styles.noQuestionsText}>
                            Check your profile for selected school terms and curriculum
                        </ThemedText>


                        <TouchableOpacity
                            style={[styles.paperButton, { backgroundColor: '#3B82F6' }]}
                            onPress={() => router.push('/(tabs)/profile')}
                        >
                            <LinearGradient
                                colors={['#3B82F6', '#2563EB']}
                                style={styles.paperButtonGradient}
                            >
                                <ThemedText style={styles.paperButtonText}>⚙️ Go to Profile Settings</ThemedText>
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.completionButtons}>
                            <TouchableOpacity
                                style={[styles.paperButton, { backgroundColor: '#FF3B30' }]}
                                onPress={handleRestart}
                            >
                                <LinearGradient
                                    colors={['#FF3B30', '#FF453A']}
                                    style={styles.paperButtonGradient}
                                >
                                    <ThemedText style={styles.paperButtonText}>🔄 Restart the Subject</ThemedText>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.paperButton, { backgroundColor: '#64748B' }]}
                                onPress={() => router.replace('/(tabs)')}
                            >
                                <LinearGradient
                                    colors={['#64748B', '#475569']}
                                    style={styles.paperButtonGradient}
                                >
                                    <ThemedText style={styles.paperButtonText}>🏠 Go Home</ThemedText>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </ThemedView>
                </ScrollView>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient
            colors={['#FFFFFF', '#F8FAFC', '#F1F5F9']}
            style={[styles.gradient, { paddingTop: insets.top }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <ScrollView style={styles.container} ref={scrollViewRef}>
                <SubjectHeader />
                <PerformanceSummary />
                <ThemedView style={styles.content}>
                    <ThemedView style={styles.sectionCard}>

                        {question.context && (
                            <><ThemedText style={styles.questionMeta} testID='question-meta'>
                                Context
                            </ThemedText>
                                <View style={styles.questionContainer} testID='question-context'>
                                    {renderMixedContent(question.context)}
                                </View>
                            </>
                        )}

                        {(question.image_path || question.question_image_path) && (
                            <ThemedText style={styles.imageCaption}>
                                Click image to enlarge
                            </ThemedText>
                        )}

                        {question.image_path && (
                            <>
                                <TouchableOpacity
                                    onPress={() => router.push({
                                        pathname: '/image-viewer',
                                        params: { imageUrl: question.image_path }
                                    })}
                                    testID='question-context-image-container'
                                >
                                    {isImageLoading && <ImageLoadingPlaceholder />}
                                    <Image
                                        source={{
                                            uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${question.image_path}`
                                        }}
                                        style={styles.questionImage}
                                        resizeMode="contain"
                                        onLoadStart={() => setIsImageLoading(true)}
                                        onLoadEnd={() => setIsImageLoading(false)}
                                        testID='question-context-image'
                                    />
                                </TouchableOpacity>


                            </>
                        )}

                        {question.question && (
                            <ThemedText style={styles.questionMeta} testID='question-meta'>
                                Question
                            </ThemedText>
                        )}


                        {question.question_image_path && (
                            <>
                                <TouchableOpacity
                                    onPress={() => router.push({
                                        pathname: '/image-viewer',
                                        params: { imageUrl: question.question_image_path }
                                    })}
                                >
                                    {isImageLoading && <ImageLoadingPlaceholder />}
                                    <Image
                                        source={{
                                            uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${question.question_image_path}`
                                        }}
                                        style={styles.questionImage}
                                        resizeMode="contain"
                                        onLoadStart={() => setIsImageLoading(true)}
                                        onLoadEnd={() => setIsImageLoading(false)}
                                        testID='question-image'
                                    />
                                </TouchableOpacity>


                            </>
                        )}

                        {question.question && (


                            <View style={styles.questionContainer} testID='question-text'>
                                {renderMixedContent(question.question)}
                            </View>

                        )}

                        <View >
                            <ThemedText style={styles.hintText}>
                                Tap to select your answer
                            </ThemedText>
                        </View>

                        {question.type === 'multiple_choice' && (
                            <>
                                <ThemedView style={styles.optionsContainer}>
                                    {Object.entries(question.options)
                                        .filter(([_, value]) => value)
                                        .map(([key, value], index) => (
                                            <TouchableOpacity
                                                key={key}
                                                style={[
                                                    styles.option,
                                                    selectedAnswer === value && styles.selectedOption,
                                                    showFeedback && selectedAnswer === value &&
                                                    (JSON.parse(question.answer).includes(value)
                                                        ? styles.correctOption
                                                        : styles.wrongOption)
                                                ]}
                                                onPress={() => handleAnswer(value)}
                                                disabled={showFeedback || isAnswerLoading}
                                            >
                                                {isAnswerLoading && selectedAnswer === value ? (
                                                    <View style={styles.optionLoadingContainer}>
                                                        <ActivityIndicator size="small" color="#4F46E5" />
                                                    </View>
                                                ) : (
                                                    cleanAnswer(value).includes('$') ? (
                                                        <KaTeX
                                                            latex={cleanAnswer(value).replace(/\$/g, '')}
                                                            isOption={true}
                                                        />
                                                    ) : (
                                                        <ThemedText style={styles.optionText}>{value}</ThemedText>
                                                    )
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                </ThemedView>

                                <TouchableOpacity
                                    style={[styles.reportButton, { marginTop: 16, marginHorizontal: 16 }]}
                                    onPress={() => reportIssue(question.id)}
                                    testID='report-issue-button'
                                >
                                    <ThemedText style={styles.reportButtonText}>
                                        🛑 Report an Issue with this Question
                                    </ThemedText>
                                </TouchableOpacity>
                            </>
                        )}
                        {showFeedback && (
                            <ThemedView style={styles.feedbackContainer}>
                                <ThemedText style={styles.feedbackEmoji} testID='feedback-emoji'>
                                    {feedbackMessage}
                                </ThemedText>

                                <ThemedView style={styles.correctAnswerContainer}>
                                    <ThemedText style={styles.correctAnswerLabel} testID='correct-answer-label'>
                                        ✅ Right Answer!
                                    </ThemedText>
                                    {cleanAnswer(question.answer).includes('$') ? (
                                        <KaTeX latex={cleanAnswer(question.answer).replace(/\$/g, '')} />
                                    ) : (
                                        <ThemedText style={styles.correctAnswerText} testID='correct-answer-text'>
                                            {cleanAnswer(question.answer)}
                                        </ThemedText>
                                    )}
                                    {question.answer_image && (
                                        <>
                                            <TouchableOpacity
                                                onPress={() => router.push({
                                                    pathname: '/image-viewer',
                                                    params: { imageUrl: question.answer_image }
                                                })}
                                                testID='correct-answer-image-container'
                                            >
                                                {isAnswerImageLoading && <ImageLoadingPlaceholder />}
                                                <Image
                                                    source={{
                                                        uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${question.answer_image}`
                                                    }}
                                                    style={styles.answerImage}
                                                    resizeMode="contain"
                                                    onLoadStart={() => setIsAnswerImageLoading(true)}
                                                    onLoadEnd={() => setIsAnswerImageLoading(false)}
                                                    testID='correct-answer-image'
                                                />
                                            </TouchableOpacity>

                                        </>
                                    )}
                                    {question.explanation && (
                                        <View style={styles.questionContainer} testID='explanation-container'>
                                            {renderMixedContent(cleanAnswer(question.explanation))}
                                        </View>
                                    )}

                                </ThemedView>

                                <View style={styles.feedbackButtonsContainer}>
                                    <TouchableOpacity
                                        style={styles.approveButton}
                                        onPress={handleApproveQuestion}
                                        disabled={isApproving}
                                    >
                                        <ThemedText style={styles.approveButtonText}>
                                            {isApproving ? '👍 Approving...' : '👍 This Question is Good!'}
                                        </ThemedText>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={styles.aiExplanationButton}
                                    onPress={() => {
                                        fetchAIExplanation(question?.id || 0)
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

            <ThemedView style={styles.footer}>
                <LinearGradient
                    colors={['#9333EA', '#4F46E5']} // purple-600 to indigo-600
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
                    colors={['#F59E0B', '#F97316']} // amber-500 to orange-500
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.footerButton}
                >
                    <TouchableOpacity
                        style={styles.buttonContent}
                        onPress={() => router.replace('/(tabs)')}
                    >
                        <Ionicons name="cafe" size={20} color="#FFFFFF" />
                        <ThemedText style={styles.footerButtonText} >Chill Time!</ThemedText>
                    </TouchableOpacity>
                </LinearGradient>
            </ThemedView >

            <Modal
                isVisible={isReportModalVisible}
                onBackdropPress={() => setIsReportModalVisible(false)}
                onSwipeComplete={() => setIsReportModalVisible(false)}
                swipeDirection={['down']}
                useNativeDriver={true}
                style={[styles.modal, { marginTop: insets.top }]}
            >
                <View style={styles.reportModalContent}>
                    <ThemedText style={styles.reportModalTitle}>Report Issue</ThemedText>
                    <TextInput
                        style={styles.reportInput}
                        placeholder="Describe the issue..."
                        placeholderTextColor="#64748B"
                        value={reportComment}
                        onChangeText={setReportComment}
                        multiline
                        numberOfLines={4}
                    />
                    <View style={styles.reportModalButtons}>
                        <TouchableOpacity
                            style={[styles.reportModalButton, styles.cancelButton]}
                            onPress={() => setIsReportModalVisible(false)}
                        >
                            <ThemedText style={styles.buttonText}>Cancel</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.reportModalButton, styles.submitButton, { backgroundColor: '#3B82F6' }]}
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
                <View style={styles.explanationModal}>
                    <View style={styles.explanationHeader}>
                        <ThemedText style={styles.explanationTitle}>🔬 AI Science Scoop! 🤖✨</ThemedText>
                        <TouchableOpacity
                            onPress={() => setIsExplanationModalVisible(false)}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={24} color="#1E293B" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.explanationContent}>
                        {aiExplanation.split('\n').map((line, index) => {
                            const trimmedLine = line.trim();
                            if (trimmedLine.startsWith('-')) {
                                // Remove the dash and any leading/trailing spaces
                                const content = trimmedLine.substring(1).trim();
                                const indentLevel = line.indexOf('-') / 2; // Calculate indent level

                                return (
                                    <View
                                        key={index}
                                        style={[
                                            styles.explanationLine,
                                            { marginLeft: indentLevel * 20 } // Indent nested points
                                        ]}
                                    >
                                        <ThemedText style={styles.bulletPoint}>✅</ThemedText>
                                        <View style={styles.explanationTextContainer}>
                                            {renderMixedContent(content)}
                                        </View>
                                    </View>
                                );
                            }
                            return (
                                <View key={index} style={styles.explanationTextContainer}>
                                    {renderMixedContent(line)}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </Modal>
        </LinearGradient >
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
    progressBar: {
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        marginBottom: 20,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#000000',
        borderRadius: 4,
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
        padding: 20,
        backgroundColor: 'transparent',
    },
    noQuestionsIllustration: {
        width: 300,
        height: 300,
        marginBottom: 24,
    },
    noQuestionsText: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 32,
        color: '#000000',
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
        padding: 16,
        margin: 16,
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    correctAnswerContainer: {
        backgroundColor: '#FFFFFF',
        borderColor: '#22C55E',
        padding: 16,
        borderRadius: 8,
        marginTop: 12,
    },
    correctAnswerLabel: {
        fontSize: 14,
        color: '#999',
        marginBottom: 4,
    },
    correctAnswerText: {
        color: '#166534',
    },
    answerImage: {
        width: '100%',
        height: 200,
        marginTop: 8,
        borderRadius: 8,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 32,
    },
    restartButton: {
        backgroundColor: '#FF3B30',
    },
    imagePlaceholderContainer: {
        width: '100%',
        height: 200,
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'absolute',
        zIndex: 1,
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
    buttonText: {
        color: '#1E293B',
        fontSize: 14,
        fontWeight: '600',
    },
    performanceContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
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
        color: '#1E293B',
    },
    termToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    termToggleText: {
        fontSize: 14,
        color: '#64748B',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 20,
        paddingHorizontal: 16,
        gap: 16,
    },
    statItem: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statIcon: {

        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 24,
        fontWeight: 'bold',
    },
    statTextContainer: {
        flex: 1,
    },
    statCount: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1E293B',
    },
    statLabel: {
        fontSize: 14,
        color: '#64748B',
    },
    progressBarContainer: {
        width: '100%',
        backgroundColor: '#E2E8F0',
        borderRadius: 2,
        marginTop: 12,
        height: 4,
        overflow: 'hidden',
    },
    masteryText: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
        textAlign: 'right',
    },
    closeButtonText: {
        color: '#000000',
        fontSize: 20,
        fontWeight: 'bold',
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
        paddingHorizontal: 4,
    },
    explanationLine: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        paddingRight: 16,
    },
    bulletPoint: {
        fontSize: 16,
        marginRight: 8,
        marginTop: 4,
    },
    explanationTextContainer: {
        flex: 1,
        paddingRight: 8,
    },
    explanationText: {
        fontSize: 16,
        lineHeight: 28,  // Increase line height for better spacing
        color: '#1E293B',
        paddingVertical: 20,
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
    feedbackButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        gap: 12,
    },
    approveButton: {
        backgroundColor: '#DCFCE7',
        padding: 8,
        borderRadius: 8,
        flex: 1,
    },
    approveButtonText: {
        color: '#166534',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
});

function getProgressBarColor(progress: number): string {
    if (progress >= 80) return '#22C55E'; // Green
    if (progress >= 60) return '#3B82F6'; // Blue
    if (progress >= 40) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
} 