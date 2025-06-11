import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Pressable, ActivityIndicator, ScrollView, View, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { HOST_URL } from '@/config/api';
import { LessonHeader } from '@/components/LessonHeader';
import { SelectImageQuestion } from './components/SelectImageQuestion';
import { MatchPairsQuestion } from './components/MatchPairsQuestion';
import { TranslateQuestion } from './components/TranslateQuestion';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { TapWhatYouHearQuestion } from './components/TapWhatYouHearQuestion';
import { FillInBlankQuestion } from './components/FillInBlankQuestion';
import { TypeWhatYouHearQuestion } from './components/TypeWhatYouHearQuestion';
import { CompleteTranslationQuestion } from './components/CompleteTranslationQuestion';
import { FeedbackProvider } from './contexts/FeedbackContext';
import { FeedbackMessage, FeedbackButton } from './components/CheckContinueButton';
import { useFeedback } from './contexts/FeedbackContext';

interface Word {
    id: number;
    image: string;
    audio: Record<string, string>;
    translations: Record<string, string>;
}

interface Question {
    id: number;
    words?: Word[];
    options: string[];
    correctOption: number | null;
    questionOrder: number;
    type: 'select_image' | 'tap_what_you_hear' | 'match_pairs' | 'type_what_you_hear' | 'fill_in_blank' | 'complete_translation' | 'translate';
    blankIndex: number | null;
    sentenceWords: string[] | null;
    direction: string | null;
    matchType?: 'audio' | 'text';
}

interface IncorrectQuestion {
    question: Question;
    questionId: string | number;
}

// Common props for all question components
interface BaseQuestionProps {
    words: Word[];
    selectedLanguage: string;
    questionId: string | number;
    setOnCheck?: (fn: () => void) => void;
    setOnContinue?: (fn: () => void) => void;
    onAnswerChange?: (answer: string | number | (string | number)[]) => void;
}

interface SelectImageQuestionProps extends BaseQuestionProps {
    options: string[];
    correctOption: number | null;
    areResourcesDownloaded: boolean;
}

interface TapWhatYouHearQuestionProps extends BaseQuestionProps {
    sentenceWords: string[];
    options: string[];
}

interface MatchPairsQuestionProps extends BaseQuestionProps {
    areResourcesDownloaded: boolean;
    onCheck: () => void;
    matchType?: 'audio' | 'text';
}

interface TypeWhatYouHearQuestionProps extends BaseQuestionProps {
    options: string[];
}

interface FillInBlankQuestionProps extends BaseQuestionProps {
    sentenceWords: string[];
    options: string[];
    blankIndex: number;
}

interface CompleteTranslationQuestionProps extends BaseQuestionProps {
    options: string[];
    blankIndex: number;
}

interface TranslateQuestionProps extends BaseQuestionProps {
    options: string[];
    direction: 'from_english' | 'to_english';
    sentenceWords: string[] | null;
}

// Helper to check if resources are downloaded for a unit/language
async function areResourcesDownloaded(unitId: number, languageCode: string): Promise<boolean> {
    const key = `unit_${unitId}_${languageCode}_resources`;
    const downloaded = await SecureStore.getItemAsync(key);
    if (downloaded === 'true') {
        // Optionally, check if files exist in the directory
        return true;
    }
    return false;
}

function ReviewSection({ onRetry }: { onRetry: () => void }) {
    return (
        <ThemedView style={styles.reviewContainer}>
            <ThemedText style={styles.reviewTitle}>Let's retry the questions you got wrong.</ThemedText>
            <Pressable style={styles.letsGoButton} onPress={onRetry} accessibilityRole="button">
                <ThemedText style={styles.letsGoButtonText}>Let's go 🚀</ThemedText>
            </Pressable>
        </ThemedView>
    );
}

