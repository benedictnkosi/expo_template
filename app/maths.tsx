import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator, Text, Image } from 'react-native';
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
import { QuizAdditionalImage } from './components/quiz/QuizAdditionalImage';
import { getLearner } from '@/services/api';
import { PerformanceSummary } from './components/quiz/PerformanceSummary';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface LearnerInfo {
    name: string;
    grade: string;
    curriculum?: string;
    terms?: string;
    photoURL?: string;
    imagePath?: string;
    avatar?: string;
    subscription?: string;
    school_name?: string;
    role?: string;
}

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
    image_path?: string;
    question_image_path?: string;
}

// Emoji map for topics
const TOPIC_EMOJIS = [
    { emoji: '➕', label: 'Addition' },
    { emoji: '➖', label: 'Subtraction' },
    { emoji: '✖️', label: 'Multiplication' },
    { emoji: '➗', label: 'Division' },
    { emoji: '🟰', label: 'Equals' },
    { emoji: '🔢', label: 'Numbers' },
    { emoji: '📐', label: 'Triangle Ruler' },
    { emoji: '📏', label: 'Straight Ruler' },
    { emoji: '🧮', label: 'Abacus' },
    { emoji: '📊', label: 'Bar Chart' },
    { emoji: '📈', label: 'Line Chart Up' },
    { emoji: '📉', label: 'Line Chart Down' },
    { emoji: '🧠', label: 'Thinking/Logic' },
    { emoji: '🔍', label: 'Search/Find' },
    { emoji: '🎯', label: 'Target/Accuracy' },
    { emoji: '📝', label: 'Notes/Working Out' },
    { emoji: '🗒️', label: 'Notepad' },
    { emoji: '💡', label: 'Idea/Concept' },
    { emoji: '🕒', label: 'Time/Clock' },
    { emoji: '🧊', label: 'Cube (Geometry)' },
];

function getTopicEmoji(topic: string) {
    const found = TOPIC_EMOJIS.find(e => topic.toLowerCase().includes(e.label.toLowerCase()));
    return found ? found.emoji : '📚';
}

// Helper to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Helper to shuffle options and track correct answer index
function shuffleOptionsWithAnswer(options: string[], answer: string) {
    const arr = [...options];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const correctIndex = arr.findIndex(opt => opt.trim() === answer.trim());
    return { shuffled: arr, correctIndex };
}

