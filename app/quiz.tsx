import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, ScrollView, View, Linking, Platform } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import Modal from 'react-native-modal';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import WebView from 'react-native-webview';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/contexts/AuthContext';
import { checkAnswer, getLearner, removeResults } from '@/services/api';
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
    result: 'correct' | 'incorrect';
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
    const [isImageLoading, setIsImageLoading] = useState(true);
    const [isAnswerImageVisible, setIsAnswerImageVisible] = useState(false);
    const [isAnswerImageLoading, setIsAnswerImageLoading] = useState(true);
    const scrollViewRef = React.useRef<ScrollView>(null);
    const [showAllTerms, setShowAllTerms] = useState(true);
    const [rotation, setRotation] = useState(0);

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
                `${ConfigAPI_BASE_URL}/public/learn/question/random?subject_id=${subjectId}&uid=${user.uid}&question_id=0${showAllTerms ? '&show_all_questions=yes' : '&show_all_questions=no'}`
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

    const handleRestart = async () => {
        if (!user?.uid || !subjectId) return;

        try {
            setIsLoading(true);
            await removeResults(user.uid, Number(subjectId));
            await loadRandomQuestion();
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
        setRotation(prev => (prev + 90) % 360);
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
            <LinearGradient
                colors={['#DBEAFE', '#F3E8FF']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            >
                <ScrollView style={styles.container}>
                    <Header
                        title="Exam Quiz"
                        user={user}
                        learnerInfo={learnerInfo}
                    />

                    {new Date().getMonth() < 6 && (
                        <ThemedView style={styles.headerControls}>
                            <View style={styles.filterRow}>
                                <ThemedText style={styles.filterLabel}>
                                    Show Only term 2 questions?
                                </ThemedText>
                                <View style={styles.buttonGroup}>
                                    <TouchableOpacity
                                        style={[styles.filterButton, !showAllTerms && styles.filterButtonActive]}
                                        onPress={() => setShowAllTerms(false)}
                                    >
                                        <ThemedText style={[styles.filterButtonText, !showAllTerms && styles.filterButtonTextActive]}>
                                            Yes
                                        </ThemedText>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.filterButton, showAllTerms && styles.filterButtonActive]}
                                        onPress={() => setShowAllTerms(true)}
                                    >
                                        <ThemedText style={[styles.filterButtonText, showAllTerms && styles.filterButtonTextActive]}>
                                            No
                                        </ThemedText>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </ThemedView>
                    )}

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

                {new Date().getMonth() < 6 && (
                    <ThemedView style={styles.headerControls}>
                        <View style={styles.filterRow}>
                            <ThemedText style={styles.filterLabel}>
                                Show Only term 2 questions?
                            </ThemedText>
                            <View style={styles.buttonGroup}>
                                <TouchableOpacity
                                    style={[styles.filterButton, !showAllTerms && styles.filterButtonActive]}
                                    onPress={() => setShowAllTerms(false)}
                                >
                                    <ThemedText style={[styles.filterButtonText, !showAllTerms && styles.filterButtonTextActive]}>
                                        Yes
                                    </ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.filterButton, showAllTerms && styles.filterButtonActive]}
                                    onPress={() => setShowAllTerms(true)}
                                >
                                    <ThemedText style={[styles.filterButtonText, showAllTerms && styles.filterButtonTextActive]}>
                                        No
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ThemedView>
                )}

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
                            <View style={styles.questionContainer}>
                                {renderMixedContent(question.context)}
                            </View>
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
                            <ThemedText style={styles.footerButtonText}>I'm tired</ThemedText>
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
        marginBottom: 20,
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
        marginTop: 20,
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
    imagePlaceholder: {
        position: 'absolute',
        width: '100%',
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        zIndex: 1,
    },
    completionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    headerControls: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    filterLabel: {
        fontSize: 14,
        color: '#666666',
        flex: 1,
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
            web: {
                boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
            },
        }),
    },
    filterButtonActive: {
        backgroundColor: '#000000',
        borderColor: '#000000',
    },
    filterButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666666',
    },
    filterButtonTextActive: {
        color: '#FFFFFF',
    },
    mixedContentContainer: {
        width: '100%',
        gap: 12,
    },
    latexContainer: {
        width: '100%',
        marginVertical: 4,
    },
    contentText: {
        fontSize: 16,
        lineHeight: 24,
        marginVertical: 4,
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
}); 