function LessonContent() {
    const { lessonId, lessonTitle, languageCode, unitName, lessonNumber } = useLocalSearchParams();
    const router = useRouter();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [areResourcesDownloadedState, setAreResourcesDownloadedState] = useState(false);
    const { isChecked, isCorrect, questionId } = useFeedback();
    const checkRef = useRef<() => void>(() => { });
    const continueRef = useRef<() => void>(() => { });
    const [incorrectQuestions, setIncorrectQuestions] = useState<IncorrectQuestion[]>([]);
    const [showReview, setShowReview] = useState(false);
    const [isRetryingIncorrect, setIsRetryingIncorrect] = useState(false);
    const [originalQuestions, setOriginalQuestions] = useState<Question[]>([]);
    const [showCelebration, setShowCelebration] = useState(false);
    const [showQuitModal, setShowQuitModal] = useState(false);

    // Function to increment points
    const incrementPoints = async () => {
        try {
            const authData = await SecureStore.getItemAsync('auth');
            if (!authData) {
                console.error('No auth data found');
                return;
            }
            const { user } = JSON.parse(authData);
            console.log('User:', user.uid);
            const response = await fetch(`${HOST_URL}/api/language-learners/${user.uid}/increment-points`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    points: 10,
                    lessonId: Number(lessonId)
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to increment points');
            }

            const data = await response.json();
            console.log('Points incremented:', data);
        } catch (error) {
            console.error('Error incrementing points:', error);
        }
    };

    // Function to update lesson progress
    const updateLessonProgress = async () => {
        try {
            const authData = await SecureStore.getItemAsync('auth');
            if (!authData) {
                console.error('No auth data found');
                return;
            }
            const { user } = JSON.parse(authData);
            const response = await fetch(`${HOST_URL}/api/language-learners/${user.uid}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    lessonId: Number(lessonId),
                    language: languageCode,
                    status: 'completed'
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update lesson progress');
            }

            const data = await response.json();
            console.log('Lesson progress updated:', data);
        } catch (error) {
            console.error('Error updating lesson progress:', error);
        }
    };

    // Effect to track incorrect questions using feedback context
    useEffect(() => {
        if (isChecked && !isCorrect && questionId && questions[currentQuestionIndex]) {
            setIncorrectQuestions(prev => [...prev, {
                question: questions[currentQuestionIndex],
                questionId
            }]);
        }
    }, [isChecked, isCorrect, questionId, currentQuestionIndex, questions]);

    // Effect to show review section when all questions are completed
    useEffect(() => {
        if (currentQuestionIndex >= questions.length && questions.length > 0) {
            setShowReview(true);
        }
    }, [currentQuestionIndex, questions.length]);

    useEffect(() => {
        if (showReview) {
            console.log('Questions the user got wrong:', incorrectQuestions);
        }
    }, [showReview, incorrectQuestions]);

    useEffect(() => {
        async function fetchQuestions() {
            try {
                const response = await fetch(`${HOST_URL}/api/language-questions/lesson/${lessonId}`);
                const data = await response.json();
                // Sort questions by questionOrder
                const sortedQuestions = data.sort((a: Question, b: Question) => a.questionOrder - b.questionOrder);
                setQuestions(sortedQuestions);
                setOriginalQuestions(sortedQuestions);
                // Check for resources for the first question's unitId
                if (sortedQuestions.length > 0 && sortedQuestions[0].words && sortedQuestions[0].words.length > 0) {
                    const unitId = sortedQuestions[0].words[0].unitId || null;
                    if (unitId && languageCode) {
                        const downloaded = await areResourcesDownloaded(unitId, languageCode as string);
                        setAreResourcesDownloadedState(downloaded);
                    }
                }
            } catch (err) {
                setError('Error fetching questions');
            } finally {
                setIsLoading(false);
            }
        }
        fetchQuestions();
    }, [lessonId, languageCode]);

    const handleRetry = () => {
        setShowReview(false);
        setIsRetryingIncorrect(true);
        setCurrentQuestionIndex(0);
        setQuestions(incorrectQuestions.map(q => q.question));
        setIncorrectQuestions([]);
    };

    // When retrying is done, reset to original questions and exit retry mode
    useEffect(() => {
        if (isRetryingIncorrect && currentQuestionIndex >= questions.length && questions.length > 0) {
            if (incorrectQuestions.length === 0) {
                setShowCelebration(true);
                setShowReview(false);
            } else {
                setShowReview(true);
            }
            setIsRetryingIncorrect(false);
            setQuestions(originalQuestions);
            setCurrentQuestionIndex(0);
        }
    }, [isRetryingIncorrect, currentQuestionIndex, questions.length, originalQuestions, incorrectQuestions.length]);

    // Also handle the case when the user finishes the lesson the first time with no incorrect questions
    useEffect(() => {
        if (!isRetryingIncorrect && showReview && incorrectQuestions.length === 0) {
            setShowCelebration(true);
            setShowReview(false);
        }
    }, [showReview, incorrectQuestions.length, isRetryingIncorrect]);

    const handleCheck = () => checkRef.current();
    const handleContinue = () => {
        continueRef.current?.(); // Reset child state
        setCurrentQuestionIndex(idx => idx + 1); // Move to next question
    };

    const handleQuit = () => {
        setShowQuitModal(true);
    };

    const confirmQuit = () => {
        setShowQuitModal(false);
        router.back();
    };

    const cancelQuit = () => {
        setShowQuitModal(false);
    };

    const renderProgressBar = () => {
        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
        return (
            <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>

            </View>
        );
    };

    const renderQuestion = (question: Question) => {
        if (!question) return null;

        switch (question.type) {
            case 'select_image':
                return (
                    <SelectImageQuestion
                        words={question.words || []}
                        options={question.options}
                        correctOption={question.correctOption}
                        selectedLanguage={languageCode as string}
                        areResourcesDownloaded={areResourcesDownloadedState}
                        questionId={String(question.id)}
                        setOnCheck={fn => { checkRef.current = fn; }}
                        setOnContinue={fn => { continueRef.current = fn; }}
                    />
                );

            case 'tap_what_you_hear':
                return (
                    <TapWhatYouHearQuestion
                        words={question.words || []}
                        sentenceWords={question.sentenceWords || []}
                        options={question.options}
                        selectedLanguage={languageCode as string}
                        questionId={String(question.id)}
                        setOnCheck={fn => { checkRef.current = fn; }}
                        setOnContinue={fn => { continueRef.current = fn; }}
                    />
                );

            case 'match_pairs':
                return (
                    <MatchPairsQuestion
                        words={question.words || []}
                        selectedLanguage={languageCode as string}
                        areResourcesDownloaded={areResourcesDownloadedState}
                        onCheck={handleContinue}
                        matchType={question.matchType}
                        questionId={String(question.id)}
                        setOnCheck={fn => { checkRef.current = fn; }}
                        setOnContinue={fn => { continueRef.current = fn; }}
                    />
                );

            case 'type_what_you_hear':
                return (
                    <TypeWhatYouHearQuestion
                        words={question.words || []}
                        options={question.options}
                        selectedLanguage={languageCode as string}
                        questionId={String(question.id)}
                        setOnCheck={fn => { checkRef.current = fn; }}
                        setOnContinue={fn => { continueRef.current = fn; }}
                    />
                );

            case 'fill_in_blank':
                return (
                    <FillInBlankQuestion
                        words={question.words || []}
                        sentenceWords={question.sentenceWords || []}
                        options={question.options}
                        blankIndex={question.blankIndex ?? 0}
                        selectedLanguage={languageCode as string}
                        questionId={String(question.id)}
                        setOnCheck={fn => { checkRef.current = fn; }}
                        setOnContinue={fn => { continueRef.current = fn; }}
                    />
                );

            case 'complete_translation':
                return (
                    <CompleteTranslationQuestion
                        words={question.words || []}
                        options={question.options}
                        selectedLanguage={languageCode as string}
                        blankIndex={question.blankIndex ?? 0}
                        questionId={String(question.id)}
                        setOnCheck={fn => { checkRef.current = fn; }}
                        setOnContinue={fn => { continueRef.current = fn; }}
                    />
                );

            case 'translate':
                return (
                    <TranslateQuestion
                        words={question.words || []}
                        options={question.options}
                        selectedLanguage={languageCode as string}
                        direction={question.direction as 'from_english' | 'to_english'}
                        sentenceWords={question.sentenceWords}
                        questionId={String(question.id)}
                        setOnCheck={fn => { checkRef.current = fn; }}
                        setOnContinue={fn => { continueRef.current = fn; }}
                    />
                );

            default:
                return null;
        }
    };

    // CelebrationScreen moved inside LessonContent to access incrementPoints
    function CelebrationScreen() {
        useEffect(() => {
            // Increment points and update lesson progress when the celebration screen is shown
            incrementPoints();
            updateLessonProgress();
        }, []);

        const handleContinue = () => {
            router.back();
        };

        return (
            <ThemedView style={styles.celebrationContainer}>
                <ThemedText style={styles.celebrationTitle}>🎉 Congratulations! 🎉</ThemedText>
                <ThemedText style={styles.celebrationSubtitle}>You've completed the lesson!</ThemedText>
                <ThemedText style={styles.celebrationPoints}>+10 points</ThemedText>
                <Pressable
                    style={({ pressed }) => [
                        styles.continueButton,
                        pressed && styles.continueButtonPressed
                    ]}
                    onPress={handleContinue}
                    accessibilityRole="button"
                >
                    <ThemedText style={styles.continueButtonText}>Continue Learning</ThemedText>
                </Pressable>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <LessonHeader
                title={unitName as string}
                subText={lessonNumber ? `Lesson ${lessonNumber}` : undefined}
                showBackButton={true}
                onBackPress={handleQuit}
            />
            {isLoading ? (
                <ActivityIndicator size="large" />
            ) : error ? (
                <ThemedText>{error}</ThemedText>
            ) : showCelebration ? (
                <CelebrationScreen />
            ) : showReview ? (
                <ReviewSection
                    onRetry={handleRetry}
                />
            ) : questions.length > 0 && currentQuestionIndex < questions.length ? (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
                >
                    <View style={styles.progressContainer}>
                        {renderProgressBar()}
                    </View>
                    <View style={styles.questionContainer}>
                        {renderQuestion(questions[currentQuestionIndex])}
                    </View>
                </ScrollView>
            ) : (
                <ThemedText>No questions available</ThemedText>
            )}
            {!showReview && !showCelebration && questions.length > 0 && currentQuestionIndex < questions.length && (
                <SafeAreaView edges={['bottom']} style={styles.feedbackContainer}>
                    <FeedbackMessage onContinue={handleContinue} />
                    <FeedbackButton
                        isDisabled={false}
                        onCheck={handleCheck}
                        onContinue={handleContinue}
                    />
                </SafeAreaView>
            )}

            <Modal
                visible={showQuitModal}
                transparent={true}
                animationType="fade"
                onRequestClose={cancelQuit}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ThemedText style={styles.modalTitle}>Quit Lesson?</ThemedText>
                        <ThemedText style={styles.modalText}>
                            Are you sure you want to quit this lesson? Your progress will be saved.
                        </ThemedText>
                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={cancelQuit}
                            >
                                <ThemedText style={styles.cancelButtonText}>Continue Learning</ThemedText>
                            </Pressable>
                            <Pressable
                                style={[styles.modalButton, styles.quitButton]}
                                onPress={confirmQuit}
                            >
                                <ThemedText style={styles.quitButtonText}>Quit Lesson</ThemedText>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </ThemedView>
    );
}

export default function LessonScreen() {
    return (
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
            <FeedbackProvider>
                <LessonContent />
            </FeedbackProvider>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    progressContainer: {
        padding: 16,
        gap: 8,
    },
    progressBackground: {
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#A1CEDC',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.8,
    },
    questionContainer: {
        padding: 16,
        gap: 16,
    },
    questionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    optionsContainer: {
        gap: 12,
    },
    optionButton: {
        backgroundColor: '#A1CEDC',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    optionButtonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    checkButton: {
        margin: 16,
        padding: 12,
        backgroundColor: '#E5E7EB',
        borderRadius: 8,
        alignItems: 'center',
    },
    checkButtonSelected: {
        backgroundColor: '#4CAF50',
    },
    checkButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563',
    },
    checkButtonTextSelected: {
        color: '#FFFFFF',
    },
    feedbackContainer: {
        padding: 16,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        zIndex: 10,
        alignItems: 'center',
        width: '100%',
        flexDirection: 'column',
        gap: 12,
    },
    correctFeedback: {
        color: '#4CAF50',
        fontWeight: 'bold',
        fontSize: 20,
    },
    correctLabel: {
        color: '#4CAF50',
        fontWeight: '600',
        fontSize: 18,
        marginLeft: 8,
        textDecorationLine: 'underline',
    },
    reviewContainer: {
        flex: 1,
        padding: 16,
    },
    reviewTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    reviewScrollView: {
        flex: 1,
    },
    reviewItem: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    reviewQuestionNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    reviewQuestionType: {
        fontSize: 16,
        color: '#666',
        marginBottom: 8,
    },
    reviewAnswer: {
        fontSize: 16,
        color: '#E53935',
        marginBottom: 4,
    },
    reviewCorrectAnswer: {
        fontSize: 16,
        color: '#43A047',
    },
    retryButton: {
        backgroundColor: '#A1CEDC',
        padding: 16,
        borderRadius: 12,
        marginTop: 16,
        alignItems: 'center',
    },
    retryButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    letsGoButton: {
        backgroundColor: '#A1CEDC',
        padding: 16,
        borderRadius: 12,
        marginTop: 32,
        alignItems: 'center',
    },
    letsGoButtonText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    celebrationContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    celebrationTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#43A047',
        marginBottom: 16,
        textAlign: 'center',
    },
    celebrationSubtitle: {
        fontSize: 20,
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    celebrationPoints: {
        fontSize: 24,
        color: '#A1CEDC',
        fontWeight: '700',
        marginTop: 16,
        marginBottom: 32,
        textAlign: 'center',
    },
    continueButton: {
        backgroundColor: '#A1CEDC',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    continueButtonPressed: {
        opacity: 0.9,
        transform: [{ scale: 0.98 }],
    },
    continueButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#1E293B',
    },
    modalText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        color: '#64748B',
        lineHeight: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#F1F5F9',
    },
    quitButton: {
        backgroundColor: '#EF4444',
    },
    cancelButtonText: {
        color: '#1E293B',
        fontSize: 16,
        fontWeight: '600',
    },
    quitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
}); 