import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, ScrollView, View, Linking, Platform } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import Modal from 'react-native-modal';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/contexts/AuthContext';
import { checkAnswer, getLearner, API_BASE_URL } from '@/services/api';
import { API_BASE_URL as ConfigAPI_BASE_URL } from '@/config/api';
import { Header } from '@/components/Header';

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

interface CheckAnswerResponse {
    status: string;
    is_correct: boolean;
    correct_answers: string;
}

interface QuestionResponse extends Question {
    status: string;
    message?: string;
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

const reportIssue = (questionId: number) => {
    const message = `Hi, I'd like to report an issue with question #${questionId}`;
    Linking.openURL(`https://api.whatsapp.com/send/?phone=27837917430&text=${encodeURIComponent(message)}`);
    Toast.show({
        type: 'info',
        text1: 'Opening WhatsApp',
        position: 'bottom'
    });
};

export default function QuizScreen() {
    const { user } = useAuth();
    const { subjectId, subjectName } = useLocalSearchParams();
    const [question, setQuestion] = useState<Question | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [inputAnswer, setInputAnswer] = useState('');
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [noMoreQuestions, setNoMoreQuestions] = useState(false);
    const [learnerInfo, setLearnerInfo] = useState<{ name: string; grade: string } | null>(null);
    const [isImageVisible, setIsImageVisible] = useState(false);
    const scrollViewRef = React.useRef<ScrollView>(null);

    useEffect(() => {
        loadRandomQuestion();
        async function fetchLearnerInfo() {
            if (!user?.uid) return;
            try {
                const learner = await getLearner(user.uid);
                setLearnerInfo({
                    name: learner.name,
                    grade: learner.grade.number.toString()
                });
            } catch (error) {
                console.error('Failed to fetch learner info:', error);
            }
        }
        fetchLearnerInfo();
    }, [subjectId, user?.uid]);

    const loadRandomQuestion = async () => {
        if (!user?.uid || !subjectId) return;

        // Reset all states before loading new question
        setSelectedAnswer(null);
        setShowFeedback(false);
        setInputAnswer('');
        setIsCorrect(null);

        try {
            setIsLoading(true);
            const response = await fetch(
                `${ConfigAPI_BASE_URL}/public/learn/question/random?subject_id=${subjectId}&uid=${user.uid}&question_id=0`
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
        } catch (error) {
            console.error('Failed to load question:', error);
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

        try {
            const response = await checkAnswer(user.uid, question.id, answer);
            setSelectedAnswer(answer);
            setShowFeedback(true);
            setIsCorrect(response.is_correct);

            // Longer delay and force scroll
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            console.error('Failed to check answer:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to check answer',
                position: 'bottom'
            });
        }
    };

    const handleNext = () => {
        setSelectedAnswer(null);
        setShowFeedback(false);
        setInputAnswer('');
        loadRandomQuestion();
    };

    const handleSubmit = () => {
        if (!inputAnswer.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please enter an answer',
                position: 'bottom'
            });
            return;
        }
        handleAnswer(inputAnswer);
    };

