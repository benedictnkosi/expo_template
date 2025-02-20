import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, Image, TextInput, ScrollView, View, Linking, Switch } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Modal from 'react-native-modal';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import WebView from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/contexts/AuthContext';
import { checkAnswer, getLearner, removeResults, trackStreak, getSubjectStats } from '@/services/api';
import { API_BASE_URL as ConfigAPI_BASE_URL } from '@/config/api';
import { trackEvent, Events } from '@/services/mixpanel';

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

function KaTeX({ latex }: { latex: string }) {
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
                        display: flex;
                        justify-content: flex-start;
                        align-items: center;
                        min-height: 50px;
                        overflow-x: auto;
                    }
                    #formula {
                        min-width: fit-content;
                        padding-right: 16px;
                    }
                    .katex {
                        font-size: 1.5em;
                        white-space: nowrap;
                    }
                    .katex-display {
                        overflow-x: auto;
                        overflow-y: hidden;
                        padding-bottom: 5px;
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
                            strict: false
                        });
                    });
                </script>
            </body>
        </html>
    `;

    return (
        <WebView
            source={{ html }}
            style={{ height: 60, backgroundColor: 'transparent' }}
            scrollEnabled={true}
            showsHorizontalScrollIndicator={false}
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

export default function QuizScreen() {
    const { user } = useAuth();
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
    const [rotation, setRotation] = useState(0);
    const [isRotated, setIsRotated] = useState(false);
    const [subjectId, setSubjectId] = useState<string | null>(null);
    const [selectedPaper, setSelectedPaper] = useState<string | null>(null);
    const [stats, setStats] = useState<SubjectStats['data']['stats'] | null>(null);

    useEffect(() => {
        trackEvent(Events.VIEW_QUIZ, {
            "user_id": user?.uid,
            "subject_id": subjectId
        });

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


    const reportIssue = (questionId: number) => {
        trackEvent(Events.REPORT_ISSUE, {
            "user_id": user?.uid,
            "question_id": questionId
        });
        const message = `Hi, I'd like to report an issue with question #${questionId}`;
        Linking.openURL(`https://api.whatsapp.com/send/?phone=27837917430&text=${encodeURIComponent(message)}`);
        Toast.show({
            type: 'info',
            text1: 'Opening WhatsApp',
            position: 'bottom'
        });
    };

    const loadRandomQuestion = async (paper: string) => {
        if (!user?.uid || !subjectName) {
            console.log("no user or subjectId");
            return;
        }
        // Reset all states before loading new question
        setSelectedAnswer(null);
        setShowFeedback(false);
        setInputAnswer('');
        setIsCorrect(null);

        try {
            setIsLoading(true);
            console.log("before fetch", subjectName, selectedPaper);
            const response = await fetch(
                `${ConfigAPI_BASE_URL}/public/learn/question/byname?subject_name=${subjectName}&paper_name=${paper}&uid=${user.uid}&question_id=0${showAllTerms ? '&show_all_questions=yes' : '&show_all_questions=no'}`
            );
            console.log("after fetch", response);
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
            console.log('Failed to load question:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load question',
                position: 'bottom'
            });
        } finally {
            console.log("finally");
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

            trackEvent(Events.SUBMIT_ANSWER, {
                "user_id": user?.uid,
                "subject_id": subjectId,
                "question_id": question.id,
                "is_correct": response.is_correct
            });

            // Longer delay and force scroll
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);

            trackStreak(user.uid);
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
        if (!selectedPaper) return;
        setSelectedAnswer(null);
        setShowFeedback(false);
        setInputAnswer('');
        loadRandomQuestion(selectedPaper);
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

    const handleRestart = async () => {
        if (!user?.uid || !subjectId) return;

        trackEvent(Events.RESTART_QUIZ, {
            "user_id": user?.uid,
            "subject_id": subjectId
        });
        try {
            setIsLoading(true);
            await removeResults(user.uid, Number(subjectId));
            await loadRandomQuestion(selectedPaper);
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

    const handleRotateImage = () => {
        setIsRotated(!isRotated);
        setRotation(isRotated ? 0 : 90);
    };

    const handleSkipQuestion = () => {
        if (!question || !selectedPaper) return;
        trackEvent(Events.SKIP_QUESTION, {
            "user_id": user?.uid,
            "question_id": question.id
        });
        loadRandomQuestion(selectedPaper);
    };

    if (isLoading) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000000" />
            </ThemedView>
        );
    }

    if (!selectedPaper) {
        return (
            <LinearGradient
                colors={['#1a1a1a', '#000000', '#000000']}
                style={styles.gradient}
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
                        <TouchableOpacity
                            style={styles.paperButton}
                            onPress={() => {
                                setSelectedPaper('P1');
                                loadRandomQuestion('P1');
                            }}
                        >
                            <ThemedText style={styles.paperButtonText}>Paper 1</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.paperButton}
                            onPress={() => {
                                setSelectedPaper('P2');
                                loadRandomQuestion('P2');
                            }}
                        >
                            <ThemedText style={styles.paperButtonText}>Paper 2</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>
        );
    }

    if (!question) {
        return (
            <LinearGradient
                colors={['#1a1a1a', '#000000', '#000000']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <ScrollView style={styles.container}>

                    {/* Subject Title and Meta */}
                    <View style={styles.subjectHeader}>
                        <ThemedText style={styles.subjectTitle}>{subjectName}</ThemedText>
                        {question?.year || question?.term ? (
                            <ThemedText style={styles.questionMeta}>
                                {question?.year && `${question.year}`}
                                {question?.year && question?.term && ' • '}
                                {question?.term && `Term ${question.term}`}
                            </ThemedText>
                        ) : null}
                    </View>

                    <ThemedView style={styles.noQuestionsContainer}>
                        <View style={styles.emojiContainer}>
                            <ThemedText style={styles.noQuestionsEmoji}>
                                🎉
                            </ThemedText>
                        </View>
                        <ThemedText style={styles.noQuestionsText}>
                            Congratulations! You've completed all questions!
                        </ThemedText>
                        <View style={styles.completionButtons}>
                            <TouchableOpacity
                                style={[styles.footerButton, styles.restartButton]}
                                onPress={handleRestart}
                            >
                                <ThemedText style={styles.footerButtonText}>Restart Subject</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.footerButton, styles.nextButton]}
                                onPress={() => router.push('/(tabs)')}
                            >
                                <ThemedText style={styles.footerButtonText}>Back to Subjects</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </ThemedView>
                </ScrollView>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient
            colors={['#1a1a1a', '#000000', '#000000']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <ScrollView
                ref={scrollViewRef}
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={styles.header}>
                    <View style={styles.scoreSection}>
                        <View style={styles.scoreItem}>
                            <ThemedText style={styles.scoreEmoji}>✅</ThemedText>
                            <ThemedText style={styles.scoreValue}>{stats?.correct_answers}</ThemedText>
                        </View>
                        <View style={styles.scoreItem}>
                            <ThemedText style={styles.scoreEmoji}>❌</ThemedText>
                            <ThemedText style={styles.scoreValue}>{stats?.incorrect_answers}</ThemedText>
                        </View>
                    </View>

                    <View style={styles.toggleContainer}>
                        <ThemedText style={styles.toggleLabel}>Term 2 only</ThemedText>
                        <Switch
                            value={!showAllTerms}
                            onValueChange={(value) => setShowAllTerms(!value)}
                            trackColor={{ false: '#333', true: '#2563EB' }}
                            thumbColor="#FFFFFF"
                        />
                    </View>
                </View>

                {/* Subject Title and Meta */}
                <View style={styles.subjectHeader}>
                    <ThemedText style={styles.subjectTitle}>{subjectName}</ThemedText>
                    {question?.year || question?.term ? (
                        <ThemedText style={styles.questionMeta}>
                            {question?.year && `${question.year}`}
                            {question?.year && question?.term && ' • '}
                            {question?.term && `Term ${question.term}`}
                        </ThemedText>
                    ) : null}
                </View>

                <ThemedView style={styles.content}>
                    <ThemedView style={styles.sectionCard}>

                        {question.context && (
                            <View style={styles.questionContainer}>
                                {renderMixedContent(question.context)}
                            </View>
                        )}

                        {(question.image_path || question.question_image_path) && (
                            <ThemedText style={styles.imageCaption}>
                                Click image to enlarge
                            </ThemedText>
                        )}

                        {question.image_path && (
                            <>
                                <TouchableOpacity
                                    onPress={() => setIsImageVisible(true)}
                                    style={styles.imageContainer}
                                >
                                    {isImageLoading && (
                                        <View style={styles.imagePlaceholder}>
                                            <ActivityIndicator color="#000000" />
                                        </View>
                                    )}
                                    <Image
                                        source={{
                                            uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${question.image_path}`
                                        }}
                                        style={styles.questionImage}
                                        resizeMode="contain"
                                        onLoadStart={() => setIsImageLoading(true)}
                                        onLoadEnd={() => setIsImageLoading(false)}
                                    />
                                </TouchableOpacity>

                                <Modal
                                    isVisible={isImageVisible}
                                    onBackdropPress={() => {
                                        setIsImageVisible(false);
                                        setRotation(0);
                                    }}
                                    onSwipeComplete={() => {
                                        setIsImageVisible(false);
                                        setRotation(0);
                                    }}
                                    swipeDirection="down"
                                    style={styles.modal}
                                >
                                    <View style={styles.modalContent}>
                                        <TouchableOpacity
                                            style={styles.closeButton}
                                            onPress={() => {
                                                setIsImageVisible(false);
                                                setRotation(0);
                                            }}
                                        >
                                            <ThemedText style={styles.closeButtonText}>✕</ThemedText>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.rotateButton}
                                            onPress={handleRotateImage}
                                        >
                                            <ThemedText style={styles.rotateButtonText}>⟳</ThemedText>
                                        </TouchableOpacity>

                                        <Image
                                            source={{
                                                uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${question.image_path}`
                                            }}
                                            style={[
                                                styles.fullScreenImage,
                                                { transform: [{ rotate: `${rotation}deg` }] }
                                            ]}
                                            resizeMode="contain"
                                        />
                                    </View>
                                </Modal>
                            </>
                        )}

                        {question.question_image_path && (
                            <>
                                <TouchableOpacity
                                    onPress={() => setIsImageVisible(true)}
                                    style={styles.imageContainer}
                                >
                                    {isImageLoading && (
                                        <View style={styles.imagePlaceholder}>
                                            <ActivityIndicator color="#000000" />
                                        </View>
                                    )}
                                    <Image
                                        source={{
                                            uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${question.question_image_path}`
                                        }}
                                        style={styles.questionImage}
                                        resizeMode="contain"
                                        onLoadStart={() => setIsImageLoading(true)}
                                        onLoadEnd={() => setIsImageLoading(false)}
                                    />
                                </TouchableOpacity>

                                <Modal
                                    isVisible={isImageVisible}
                                    onBackdropPress={() => {
                                        setIsImageVisible(false);
                                        setRotation(0);
                                    }}
                                    onSwipeComplete={() => {
                                        setIsImageVisible(false);
                                        setRotation(0);
                                    }}
                                    swipeDirection="down"
                                    style={styles.modal}
                                >
                                    <View style={styles.modalContent}>
                                        <TouchableOpacity
                                            style={styles.closeButton}
                                            onPress={() => {
                                                setIsImageVisible(false);
                                                setRotation(0);
                                            }}
                                        >
                                            <ThemedText style={styles.closeButtonText}>✕</ThemedText>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.rotateButton}
                                            onPress={handleRotateImage}
                                        >
                                            <ThemedText style={styles.rotateButtonText}>⟳</ThemedText>
                                        </TouchableOpacity>

                                        <Image
                                            source={{
                                                uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${question.question_image_path}`
                                            }}
                                            style={[
                                                styles.fullScreenImage,
                                                { transform: [{ rotate: `${rotation}deg` }] }
                                            ]}
                                            resizeMode="contain"
                                        />
                                    </View>
                                </Modal>
                            </>
                        )}

                        {question.question && (
                            <View style={styles.questionContainer}>
                                {renderMixedContent(question.question)}
                            </View>
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
                                        {cleanAnswer(question.answer).includes('$') ? (
                                            <KaTeX latex={cleanAnswer(question.answer).replace(/\$/g, '')} />
                                        ) : (
                                            <ThemedText style={styles.correctAnswerText}>
                                                {cleanAnswer(question.answer)}
                                            </ThemedText>
                                        )}
                                        {question.answer_image && (
                                            <TouchableOpacity
                                                onPress={() => setIsAnswerImageVisible(true)}
                                                style={styles.imageContainer}
                                            >
                                                {isAnswerImageLoading && (
                                                    <View style={styles.imagePlaceholder}>
                                                        <ActivityIndicator color="#000000" />
                                                    </View>
                                                )}
                                                <Image
                                                    source={{
                                                        uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${question.answer_image}`
                                                    }}
                                                    style={styles.answerImage}
                                                    resizeMode="contain"
                                                    onLoadStart={() => setIsAnswerImageLoading(true)}
                                                    onLoadEnd={() => setIsAnswerImageLoading(false)}
                                                />
                                            </TouchableOpacity>
                                        )}
                                        {question.explanation && (
                                            <View style={styles.questionContainer}>
                                                {renderMixedContent(cleanAnswer(question.explanation))}
                                            </View>
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
                <TouchableOpacity
                    style={styles.footerButton}
                    onPress={handleSkipQuestion}
                >
                    <View style={styles.footerButtonContent}>
                        <Ionicons name="play-skip-forward" size={24} color="#FFFFFF" />
                        <ThemedText style={styles.footerButtonText}>Next Question</ThemedText>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.footerButton}
                    onPress={() => router.push('/(tabs)')}
                >
                    <View style={styles.footerButtonContent}>
                        <Ionicons name="cafe" size={24} color="#FFFFFF" />
                        <ThemedText style={styles.footerButtonText}>Take a Break</ThemedText>
                    </View>
                </TouchableOpacity>
            </ThemedView>

            {question.answer_image && (
                <Modal
                    isVisible={isAnswerImageVisible}
                    onBackdropPress={() => setIsAnswerImageVisible(false)}
                    onSwipeComplete={() => setIsAnswerImageVisible(false)}
                    swipeDirection="down"
                    style={styles.modal}
                >
                    <View style={styles.modalContent}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setIsAnswerImageVisible(false)}
                        >
                            <ThemedText style={styles.closeButtonText}>✕</ThemedText>
                        </TouchableOpacity>
                        <Image
                            source={{
                                uri: `${ConfigAPI_BASE_URL}/public/learn/learner/get-image?image=${question.answer_image}`
                            }}
                            style={styles.fullScreenImage}
                            resizeMode="contain"
                        />
                    </View>
                </Modal>
            )}
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
        color: '#FFFFFF',
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
        color: '#FFFFFF',
        marginRight: 8,
        fontSize: 14,
    },
    subjectHeader: {
        padding: 16,
        marginTop: 20,
    },
    subjectTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    questionMeta: {
        fontSize: 14,
        color: '#999',
        flexWrap: 'wrap',
    },
    content: {
        gap: 20,
        backgroundColor: 'transparent',
        padding: 16,
    },
    sectionCard: {
        backgroundColor: '#333',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#444',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        gap: 16,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1A1A1A',
    },
    footerButton: {
        flex: 1,
        backgroundColor: '#333',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',

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
        marginBottom: 16,
    },
    questionText: {
        color: '#FFFFFF',
        fontSize: 16,
        lineHeight: 24,
    },
    optionsContainer: {
        gap: 12,
        marginTop: 20,
        backgroundColor: '#00000020',
        borderColor: '#000000',
    },
    optionButton: {
        backgroundColor: '#444',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#555',
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
        color: '#FFFFFF',
        fontSize: 16,
    },
    nextButton: {
        backgroundColor: 'rgba(130, 122, 122, 0.2)'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
        color: 'white',
    },
    contextText: {
        fontSize: 14,
        marginBottom: 16,
        color: '#FFFFFF',
        lineHeight: 20,
    },
    option: {
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#333',
        borderWidth: 1,
        borderColor: '#444',
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
        backgroundColor: '#333',
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        height: 48,
        color: '#FFFFFF',
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
        backgroundColor: 'transparent',
    },
    emojiContainer: {
        height: 80,
        justifyContent: 'center',
        marginBottom: 16,
    },
    noQuestionsEmoji: {
        fontSize: 64,
        textAlign: 'center',
        includeFontPadding: false,
        lineHeight: 80,
    },
    noQuestionsText: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 32,
        color: '#FFFFFF',
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
        alignItems: 'center',
    },
    fullScreenImage: {
        width: '100%',
        height: '100%',
        transform: [{ rotate: '0deg' }],
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
        backgroundColor: '#00000020',
        borderColor: '#000000',
    },
    correctAnswerContainer: {
        backgroundColor: '#00000020',
        borderColor: '#000000',
        padding: 16,
        borderRadius: 12,
        marginTop: 12,
        width: '100%',
        borderWidth: 1,
    },
    correctAnswerLabel: {
        fontSize: 14,
        color: '#999',
        marginBottom: 4,
    },
    correctAnswerText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#22C55E',
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
    imagePlaceholder: {
        position: 'absolute',
        width: '100%',
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#333',
        borderRadius: 8,
        zIndex: 1,
        color: 'white',
    },
    completionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    rotateButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        zIndex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rotateButtonText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    imageCaption: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginBottom: 8,
        fontStyle: 'italic'
    },
    mixedContentContainer: {
        width: '100%',
        gap: 12,
    },
    latexContainer: {
        width: '100%',
        marginVertical: 4,
        backgroundColor: '#333',
    },
    contentText: {
        fontSize: 16,
        lineHeight: 24,
        marginVertical: 4,
        color: '#FFFFFF',
    },
    reportButton: {
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
        backgroundColor: '#333',
        padding: 20,
        borderRadius: 12,
        width: 150,
        alignItems: 'center',
    },
    paperButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
    },
    subjectIcon: {
        width: 240,
        height: 240,
        marginBottom: 16,
    },
}); 