export default function MathsScreen() {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const params = useLocalSearchParams();
    const { subjectName, learnerUid, grade } = params;
    const scrollViewRef = React.useRef<ScrollView>(null);
    const progressRef = React.useRef<View>(null);

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
    const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
    const [progressBarPosition, setProgressBarPosition] = useState(0);
    const [learnerInfo, setLearnerInfo] = useState<LearnerInfo | null>(null);
    const [scoreStats, setScoreStats] = useState({
        total_answers: 0,
        correct_answers: 0,
        incorrect_answers: 0,
        correct_percentage: 0,
        incorrect_percentage: 0,
    });
    const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
    const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number>(-1);

    const styles = getStyles(isDark, colors);

    // Memoize sortedSteps to avoid infinite update loop
    const sortedSteps = useMemo(() => {
        return selectedQuestion?.steps?.steps
            ? [...selectedQuestion.steps.steps].sort((a, b) => a.step_number - b.step_number)
            : [];
    }, [selectedQuestion?.steps?.steps]);

    useEffect(() => {
        if (learnerUid) {
            fetchMathTopics();
        }
    }, [learnerUid]);

    useEffect(() => {
        async function fetchLearnerInfo() {
            if (!user?.uid) return;
            try {
                const learner = await getLearner(user.uid);
                const name = learner.name || '';
                // Extract grade number from the nested grade object
                const gradeNumber = learner.grade?.number?.toString() || '';

                setLearnerInfo({
                    name,
                    grade: gradeNumber,
                    curriculum: learner.curriculum || '',
                    terms: learner.terms || '',
                    imagePath: user.photoURL || "",
                    avatar: learner.avatar || "",
                    subscription: (learner as any).subscription || 'free', // Type assertion to handle API response
                    school_name: learner.school_name || '',
                    role: learner.role || '',
                });

            } catch (error) {
                console.log('Failed to fetch learner info:', error);
            }
        }
        fetchLearnerInfo();
    }, [user?.uid]);

    const fetchMathTopics = async () => {
        try {
            setIsLoading(true);
            let $url = `${HOST_URL}/api/maths/topics-with-steps?uid=${learnerUid}&subject_name=${subjectName}`
            console.log("fetchMathTopics", $url)
            const response = await fetch(
                $url
            );
            const data: TopicsResponse = await response.json();

            console.log("data.topics", data.topics)
            if (data.status === 'OK') {
                setTopics(data.topics.filter(topic => !topic.includes('NO MATCH')));
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

            //some cleaning of latex. replace =\frac with =\\frac
            console.log("data.steps", data.steps)
            data.steps?.steps.forEach(step => {
                step.answer = step.answer.replace(/\=\frac/g, '=\\frac');
            });
            console.log("data.steps after cleaning", data.steps)

            setSelectedQuestion(data);
            console.log("data.question_image_path", data.question_image_path)
            console.log("data.image_path", data.image_path)
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
            setCorrectAnswersCount(0);
            // Scroll to top after loading next question
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        } else {
            Toast.show({
                type: 'info',
                text1: 'No More Questions',
                text2: 'You have completed all questions in this topic',
            });
        }
    };



    let isRowLayout = false;
    if (selectedQuestion?.steps?.steps[currentStepIndex]?.answer) {
        if (isLatex(selectedQuestion?.steps?.steps[currentStepIndex]?.answer as string)) {
            isRowLayout = false;
        } else {
            isRowLayout = selectedQuestion?.steps?.steps[currentStepIndex]?.options?.every(opt => opt.length < 4);
        }
    }

    // Shuffle options and set correct answer index when step changes
    useEffect(() => {
        if (sortedSteps[currentStepIndex]?.options) {
            const { shuffled, correctIndex } = shuffleOptionsWithAnswer(
                sortedSteps[currentStepIndex].options,
                sortedSteps[currentStepIndex].answer
            );
            setShuffledOptions(shuffled);
            setCorrectAnswerIndex(correctIndex);
        } else {
            setShuffledOptions([]);
            setCorrectAnswerIndex(-1);
        }
    }, [currentStepIndex, sortedSteps]);

    // Helper to check if text contains LaTeX
    function isLatex(text: string): boolean {
        if (!text) return false;

        // Count unique alphabets
        const uniqueAlphabets = new Set(text.match(/[a-z]/g) || []);
        console.log(`Unique alphabets in "${text}": ${uniqueAlphabets.size} (${Array.from(uniqueAlphabets).join(', ')})`);

        //count unique numbers
        const uniqueNumbers = new Set(text.match(/\d/g) || []);
        console.log(`Unique numbers in "${text}": ${uniqueNumbers.size} (${Array.from(uniqueNumbers).join(', ')})`);

        //count number of spaces
        const spaceCount = (text.match(/\s/g) || []).length;
        console.log(`Space count in "${text}": ${spaceCount}`);
        if (spaceCount === 0) {
            return true;
        }

        if (uniqueNumbers.size > uniqueAlphabets.size) {
            return true;
        }

        // Check for common LaTeX delimiters
        const latexPatterns = [
            /\$[^$]+\$/,           // Inline math: $...$
            /\\\([^)]+\\\)/,       // Inline math: \(...\)
            /\\\[[^\]]+\\\]/,      // Display math: \[...\]
            /\\begin\{[^}]+\}/,    // LaTeX environments
            /\\[a-zA-Z]+/,         // LaTeX commands
            /\\frac\{[^}]+\}\{[^}]+\}/, // Fractions
            /\\sqrt\{[^}]+\}/,     // Square roots
            /\\sum/,               // Sum symbol
            /\\int/,               // Integral symbol
            /\\lim/,               // Limit symbol
            /\\infty/,             // Infinity symbol
            /\\alpha|\\beta|\\gamma|\\delta|\\theta|\\lambda|\\mu|\\pi|\\sigma|\\omega/, // Greek letters
        ];

        return latexPatterns.some(pattern => pattern.test(text));
    }

    // Add helper function
    let isOpeningDollarSign = false
    let isClosingDollarSignNextLine = false
    function renderMixedContent(text: string, isDark: boolean, colors: any, isOption = false) {
        if (!text) return null;
        console.log("renderMixedContent", text)

        //is latex and does not contain multiple $ count number of $
        const dollarCount = (text.match(/\$/g) || []).length;
        if (isLatex(text) && dollarCount < 2) {
            console.log("isLatex", text)
            //does not start with $
            if (!text.startsWith('$')) {
                text = `$${text}`
            }
            //does not end with $
            if (!text.endsWith('$')) {
                text = `${text}$`
            }
        }
        // Replace LaTeX \ldots with ...
        text = text.replace(/\\ldots/g, '...');

        if (text.includes('$') && text.trim().length < 3 && !isOpeningDollarSign && !isClosingDollarSignNextLine) {
            isOpeningDollarSign = true
            return ''
        }

        if (isOpeningDollarSign) {
            isOpeningDollarSign = false
            isClosingDollarSignNextLine = true
            text = `$${text}$`
        }

        if (text.includes('$') && text.trim().length < 3 && isClosingDollarSignNextLine) {
            isClosingDollarSignNextLine = false
            return ''
        }

        if (text.includes(':') && text.trim().length < 3) {
            return ''
        }

        if (text.includes('$')) {
            //replace \$ with $
            text = text.replace(/\\\$/g, '$')
            //remove ** from the text
            text = text.replace(/\*\*/g, '')

            // Clean up LaTeX commands
            text = text.replace(/\\newlineeq/g, '=')  // Replace \\newlineeq with =
            text = text.replace(/\\newline/g, '\\\\')    // Replace \\newline with LaTeX new line

            // First split by LaTeX delimiters
            const parts = text.split(/(\$[^$]+\$)/g);

            return (
                <View style={styles.mixedContentContainer}>
                    {parts.map((part, index) => {
                        console.log("part", part)
                        if (part.startsWith('$') && part.endsWith('$')) {
                            //remove new line
                            part = part.replace(/\n/g, '');
                            // LaTeX content
                            return (
                                <View key={index} style={styles.latexContainer}>
                                    <KaTeX
                                        latex={part.slice(1, -1)} // replace *** with ""
                                    />
                                </View>
                            );
                        } else {
                            console.log("part not latex", part)
                            const fontSize = part.length > 500 ? 12 : 18;

                            if (part.trim().endsWith(':')) {
                                part = part.trim().slice(0, -1);
                            }

                            // Remove leading comma and trim
                            if (part.startsWith(',')) {
                                part = part.slice(1).trim();
                            }

                            // Remove leading comma and trim
                            if (part.startsWith(';')) {
                                part = part.slice(1).trim();
                            }

                            // Remove leading dot and trim
                            if (part.startsWith('.')) {
                                part = part.slice(1).trim();
                            }

                            // Remove leading comma and trim
                            if (part.endsWith(',')) {
                                part = part.slice(0, -1).trim();
                            }

                            // Remove leading dot and trim
                            if (part.endsWith('.')) {
                                part = part.slice(0, -1).trim();
                            }

                            // Remove leading dot and trim
                            if (part.endsWith('?')) {
                                part = part.slice(0, -1).trim();
                            }


                            return (
                                <ThemedText key={index} style={[styles.contentText, { color: colors.text }]}>
                                    {part.replace(/\*\*/g, '')}
                                </ThemedText>
                            );
                        }
                    })}
                </View>
            );
        }
        // First split by new line
        const parts = text.split('#$%');

        return (
            <View style={styles.mixedContentContainer}>
                {parts.map((part, index) => {
                    // Handle regular text with markdown
                    if (part.trim()) {
                        // Add extra spacing before lines starting with ***
                        const needsExtraSpacing = part.trim().startsWith('***');
                        const fontSize = part.length > 500 ? 12 : 18;
                        if (part.trim().endsWith(':')) {
                            part = part.trim().slice(0, -1);
                        }



                        // Handle regular text with bold formatting
                        const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
                        return (
                            <View key={index} style={[
                                styles.textContainer,
                                needsExtraSpacing && { marginTop: 2 },

                            ]}>

                                {boldParts.map((boldPart, boldIndex) => {


                                    // For regular text (not LaTeX, not markdown), apply centered and italic if isOption
                                    if (isOption) {
                                        return (
                                            <ThemedText
                                                key={index}
                                                style={{ textAlign: 'center', fontStyle: 'italic', color: colors.text, fontSize: 14, width: '100%' }}
                                            >
                                                {part}
                                            </ThemedText>
                                        );
                                    }

                                    return boldPart ? (
                                        <ThemedText
                                            key={`${index}-${boldIndex}`}
                                            style={[styles.contentText, { color: colors.text, fontSize }]}
                                        >
                                            {boldPart.replace(/^\*\*\*/, '')}
                                        </ThemedText>
                                    ) : null;
                                })}
                            </View>
                        );
                    }
                    return null;
                })}
            </View>
        );
    }

    return (
        <LinearGradient
            colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
            style={[styles.gradient, { paddingTop: insets.top }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >

            <ScrollView
                ref={scrollViewRef}
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
            >
                <Header
                    learnerInfo={learnerInfo}
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


                    {/* Close Icon Button */}


                    {viewMode === 'topics' && (
                        <View style={styles.topicsGridContainer}>
                            <View style={{ position: 'absolute', top: insets.top - 48, right: 16, zIndex: 100 }}>
                                <TouchableOpacity
                                    onPress={() => router.push({
                                        pathname: '/quiz',
                                        params: {
                                            subjectName: typeof subjectName === 'string' ? subjectName.replace(' P1', '').replace(' P2', '') : subjectName,
                                            learnerName: learnerInfo?.name,
                                            learnerGrade: learnerInfo?.grade,
                                            learnerSchool: learnerInfo?.school_name,
                                            learnerRole: learnerInfo?.role
                                        }
                                    })}
                                    accessibilityRole="button"
                                    accessibilityLabel="Close"
                                    style={{
                                        backgroundColor: isDark ? '#23272F' : '#F3F4F6',
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
                                    }}
                                >
                                    <Ionicons name="close" size={28} color={isDark ? '#A7F3D0' : '#1E293B'} />
                                </TouchableOpacity>
                            </View>
                            <ThemedText style={styles.topicsHeader}>🧠 What Do You Want to Practice Today?</ThemedText>
                            {topics.length === 0 ? (
                                <View style={styles.emptyStateContainer}>
                                    <Image
                                        source={require('@/assets/images/illustrations/stressed.png')}
                                        style={styles.emptyStateImage}
                                        resizeMode="contain"
                                    />
                                    <ThemedText style={styles.emptyStateTitle}>😅 Looks like the bookshelf is empty!</ThemedText>
                                    <ThemedText style={styles.emptyStateText}>
                                        We couldn't find any topics to practice. Please try again later or contact support if this persists.
                                    </ThemedText>
                                </View>
                            ) : (
                                <View style={styles.topicsGrid}>
                                    {topics.map((topic, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.topicCard}
                                            onPress={async () => {
                                                setSelectedTopic(topic);
                                                setScoreStats({
                                                    total_answers: 0,
                                                    correct_answers: 0,
                                                    incorrect_answers: 0,
                                                    correct_percentage: 0,
                                                    incorrect_percentage: 0,
                                                });
                                                await fetchQuestionsForTopic(topic);
                                                setViewMode('steps');
                                                setCurrentStepIndex(0);
                                                setSelectedOptionIndex(null);
                                                setShowHint(false);
                                            }}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Select topic ${topic}`}
                                        >
                                            <ThemedText style={styles.topicCardText}>
                                                <Text>{getTopicEmoji(topic)} </Text>{topic}
                                            </ThemedText>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {viewMode === 'steps' && (
                        <>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginLeft: 8, marginBottom: 24 }}
                                onPress={() => {
                                    setViewMode('topics');
                                    setSelectedTopic(null);
                                    setSelectedOptionIndex(null);
                                    setCurrentStepIndex(0);
                                    setShowHint(false);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Back to Topics"
                            >
                                <Text style={{ fontSize: 18, marginRight: 4 }}>⬅️</Text>
                                <ThemedText style={{ fontSize: 16, color: colors.textSecondary }}>Back to Topics</ThemedText>
                            </TouchableOpacity>
                            {selectedTopic && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 18, marginRight: 6 }}>📚</Text>
                                    <ThemedText style={{ fontSize: 18, fontWeight: '600', color: colors.text }}>{selectedTopic}</ThemedText>
                                </View>
                            )}

                            {viewMode === 'steps' && (
                                <PerformanceSummary
                                    stats={scoreStats}
                                    onRestart={() => setScoreStats({
                                        total_answers: 0,
                                        correct_answers: 0,
                                        incorrect_answers: 0,
                                        correct_percentage: 0,
                                        incorrect_percentage: 0,
                                    })}
                                />
                            )}

                            {/* Add Question Navigation Arrows and Progress Indicator */}
                            <View style={{ alignItems: 'center', marginBottom: 8 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 4 }}>
                                    <TouchableOpacity
                                        onPress={async () => {
                                            if (currentQuestionIndex > 0) {
                                                const prevIndex = currentQuestionIndex - 1;
                                                setCurrentQuestionIndex(prevIndex);
                                                await fetchQuestionDetails(questionIds[prevIndex]);
                                                setCurrentStepIndex(0);
                                                setSelectedOptionIndex(null);
                                                setShowHint(false);
                                                setCorrectAnswersCount(0);
                                                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                                            }
                                        }}
                                        disabled={currentQuestionIndex === 0}
                                        style={{ opacity: currentQuestionIndex === 0 ? 0.5 : 1, padding: 8 }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Previous Question"
                                    >
                                        <Ionicons name="arrow-back-circle" size={32} color={isDark ? '#6366F1' : '#4F46E5'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={loadNextQuestion}
                                        disabled={currentQuestionIndex === questionIds.length - 1}
                                        style={{ opacity: currentQuestionIndex === questionIds.length - 1 ? 0.5 : 1, padding: 8 }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Next Question"
                                    >
                                        <Ionicons name="arrow-forward-circle" size={32} color={isDark ? '#6366F1' : '#4F46E5'} />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.questionProgressWrapper}>
                                    <View style={styles.questionProgressContainer}>
                                        <View style={styles.questionProgressBar}>
                                            <View
                                                style={[
                                                    styles.questionProgressFill,
                                                    {
                                                        width: `${((currentQuestionIndex + 1) / questionIds.length) * 100}%`,
                                                        backgroundColor: '#22C55E' // Green
                                                    }
                                                ]}
                                            />
                                        </View>
                                        <ThemedText style={styles.questionProgressText}>
                                            Question {currentQuestionIndex + 1} of {questionIds.length}
                                        </ThemedText>
                                    </View>
                                </View>
                            </View>
                        </>
                    )}

                    {viewMode === 'steps' && selectedQuestion && !isLoadingQuestion && (
                        <View style={styles.stepsViewContainer}>
                            <View style={[styles.stepsCard, { paddingTop: 8, paddingBottom: 96 }]}>

                                {selectedQuestion?.context && (
                                    <View style={{ marginTop: 8 }}>
                                        {selectedQuestion.context.split('\n').map((line, index) => (
                                            <View key={index}>
                                                {renderMixedContent(line, isDark, colors)}
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {selectedQuestion?.image_path && selectedQuestion.image_path !== 'NULL' && (
                                    <View style={{ alignItems: 'center', marginVertical: 8 }}>
                                        <QuizAdditionalImage
                                            imagePath={selectedQuestion.image_path}
                                            onZoom={() => { }}
                                        />
                                    </View>
                                )}



                                {selectedQuestion?.question && (
                                    <View style={{ marginTop: 8, marginBottom: 24 }}>
                                        {selectedQuestion.question.split('\n').map((line, index) => (
                                            <View key={index}>
                                                {renderMixedContent(line, isDark, colors)}
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {selectedQuestion?.question_image_path && selectedQuestion.question_image_path !== 'NULL' && (
                                    <View style={{ alignItems: 'center', marginVertical: 8 }}>
                                        <QuizAdditionalImage
                                            imagePath={selectedQuestion.question_image_path}
                                            onZoom={() => { }}
                                        />
                                    </View>
                                )}

                                {/* Add Progress Indicator */}
                                {selectedQuestion.steps && sortedSteps.length > 0 && (
                                    <View ref={progressRef} style={styles.progressContainer}>
                                        <View style={styles.progressBar}>
                                            <View
                                                style={[
                                                    styles.progressFill,
                                                    {
                                                        width: `${((currentStepIndex + 1) / sortedSteps.length) * 100}%`,
                                                        backgroundColor: isDark ? '#6366F1' : '#4F46E5'
                                                    }
                                                ]}
                                            />
                                        </View>
                                        <ThemedText style={[styles.progressText, { textAlign: 'center', fontSize: 24, fontWeight: 'bold', marginVertical: 8 }]}>
                                            Step {currentStepIndex + 1} of {sortedSteps.length}
                                        </ThemedText>
                                    </View>
                                )}

                                {selectedQuestion.steps && sortedSteps.length > 0 && (
                                    <View key={currentStepIndex} style={[styles.stepsContainer, {
                                        backgroundColor: isDark ? colors.card : '#FFFFFF',
                                        borderColor: colors.border,
                                    }]}>
                                        <View style={{ marginBottom: 8 }}>

                                            {sortedSteps[currentStepIndex]?.prompt && (
                                                <View style={{ marginTop: 8 }}>
                                                    {sortedSteps[currentStepIndex].prompt.split('\n').map((line, index) => (
                                                        <View key={index}>
                                                            {renderMixedContent(line, isDark, colors)}
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                        {sortedSteps[currentStepIndex]?.expression && (
                                            <View style={[styles.stepsTitle, { marginBottom: 24, marginTop: 24 }]}>
                                                <ThemedText style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 8 }}>
                                                    What is ? in the below expression.
                                                </ThemedText>
                                                {sortedSteps[currentStepIndex]?.expression.split('\n').map((line, index) => (
                                                    <View key={index}>
                                                        {renderMixedContent(line, isDark, colors)}
                                                    </View>
                                                ))}
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
                                            <View style={{ marginTop: 8 }}>
                                                {sortedSteps[currentStepIndex]?.hint.split('\n').map((line, index) => (
                                                    <View key={index}>
                                                        {renderMixedContent(line, isDark, colors)}
                                                    </View>
                                                ))}
                                            </View>
                                        )}

                                        <View style={[
                                            styles.stepsOptionsContainer,
                                            isRowLayout && styles.stepsOptionsRow
                                        ]}>
                                            {shuffledOptions.map((option, index) => {
                                                // Set empty options to "0"
                                                if (option === '' || option === null || option === undefined) {
                                                    option = "0";
                                                }

                                                const isCorrectAnswer = index === correctAnswerIndex;
                                                const isSelected = selectedOptionIndex === index;
                                                const isUserWrong = isSelected && !isCorrectAnswer;

                                                let optionStyle = [styles.stepOptionButton, isRowLayout && styles.stepOptionButtonRow];
                                                let dynamicOptionColors = {};
                                                let icon = null;
                                                let textColor = colors.text;

                                                if (selectedOptionIndex !== null) {
                                                    if (isCorrectAnswer) {
                                                        dynamicOptionColors = { backgroundColor: '#DCFCE7', borderColor: '#22C55E' }; // green
                                                        textColor = '#15803D';
                                                    } else if (isUserWrong) {
                                                        dynamicOptionColors = { backgroundColor: '#FEE2E2', borderColor: '#DC2626' }; // red
                                                        textColor = '#B91C1C';
                                                    } else {
                                                        // Unselected and not correct
                                                        dynamicOptionColors = { backgroundColor: isDark ? colors.surface : '#F3F4F6', borderColor: '#E5E7EB', opacity: 0.5 };
                                                        textColor = colors.textSecondary;
                                                    }
                                                } else if (!isSelected) {
                                                    dynamicOptionColors = { backgroundColor: isDark ? colors.surface : '#F8FAFC', borderColor: '#E5E7EB' };
                                                }

                                                return (
                                                    <TouchableOpacity
                                                        key={index}
                                                        style={[StyleSheet.flatten(optionStyle), dynamicOptionColors]}
                                                        onPress={() => {
                                                            setSelectedOptionIndex(index);
                                                            const isCorrect = index === correctAnswerIndex;
                                                            setScoreStats(prev => {
                                                                const correct = prev.correct_answers + (isCorrect ? 1 : 0);
                                                                const incorrect = prev.incorrect_answers + (!isCorrect ? 1 : 0);
                                                                const total = correct + incorrect;
                                                                return {
                                                                    total_answers: total,
                                                                    correct_answers: correct,
                                                                    incorrect_answers: incorrect,
                                                                    correct_percentage: total ? Math.round((correct / total) * 100) : 0,
                                                                    incorrect_percentage: total ? Math.round((incorrect / total) * 100) : 0,
                                                                };
                                                            });
                                                            if (isCorrect) setCorrectAnswersCount(count => count + 1);
                                                        }}
                                                        disabled={selectedOptionIndex !== null}
                                                    >
                                                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                                            {icon && <ThemedText style={{ fontSize: 20, marginRight: 8 }}>{icon}</ThemedText>}
                                                            <View style={{ flex: 1 }}>
                                                                {option.split('\n').map((line, lineIndex) => (
                                                                    <View key={lineIndex}>
                                                                        {renderMixedContent(line, isDark, { ...colors, text: textColor }, true)}
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}

                                {selectedOptionIndex !== null && sortedSteps[currentStepIndex] && (
                                    <View style={{ marginTop: 16, marginBottom: 16 }}>
                                        {selectedOptionIndex !== null && (
                                            selectedOptionIndex === correctAnswerIndex ? (
                                                <ThemedText style={{ fontSize: 20, marginBottom: 8, textAlign: 'center' }} accessibilityRole="alert">🎉 Congratulations!</ThemedText>
                                            ) : (
                                                <ThemedText style={{ fontSize: 20, marginBottom: 8, textAlign: 'center' }} accessibilityRole="alert">❌ That's not correct!</ThemedText>
                                            )
                                        )}
                                        {sortedSteps[currentStepIndex].teach && (
                                            <View style={{ marginTop: 8, marginHorizontal: 16 }}>
                                                {sortedSteps[currentStepIndex].teach.split('\n').map((line, index) => (
                                                    <View key={index}>
                                                        {renderMixedContent(line, isDark, colors)}
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                        {currentStepIndex === sortedSteps.length - 1 && selectedOptionIndex !== null && (
                                            <View style={{ marginTop: 24, padding: 16, backgroundColor: isDark ? '#1E293B' : '#F0FDF4', borderRadius: 12, alignItems: 'center' }}>
                                                <ThemedText style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>🎓 🎉 🎯</ThemedText>
                                                <ThemedText style={{ fontSize: 18, textAlign: 'center', color: isDark ? '#A7F3D0' : '#15803D', fontWeight: '600' }}>
                                                    You've completed this question! Great job!
                                                </ThemedText>
                                                <ThemedText style={{ fontSize: 14, textAlign: 'center', color: isDark ? '#94A3B8' : '#166534', marginTop: 4 }}>
                                                    Ready for the next challenge?
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {currentStepIndex < sortedSteps.length - 1 && (
                                    <View style={[styles.nextStepIndicator, { flexDirection: 'row', justifyContent: 'center', gap: 16 }]}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setCurrentStepIndex(prevIndex => {
                                                    const prev = Math.max(prevIndex - 1, 0);
                                                    console.log('Prev Step pressed, updating currentStepIndex from', prevIndex, 'to', prev);
                                                    return prev;
                                                });
                                                setSelectedOptionIndex(null);
                                                setShowHint(false);
                                            }}
                                            style={[styles.nextStepTouchable, {
                                                backgroundColor: isDark ? colors.surface : '#F8FAFC',
                                                padding: 12,
                                                borderRadius: 8,
                                                marginBottom: 16,
                                                zIndex: 1000,
                                                opacity: currentStepIndex === 0 ? 0.5 : 1,
                                            }]}
                                            accessibilityRole="button"
                                            accessibilityLabel="Go to previous step"
                                            disabled={currentStepIndex === 0}
                                        >
                                            <ThemedText style={[styles.nextStepText, {
                                                color: isDark ? '#6366F1' : '#4F46E5',
                                                fontSize: 16,
                                                fontWeight: '600',
                                            }]}>⬅️ Prev Step</ThemedText>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => {
                                                console.log('Next Step pressed', {
                                                    currentStepIndex,
                                                    sortedStepsLength: sortedSteps.length,
                                                    selectedOptionIndex,
                                                    currentStep: sortedSteps[currentStepIndex],
                                                    nextStep: sortedSteps[currentStepIndex + 1]
                                                });

                                                setCurrentStepIndex(prevIndex => {
                                                    const nextIndex = prevIndex + 1;
                                                    console.log('Updating currentStepIndex from', prevIndex, 'to', nextIndex);
                                                    return nextIndex;
                                                });
                                                setSelectedOptionIndex(null);
                                                setShowHint(false);
                                            }}
                                            style={[styles.nextStepTouchable, {
                                                backgroundColor: isDark ? colors.surface : '#F8FAFC',
                                                padding: 12,
                                                borderRadius: 8,
                                                marginBottom: 16,
                                                zIndex: 1000,
                                                opacity: selectedOptionIndex === null || currentStepIndex === sortedSteps.length - 1 ? 0.5 : 1,
                                            }]}
                                            accessibilityRole="button"
                                            accessibilityLabel="Go to next step"
                                            disabled={selectedOptionIndex === null || currentStepIndex === sortedSteps.length - 1}
                                        >
                                            <ThemedText style={[styles.nextStepText, {
                                                color: isDark ? '#6366F1' : '#4F46E5',
                                                fontSize: 16,
                                                fontWeight: '600',
                                            }]}>Next Step ➡️</ThemedText>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                            <SafeAreaView style={styles.stickyButtonBar} edges={['bottom']}>

                                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
                                    {currentQuestionIndex < questionIds.length - 1 && (
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
            fontSize: 16,
            fontWeight: '700',
            marginBottom: 5,
            color: isDark ? '#A7F3D0' : '#1E293B',
            marginTop: 48,
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
            fontSize: 16,
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
            marginBottom: 16,
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
            borderWidth: 2,
            minHeight: 60,
            justifyContent: 'center',
            width: '100%',
            marginBottom: 8,
        },
        stepOptionButtonRow: {
            width: '28%',
            marginBottom: 8,
        },
        stepOptionText: {
            fontSize: 24
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
            marginBottom: 16,
        },
        progressContainer: {
            marginVertical: 16,
            width: '100%',
            alignItems: 'center',
        },
        progressBar: {
            width: '100%',
            height: 8,
            backgroundColor: isDark ? '#334155' : '#E5E7EB',
            borderRadius: 4,
            overflow: 'hidden',
            marginBottom: 8,
        },
        progressFill: {
            height: '100%',
            borderRadius: 4,
        },
        progressText: {
            fontSize: 14,
            fontWeight: '600',
            color: isDark ? '#A7F3D0' : '#1E293B',
        },
        questionProgressContainer: {
            width: '100%',
            alignItems: 'center',
            marginBottom: 16,
            paddingHorizontal: 16,
            marginTop: 32,
        },
        questionProgressBar: {
            width: '100%',
            height: 6,
            backgroundColor: isDark ? '#334155' : '#E5E7EB',
            borderRadius: 3,
            overflow: 'hidden',
            marginBottom: 8,
        },
        questionProgressFill: {
            height: '100%',
            borderRadius: 3,
        },
        questionProgressText: {
            fontSize: 12,
            fontWeight: '500',
            color: isDark ? '#94A3B8' : '#64748B',
        },
        questionProgressWrapper: {
            width: '100%',
        },
        mixedContentContainer: {
            flex: 1,
            width: '100%',
        },
        latexContainer: {
            width: '100%',
            marginVertical: 4,
            color: '#000000',
            overflow: 'hidden',
        },
        h1Text: {
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 10,
        },
        h2Text: {
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 8,
        },
        h3Text: {
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 6,
        },
        h4Text: {
            fontSize: 14,
            fontWeight: 'bold',
            marginBottom: 4,
        },
        contentText: {
            fontSize: 16,
        },
        bulletListContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        bulletPointContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        bulletPoint: {
            fontSize: 16,
            fontWeight: 'bold',
        },
        bulletPointText: {
            fontSize: 16,
        },
        bulletTextWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        bulletTextContent: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 4,
        },
        textContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 4,
        },
        boldText: {
            fontWeight: 'bold',
        },
        emptyStateContainer: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            width: '100%',
            maxWidth: 480,
            alignSelf: 'center',
        },
        emptyStateImage: {
            width: 200,
            height: 200,
            marginBottom: 24,
        },
        emptyStateTitle: {
            fontSize: 24,
            fontWeight: '700',
            color: isDark ? '#A7F3D0' : '#1E293B',
            marginBottom: 12,
            textAlign: 'center',
        },
        emptyStateText: {
            fontSize: 16,
            color: isDark ? '#94A3B8' : '#64748B',
            textAlign: 'center',
            lineHeight: 24,
        },
    });
} 