    if (isLoading) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000000" />
            </ThemedView>
        );
    }

    if (!question) {
        return (
            <ThemedView style={styles.container}>
                <ThemedView style={styles.noQuestionsContainer}>
                    <ThemedText style={styles.noQuestionsEmoji}>
                        {noMoreQuestions ? '🎉' : '🤔'}
                    </ThemedText>
                    <ThemedText style={styles.noQuestionsText}>
                        {noMoreQuestions
                            ? "Congratulations! You've completed all questions!"
                            : "No questions available"}
                    </ThemedText>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.footerButton, styles.restartButton]}
                            onPress={async () => {
                                try {
                                    if (!user?.uid || !subjectId) return;
                                    await fetch(
                                        `${ConfigAPI_BASE_URL}/public/learn/learner/remove-results`,
                                        {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ uid: user.uid, subject_id: subjectId })
                                        }
                                    );
                                    loadRandomQuestion();
                                } catch (error) {
                                    console.error('Failed to restart subject:', error);
                                    Alert.alert('Error', 'Failed to restart subject');
                                }
                            }}
                        >
                            <ThemedText style={styles.footerButtonText}>
                                Restart Subject
                            </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.footerButton, styles.nextButton]}
                            onPress={() => router.back()}
                        >
                            <ThemedText style={styles.footerButtonText}>
                                Back to Subjects
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </ThemedView>
            </ThemedView>
        );
    }

    return (
        <LinearGradient
            colors={['#DBEAFE', '#F3E8FF']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <ScrollView
                ref={scrollViewRef}
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <Header
                    title="Exam Quiz"
                    user={user}
                    learnerInfo={learnerInfo}
                />

                <ThemedView style={styles.content}>
                    <ThemedView style={styles.sectionCard}>
                        <ThemedText style={styles.subjectTitle}>
                            {subjectName}
                        </ThemedText>

                        {(question.year || question.term) && (
                            <ThemedText style={styles.questionMeta}>
                                {question.year && `${question.year}`}
                                {question.year && question.term && ' • '}
                                {question.term && `Term ${question.term}`}
                            </ThemedText>
                        )}

                        {question.context && (
                            <ThemedText style={styles.contextText}>
                                {question.context}
                            </ThemedText>
                        )}

                        {question.image_path && (
                            <>
                                <TouchableOpacity
                                    onPress={() => setIsImageVisible(true)}
                                    style={styles.imageContainer}
                                >
                                    <Image
                                        source={{
                                            uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${question.image_path}`
                                        }}
                                        style={styles.questionImage}
                                        resizeMode="contain"
                                    />
                                </TouchableOpacity>

                                <Modal
                                    isVisible={isImageVisible}
                                    onBackdropPress={() => setIsImageVisible(false)}
                                    onSwipeComplete={() => setIsImageVisible(false)}
                                    swipeDirection="down"
                                    style={styles.modal}
                                >
                                    <TouchableOpacity
                                        style={styles.modalContent}
                                        activeOpacity={1}
                                        onPress={() => setIsImageVisible(false)}
                                    >
                                        <TouchableOpacity
                                            style={styles.closeButton}
                                            onPress={() => setIsImageVisible(false)}
                                        >
                                            <ThemedText style={styles.closeButtonText}>✕</ThemedText>
                                        </TouchableOpacity>
                                        <Image
                                            source={{
                                                uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${question.image_path}`
                                            }}
                                            style={styles.fullScreenImage}
                                            resizeMode="contain"
                                        />
                                    </TouchableOpacity>
                                </Modal>
                            </>
                        )}

                        {question.question_image_path && (
                            <Image
                                source={{
                                    uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${question.question_image_path}`
                                }}
                                style={styles.questionImage}
                                resizeMode="contain"
                            />
                        )}

                        {question.question && (
                            <ThemedText style={styles.questionText}>
                                {question.question}
                            </ThemedText>
                        )}

                        {question.type === 'single' && (
                            <ThemedView style={styles.singleAnswerContainer}>
                                <TextInput
                                    style={styles.answerInput}
                                    value={inputAnswer}
                                    onChangeText={setInputAnswer}
                                    placeholder="Enter your answer"
                                    placeholderTextColor="#666"
                                    multiline={false}
                                    editable={!showFeedback}
                                />
                                {!showFeedback && question.type === 'single' && (
                                    <TouchableOpacity
                                        style={[styles.footerButton, styles.submitButton]}
                                        onPress={handleSubmit}
                                    >
                                        <ThemedText style={styles.footerButtonText}>Submit</ThemedText>
                                    </TouchableOpacity>
                                )}
                            </ThemedView>
                        )}

                        {question.type === 'multiple_choice' && (
                            <ThemedView style={styles.optionsContainer}>
                                {Object.entries(question.options)
                                    .filter(([_, value]) => value)
                                    .map(([key, value]) => (
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
                                            disabled={showFeedback}
                                        >
                                            <ThemedText style={styles.optionText}>{value}</ThemedText>
                                        </TouchableOpacity>
                                    ))}
                            </ThemedView>
                        )}

                        {question.type === 'true_false' && (
                            <ThemedView style={styles.optionsContainer}>
                                {[
                                    ['true', 'True'],
                                    ['false', 'False']
                                ]
                                    .filter(([_, value]) => value)
                                    .map(([key, value]) => (
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
                                            disabled={showFeedback}
                                        >
                                            <ThemedText style={styles.optionText}>{value}</ThemedText>
                                        </TouchableOpacity>
                                    ))}
                            </ThemedView>
                        )}

                        {showFeedback && (
                            <ThemedView style={styles.feedbackContainer}>
                                <ThemedText style={styles.feedbackEmoji}>
                                    {isCorrect ? '🎉' : '😔'}
                                </ThemedText>
                                {!isCorrect && (
                                    <ThemedView style={styles.correctAnswerContainer}>
                                        <ThemedText style={styles.correctAnswerLabel}>
                                            Correct answer:
                                        </ThemedText>
                                        <ThemedText style={styles.correctAnswerText}>
                                            {cleanAnswer(question.answer)}
                                        </ThemedText>
                                        {question.answer_image && (
                                            <Image
                                                source={{
                                                    uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${question.answer_image}`
                                                }}
                                                style={styles.answerImage}
                                                resizeMode="contain"
                                            />
                                        )}
                                        {question.explanation && (
                                            <ThemedText style={styles.correctAnswerText}>
                                                {cleanAnswer(question.explanation)}
                                            </ThemedText>
                                        )}
                                    </ThemedView>
                                )}
                            </ThemedView>
                        )}

                        <TouchableOpacity
                            style={styles.reportButton}
                            onPress={() => reportIssue(question.id)}
                        >
                            <ThemedText style={styles.reportButtonText}>
                                ⚠️ Report Issue
                            </ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                </ThemedView>
            </ScrollView>

            <ThemedView style={styles.footer}>
                {!showFeedback && (
                    <>
                        <TouchableOpacity
                            style={[styles.footerButton]}
                            onPress={loadRandomQuestion}
                        >
                            <ThemedText style={styles.footerButtonText}>Skip</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.footerButton]}
                            onPress={() => router.push('/(tabs)')}
                        >
                            <ThemedText style={styles.footerButtonText}>Quit</ThemedText>
                        </TouchableOpacity>
                    </>
                )}

                {showFeedback && (
                    <ThemedView style={styles.footerButtonGroup}>

                        <TouchableOpacity
                            style={[styles.footerButton, styles.nextButton]}
                            onPress={handleNext}
                        >
                            <ThemedText style={styles.footerButtonText}>Next</ThemedText>
                        </TouchableOpacity>
                    </ThemedView>
                )}
            </ThemedView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        padding: 20,
    },
    content: {
        gap: 20,
        backgroundColor: 'transparent',
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
            },
            android: {
                elevation: 8,
            },
            web: {
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)'
            },
        }),
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        backgroundColor: '#FFFFFF',
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
        flex: 1,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 20,
        lineHeight: 24,
        includeFontPadding: false,
    },
    optionsContainer: {
        gap: 12,
    },
    optionButton: {
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    selectedOption: {
        backgroundColor: '#00000020',
        borderColor: '#000000',
    },
    correctOption: {
        backgroundColor: '#4CAF5020',
        borderColor: '#4CAF50',
    },
    wrongOption: {
        backgroundColor: '#FF3B3020',
        borderColor: '#FF3B30',
    },
    optionText: {
        fontSize: 16,
        lineHeight: 24,
        includeFontPadding: false,
    },
    footerButton: {
        padding: 15,
        borderRadius: 8,
        backgroundColor: '#E0E0E0',
        minWidth: 100,
        alignItems: 'center',
    },
    nextButton: {
        backgroundColor: '#000000',
    },
    footerButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contextText: {
        fontSize: 14,
        marginBottom: 16,
        color: '#666',
        lineHeight: 20,
        includeFontPadding: false,
    },
    option: {
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    questionImage: {
        width: '100%',
        height: 200,
        marginBottom: 20,
        borderRadius: 8,
    },
    singleAnswerContainer: {
        gap: 16,
        marginBottom: 20,
    },
    answerInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        height: 48,
        color: '#333',
    },
    submitButton: {
        backgroundColor: '#000000',
        marginTop: 8,
    },
    feedbackEmoji: {
        fontSize: 48,
        textAlign: 'center',
        marginVertical: 16,
        height: 60,
        includeFontPadding: false,
        lineHeight: 60,
    },
    noQuestionsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noQuestionsEmoji: {
        fontSize: 96,
        marginBottom: 16,
    },
    noQuestionsText: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 32,
        color: '#000000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 24,
        marginBottom: 12,
        backgroundColor: 'transparent',
    },
    appTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#000000',
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#000000',
    },
    profilePlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInitial: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    userInfo: {
        alignItems: 'flex-end', // Right-align text
    },
    userName: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    userGrade: {
        fontSize: 10,
        color: '#666',
        opacity: 0.8,
    },
    imageContainer: {
        marginBottom: 20,
    },
    modal: {
        margin: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        flex: 1,
        width: '100%',
        backgroundColor: 'black',
        justifyContent: 'center',
    },
    fullScreenImage: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    feedbackContainer: {
        alignItems: 'center',
        marginVertical: 20,
        paddingHorizontal: 16,
    },
    correctAnswerContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 16,
        borderRadius: 12,
        marginTop: 12,
        width: '100%',
    },
    correctAnswerLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    correctAnswerText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4CAF50',
        lineHeight: 24,
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
    subjectTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 32,
        includeFontPadding: false,
    },
    questionMeta: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#666',
        textAlign: 'right',
        marginBottom: 8,
        lineHeight: 16,
        includeFontPadding: false,
    },
    reportButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: 8,
        borderRadius: 8,
        alignSelf: 'flex-end',
        marginTop: 8,
    },
    reportButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    footerButtonGroup: {
        flexDirection: 'row',
        gap: 12,
    },
}); 