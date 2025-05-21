import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalSearchParams } from 'expo-router';
import { HOST_URL } from '@/config/api';
import Toast from 'react-native-toast-message';
import { KaTeX } from './components/quiz/KaTeXMaths';
import { SafeAreaView } from 'react-native-safe-area-context';

interface TopicsResponse {
    status: string;
    topics: string[];
}

interface QuestionIdsResponse {
    status: string;
    question_ids: number[];
}

interface Step {
    hint: string;
    type: string;
    teach: string;
    answer: string;
    prompt: string;
    options: string[];
    step_number: number;
    final_expression: string;
    expression?: string;
}

interface Steps {
    id: string;
    grade: number;
    steps: Step[];
    topic: string;
    question: string;
}

interface QuestionResponse {
    id: number;
    question: string;
    type: string;
    context: string;
    answer: string;
    options: {
        option1: string;
        option2: string;
        option3: string;
        option4: string;
    };
    ai_explanation: string;
    topic: string;
    steps?: Steps;
}

export default function MathsScreen() {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const params = useLocalSearchParams();
    const { subjectName, learnerUid, grade } = params;

    const [topics, setTopics] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedQuestion, setSelectedQuestion] = useState<QuestionResponse | null>(null);
    const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'topics' | 'steps'>('topics');
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [questionIds, setQuestionIds] = useState<number[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const styles = getStyles(isDark, colors);

    useEffect(() => {
        if (learnerUid) {
            fetchMathTopics();
        }
    }, [learnerUid]);

    const fetchMathTopics = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(
                `${HOST_URL}/api/maths/topics-with-steps?uid=${learnerUid}`
            );
            const data: TopicsResponse = await response.json();

            if (data.status === 'OK') {
                setTopics(data.topics);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to load math topics',
                });
            }
        } catch (error) {
            console.error('Error fetching math topics:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load math topics',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchQuestionsForTopic = async (topic: string) => {
        try {
            setIsLoadingQuestion(true);
            const response = await fetch(
                `${HOST_URL}/api/maths/questions-with-steps?topic=${encodeURIComponent(topic)}&grade=${grade}`
            );
            const data: QuestionIdsResponse = await response.json();

            if (data.status === 'OK' && data.question_ids.length > 0) {
                setQuestionIds(data.question_ids);
                setCurrentQuestionIndex(0);
                await fetchQuestionDetails(data.question_ids[0]);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'No questions found for this topic',
                });
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load questions',
            });
        } finally {
            setIsLoadingQuestion(false);
        }
    };

    const fetchQuestionDetails = async (questionId: number) => {
        try {
            const response = await fetch(
                `${HOST_URL}/public/learn/question/byname?paper_name=P1&question_id=${questionId}&subject_name=${encodeURIComponent(subjectName as string)}&uid=${learnerUid}&subscriptionCheck=true`
            );
            const data: QuestionResponse = await response.json();
            setSelectedQuestion(data);
        } catch (error) {
            console.error('Error fetching question details:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load question details',
            });
        }
    };

    const loadNextQuestion = async () => {
        if (currentQuestionIndex < questionIds.length - 1) {
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);
            await fetchQuestionDetails(questionIds[nextIndex]);
            setCurrentStepIndex(0);
            setSelectedOptionIndex(null);
            setShowHint(false);
        } else {
            Toast.show({
                type: 'info',
                text1: 'No More Questions',
                text2: 'You have completed all questions in this topic',
            });
        }
    };

    const isOptionCorrect = (option: string) => {
        if (!selectedQuestion?.steps?.steps[currentStepIndex]) return false;
        return option === selectedQuestion.steps.steps[currentStepIndex].answer;
    };

    const isRowLayout = selectedQuestion?.steps?.steps[currentStepIndex]?.options?.every(opt => opt.length < 20);

    function cleanLatex(input: string): string {
        input = removeLatexTextWrappers(input);
        console.log("input", input);
        // Break long \text{...} blocks into two lines if >30 chars
        const textBlockMatch = input.match(/\\text\{([^}]+)\}/);
        if (textBlockMatch && textBlockMatch[1].length > 30) {
            console.log("textBlockMatch", textBlockMatch);
            const textContent = textBlockMatch[1];
            // Find a space near the 30th character to break
            let breakIndex = textContent.lastIndexOf(' ', 30);
            if (breakIndex === -1) breakIndex = 30;
            const firstPart = textContent.slice(0, breakIndex).trim();
            const secondPart = textContent.slice(breakIndex).trim();
            return input.replace(
                /\\text\{([^}]+)\}/,
                `\\text{${firstPart}} \\newline \\text{ ${secondPart} }  \\newline `
            );
        }

        return input
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/ } /g, ' } \\newline ')
            .replace(/(?<!^)\\text/g, '\\newline \\text');
    }

    function calculateKaTeXHeight(latex: string): string {
        const baseHeight = 60;
        const newlineCount = (latex.match(/\\newline/g) || []).length;
        console.log(latex, newlineCount);
        return `${baseHeight + (newlineCount * 45)}px`;
    }

    // Helper to get dynamic font size for KaTeX
    function getKaTeXFontSize(value: string): string {
        if (value.length < 10) return '2em';
        if (value.length < 20) return '1.5em';
        return '1.2em';
    }

    function removeLatexTextWrappers(input: string): string {
        // Check for common LaTeX commands (add more as needed)
        const hasLatex = /\\(frac|sqrt|sum|int|begin|end|over|cdot|leq|geq|neq|pm|times|div|[a-zA-Z]+[\\^_])|[=+-]/g.test(input);
        if (!hasLatex) {
            // Only remove \text{...} if no other LaTeX is present
            return input.replace(/\\text\{([^}]*)\}/g, '$1');
        }
        return input;
    }

    return (
        <LinearGradient
            colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
            style={[styles.gradient, { paddingTop: insets.top }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
            >
                <Header
                    learnerInfo={null}
                />

                <View style={[styles.content, {
                    backgroundColor: isDark ? colors.card : '#FFFFFF',
                    borderColor: colors.border,
                    shadowColor: isDark ? '#000' : '#888',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.10,
                    shadowRadius: 12,
                    elevation: 4,
                }]}>


                    {viewMode === 'topics' && (
                        <View style={styles.topicsGridContainer}>
                            <ThemedText style={styles.topicsHeader}>Select a Topic</ThemedText>
                            <View style={styles.topicsGrid}>
                                {topics.map((topic, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.topicCard}
                                        onPress={async () => {
                                            setSelectedTopic(topic);
                                            await fetchQuestionsForTopic(topic);
                                            setViewMode('steps');
                                            setCurrentStepIndex(0);
                                            setSelectedOptionIndex(null);
                                            setShowHint(false);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Select topic ${topic}`}
                                    >
                                        <ThemedText style={styles.topicCardText}>{topic}</ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}

                    {viewMode === 'steps' && selectedQuestion && !isLoadingQuestion && (
                        <View style={styles.stepsViewContainer}>
                            <View style={[styles.stepsCard, { paddingTop: 8, paddingBottom: 96 }]}>

                                {selectedQuestion?.steps?.question &&
                                    (cleanLatex(selectedQuestion.steps.question.replace(/\$/g, '')).includes('\\') || cleanLatex(selectedQuestion.steps.question.replace(/\$/g, '')).includes('=') ? (
                                        <View style={{ marginTop: 8 }}>
                                            <KaTeX
                                                latex={cleanLatex(selectedQuestion.steps.question.replace(/\$/g, ''))}
                                                isOption={false}
                                                fontSize={getKaTeXFontSize(cleanLatex(selectedQuestion.steps.question.replace(/\$/g, '')))}
                                                height={calculateKaTeXHeight(cleanLatex(selectedQuestion.steps.question.replace(/\$/g, '')))}
                                            />
                                        </View>
                                    ) : (
                                        <ThemedText style={[styles.stepsTitle, { color: colors.text }]}>
                                            {cleanLatex(selectedQuestion.steps.question.replace(/\$/g, ''))}
                                        </ThemedText>
                                    ))}

                                {selectedQuestion.steps && selectedQuestion.steps.steps.length > 0 && (
                                    <View style={[styles.stepsContainer, {
                                        backgroundColor: isDark ? colors.card : '#FFFFFF',
                                        borderColor: colors.border,
                                    }]}>
                                        <View style={{ marginBottom: 8 }}>
                                            <ThemedText style={[styles.stepsTitle, { color: colors.text }]}>
                                                Step {currentStepIndex + 1}:
                                            </ThemedText>
                                            {selectedQuestion?.steps?.steps[currentStepIndex]?.prompt &&
                                                (cleanLatex(selectedQuestion.steps.steps[currentStepIndex].prompt.replace(/\$/g, '')).includes('\\') || cleanLatex(selectedQuestion.steps.steps[currentStepIndex].prompt.replace(/\$/g, '')).includes('=') ? (
                                                    <View style={{ marginTop: 8 }}>
                                                        <KaTeX
                                                            latex={cleanLatex(selectedQuestion.steps.steps[currentStepIndex].prompt.replace(/\$/g, ''))}
                                                            isOption={false}
                                                            fontSize={getKaTeXFontSize(cleanLatex(selectedQuestion.steps.steps[currentStepIndex].prompt.replace(/\$/g, '')))}
                                                            height={calculateKaTeXHeight(cleanLatex(selectedQuestion.steps.steps[currentStepIndex].prompt.replace(/\$/g, '')))}
                                                        />
                                                    </View>
                                                ) : (
                                                    <ThemedText style={[styles.stepsTitle, { color: colors.text }]}>
                                                        {cleanLatex(selectedQuestion.steps.steps[currentStepIndex].prompt.replace(/\$/g, ''))}
                                                    </ThemedText>
                                                ))}
                                        </View>
                                        {selectedQuestion?.steps?.steps[currentStepIndex]?.expression && (
                                            <View style={{ marginBottom: 8 }}>
                                                <KaTeX
                                                    latex={cleanLatex(selectedQuestion.steps.steps[currentStepIndex].expression)}
                                                    fontSize={getKaTeXFontSize(cleanLatex(selectedQuestion.steps.steps[currentStepIndex].expression))}
                                                    height={calculateKaTeXHeight(cleanLatex(selectedQuestion.steps.steps[currentStepIndex].expression))}
                                                />
                                            </View>
                                        )}
                                        <TouchableOpacity
                                            style={{ marginBottom: 8, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8, backgroundColor: isDark ? '#334155' : '#E0E7EF' }}
                                            onPress={() => setShowHint(v => !v)}
                                            accessibilityRole="button"
                                            accessibilityLabel={showHint ? 'Hide hint' : 'Show hint'}
                                        >
                                            <ThemedText style={{ color: isDark ? '#A7F3D0' : '#2563EB', fontWeight: '600' }}>
                                                {showHint ? 'Hide Hint' : 'Show Hint'}
                                            </ThemedText>
                                        </TouchableOpacity>
                                        {showHint && (
                                            // LaTeX support for hint
                                            cleanLatex(selectedQuestion.steps.steps[currentStepIndex].hint.replace(/\$/g, '')).includes('\\') || cleanLatex(selectedQuestion.steps.steps[currentStepIndex].hint.replace(/\$/g, '')).includes('=') ? (
                                                <KaTeX
                                                    latex={cleanLatex(selectedQuestion.steps.steps[currentStepIndex].hint.replace(/\$/g, ''))}
                                                    isOption={false}
                                                    fontSize={getKaTeXFontSize(cleanLatex(selectedQuestion.steps.steps[currentStepIndex].hint.replace(/\$/g, '')))}
                                                    height={calculateKaTeXHeight(cleanLatex(selectedQuestion.steps.steps[currentStepIndex].hint.replace(/\$/g, '')))}
                                                />
                                            ) : (
                                                <ThemedText style={[styles.stepsHint, { color: colors.textSecondary }]}>
                                                    Hint: {cleanLatex(selectedQuestion.steps.steps[currentStepIndex].hint.replace(/\$/g, ''))}
                                                </ThemedText>
                                            )
                                        )}

                                        <View style={[
                                            styles.stepsOptionsContainer,
                                            isRowLayout && styles.stepsOptionsRow
                                        ]}>
                                            {selectedQuestion.steps?.steps[currentStepIndex]?.options.map((option, index) => {
                                                const isSelected = selectedOptionIndex === index;
                                                const isCorrectAnswer = option === selectedQuestion?.steps?.steps[currentStepIndex]?.answer;
                                                const isUserWrong = selectedOptionIndex !== null && !isCorrectAnswer && isSelected;
                                                let optionStyle = [styles.stepOptionButton, isRowLayout && styles.stepOptionButtonRow];
                                                let dynamicOptionColors = {};
                                                if (selectedOptionIndex !== null) {
                                                    if (isCorrectAnswer) {
                                                        // Soft blue for correct
                                                        dynamicOptionColors = { backgroundColor: '#E0F2FE', borderColor: '#38BDF8' };
                                                    } else if (isUserWrong) {
                                                        // Soft pink for incorrect
                                                        dynamicOptionColors = { backgroundColor: '#FCE7F3', borderColor: '#F472B6' };
                                                    }
                                                } else if (!isSelected) {
                                                    dynamicOptionColors = { backgroundColor: isDark ? colors.surface : '#F8FAFC', borderColor: '#E5E7EB' };
                                                }
                                                return (
                                                    <TouchableOpacity
                                                        key={index}
                                                        style={[StyleSheet.flatten(optionStyle), dynamicOptionColors]}
                                                        onPress={() => setSelectedOptionIndex(index)}
                                                        disabled={selectedOptionIndex !== null}
                                                    >
                                                        {cleanLatex(option).includes('\\') || cleanLatex(option).includes('=') ? (
                                                            <KaTeX
                                                                latex={cleanLatex(option)}
                                                                isOption={true}
                                                                fontSize={getKaTeXFontSize(cleanLatex(option))}
                                                                height={calculateKaTeXHeight(cleanLatex(option))}
                                                            />
                                                        ) : (
                                                            <ThemedText style={styles.stepOptionText}>
                                                                {cleanLatex(option)}
                                                            </ThemedText>
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}

                                {selectedOptionIndex !== null && selectedQuestion?.steps?.steps[currentStepIndex] && (
                                    <View style={{ marginTop: 16 }}>
                                        {selectedOptionIndex !== null && (
                                            isOptionCorrect(selectedQuestion.steps.steps[currentStepIndex].options[selectedOptionIndex]) ? (
                                                <ThemedText style={{ fontSize: 20, marginBottom: 8, textAlign: 'center' }} accessibilityRole="alert">🎉 Congratulations!</ThemedText>
                                            ) : (
                                                <ThemedText style={{ fontSize: 20, marginBottom: 8, textAlign: 'center' }} accessibilityRole="alert">❌ Try again!</ThemedText>
                                            )
                                        )}
                                        {cleanLatex(selectedQuestion.steps.steps[currentStepIndex].teach.replace(/\$/g, '')).includes('\\') || cleanLatex(selectedQuestion.steps.steps[currentStepIndex].teach.replace(/\$/g, '')).includes('=') ? (
                                            <KaTeX
                                                latex={cleanLatex(selectedQuestion.steps.steps[currentStepIndex].teach.replace(/\$/g, ''))}
                                                isOption={false}
                                                fontSize={getKaTeXFontSize(cleanLatex(selectedQuestion.steps.steps[currentStepIndex].teach.replace(/\$/g, '')))}
                                                height={calculateKaTeXHeight(cleanLatex(selectedQuestion.steps.steps[currentStepIndex].teach.replace(/\$/g, '')))}
                                            />
                                        ) : (
                                            <ThemedText style={[styles.stepsTeach, { color: colors.textSecondary }]}>
                                                {cleanLatex(selectedQuestion.steps.steps[currentStepIndex].teach.replace(/\$/g, ''))}
                                            </ThemedText>
                                        )}
                                    </View>
                                )}

                                {selectedOptionIndex !== null && currentStepIndex < (selectedQuestion?.steps?.steps.length || 0) - 1 && (
                                    <View style={styles.nextStepIndicator}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setCurrentStepIndex(i => i + 1);
                                                setSelectedOptionIndex(null);
                                                setShowHint(false);
                                            }}
                                            style={styles.nextStepTouchable}
                                            accessibilityRole="button"
                                            accessibilityLabel="Go to next step"
                                        >
                                            <ThemedText style={styles.nextStepText}>Next Step ➡️</ThemedText>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                            <SafeAreaView style={styles.stickyButtonBar} edges={['bottom']}>
                                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
                                    <TouchableOpacity
                                        style={styles.backButton}
                                        onPress={() => {
                                            setViewMode('topics');
                                            setSelectedTopic(null);
                                            setSelectedOptionIndex(null);
                                            setCurrentStepIndex(0);
                                            setShowHint(false);
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel={currentStepIndex > 0 ? 'Previous Step' : 'Back to Topics'}
                                    >
                                        <ThemedText style={styles.backButtonText}>Topics</ThemedText>
                                    </TouchableOpacity>
                                    {selectedQuestion?.steps?.steps && currentStepIndex < selectedQuestion.steps.steps.length - 1 && (
                                        <TouchableOpacity
                                            style={[
                                                styles.modernButton,
                                                selectedOptionIndex === null && styles.modernButtonDisabled,
                                            ]}
                                            onPress={() => {
                                                setCurrentStepIndex(i => i + 1);
                                                setSelectedOptionIndex(null);
                                                setShowHint(false);
                                            }}
                                            accessibilityRole="button"
                                            accessibilityLabel="Next Step"
                                            disabled={selectedOptionIndex === null}
                                        >
                                            <ThemedText style={[
                                                styles.modernButtonText,
                                                selectedOptionIndex === null && { opacity: 0.6 }
                                            ]}>Next</ThemedText>
                                        </TouchableOpacity>
                                    )}
                                    {selectedQuestion?.steps?.steps && currentStepIndex === selectedQuestion.steps.steps.length - 1 && (
                                        <TouchableOpacity
                                            style={styles.modernButton}
                                            onPress={loadNextQuestion}
                                            accessibilityRole="button"
                                            accessibilityLabel="Next Question"
                                        >
                                            <ThemedText style={styles.modernButtonText}>Next Question</ThemedText>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </SafeAreaView>
                        </View>
                    )}
                </View>
            </ScrollView>
        </LinearGradient >
    );
}

function getStyles(isDark: boolean, colors: any) {
    return StyleSheet.create({
        gradient: {
            flex: 1,
        },
        container: {
            flex: 1,
        },
        contentContainer: {
            flexGrow: 1,
            paddingHorizontal: 4,
            paddingBottom: 20,
        },
        content: {
            borderRadius: 20,
            padding: 4,
            marginTop: 28,
            borderWidth: 1,
            backgroundColor: '#FFF',
        },
        title: {
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 10,
            letterSpacing: 0.2,
        },
        subtitle: {
            fontSize: 14,
            marginBottom: 8,
            lineHeight: 26,
            fontWeight: '500',
            letterSpacing: 0.1,
        },
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        topicsGridContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 8,
            backgroundColor: isDark ? '#18181B' : '#F3F4F6',
        },
        topicsHeader: {
            fontSize: 20,
            fontWeight: '700',
            marginBottom: 5,
            color: isDark ? '#A7F3D0' : '#1E293B',
        },
        topicsGrid: {
            width: '100%',
            maxWidth: 480,
            alignSelf: 'center',
        },
        topicCard: {
            width: '100%',
            backgroundColor: isDark ? '#27272A' : '#FFFFFF',
            borderRadius: 18,
            paddingVertical: 28,
            paddingHorizontal: 16,
            marginVertical: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.10,
            shadowRadius: 12,
            elevation: 4,
            alignItems: 'flex-start',
            minHeight: 80,
        },
        topicCardText: {
            fontSize: 18,
            fontWeight: '600',
            color: isDark ? '#A7F3D0' : '#1E293B',
            textAlign: 'left',
        },
        stepsViewContainer: {
            flex: 1,
            backgroundColor: isDark ? '#18181B' : '#F3F4F6',
            borderRadius: 24,
            padding: 0,
            margin: 0,
            alignItems: 'center',
            justifyContent: 'flex-start',
        },
        stepsHeaderRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingHorizontal: 8,
            paddingTop: 8,
            marginBottom: 0,
            width: '100%',
            maxWidth: 420,
            alignSelf: 'center',
        },
        stepsCard: {
            backgroundColor: isDark ? '#23272F' : '#fff',
            borderRadius: 24,
            padding: 8,
            marginHorizontal: 0,
            marginBottom: 16,
            marginTop: 0,
            maxWidth: 420,
            width: '100%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
        },
        questionTextModern: {
            color: isDark ? '#F3F4F6' : '#1E293B',
            fontSize: 16,
            marginBottom: 8,
        },
        stepsTitle: {
            fontSize: 14,
            marginBottom: 12,
        },
        stepsHint: {
            fontSize: 16,
            fontStyle: 'italic',
            marginBottom: 8,
        },
        stepsTeach: {
            fontSize: 16,
            marginBottom: 16,
            lineHeight: 24,
        },
        stepsOptionsContainer: {
            gap: 12,
        },
        stepsOptionsRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: 8,
        },
        stepOptionButton: {
            padding: 16,
            borderRadius: 8,
            borderWidth: 1,
            minHeight: 60,
            justifyContent: 'center',
            width: '100%',
        },
        stepOptionButtonRow: {
            width: '28%',
            marginBottom: 8,
        },
        stepOptionText: {
            fontSize: 16,
        },
        closeButton: {
            backgroundColor: isDark ? '#27272A' : '#E5E7EB',
            borderRadius: 20,
            width: 40,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.10,
            shadowRadius: 6,
            elevation: 2,
        },
        closeButtonText: {
            fontSize: 22,
            color: isDark ? '#A7F3D0' : '#1E293B',
            fontWeight: '700',
        },
        stepsContainer: {
            marginTop: 8,
            padding: 20,
            borderRadius: 12,
            borderWidth: 1,
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: colors.border,
        },
        modernButton: {
            flex: 1,
            minHeight: 56,
            marginHorizontal: 8,
            borderRadius: 16,
            backgroundColor: isDark ? '#6366F1' : '#4F46E5',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 3,
        },
        modernButtonDisabled: {
            backgroundColor: isDark ? '#334155' : '#CBD5E1',
        },
        modernButtonText: {
            color: '#fff',
            fontWeight: '700',
            fontSize: 20,
            letterSpacing: 0.2,
        },
        backButton: {
            flex: 1,
            minHeight: 56,
            marginHorizontal: 8,
            borderRadius: 16,
            backgroundColor: isDark ? '#334155' : '#E5E7EB',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            elevation: 2,
        },
        backButtonText: {
            color: isDark ? '#A7F3D0' : '#1E293B',
            fontWeight: '700',
            fontSize: 20,
            letterSpacing: 0.2,
        },
        stickyButtonBar: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingBottom: 24,
            paddingHorizontal: 16,
            backgroundColor: 'transparent',
            zIndex: 100,
            alignItems: 'center',
        },
        nextStepIndicator: {
            alignItems: 'center',
            marginTop: 24,
            marginBottom: 16,
        },
        nextStepText: {
            fontSize: 16,
            fontWeight: '600',
            color: isDark ? '#6366F1' : '#4F46E5',
            marginBottom: 8,
        },
        arrow: {
            alignItems: 'center',
        },
        arrowBody: {
            width: 2,
            height: 24,
        },
        arrowHead: {
            width: 0,
            height: 0,
            borderLeftWidth: 8,
            borderRightWidth: 8,
            borderTopWidth: 12,
            borderStyle: 'solid',
            backgroundColor: 'transparent',
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
        },
        nextStepTouchable: {
            padding: 8,
            borderRadius: 8,
        },
    });
} 