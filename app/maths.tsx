import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { KaTeX } from './components/quiz/KaTeXMaths';
import { HOST_URL } from '@/config/api';
import Toast from 'react-native-toast-message';

interface MathTopic {
    name: string;
    questionCount: number;
}

interface MathTopicsResponse {
    status: string;
    topics: {
        [category: string]: MathTopic[];
    };
}

export default function MathsScreen() {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const { user } = useAuth();

    // State for selected option
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showHint, setShowHint] = useState(false);
    const [subject, setSubject] = useState<string | null>('Mathematics P1');
    const [topics, setTopics] = useState<MathTopicsResponse['topics']>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user?.uid) {
            fetchMathTopics();
        }
    }, [user?.uid]);

    const fetchMathTopics = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(
                `${HOST_URL}/api/math-topics?learnerUid=${user?.uid}`
            );
            const data = await response.json();

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

    // Step data as a variable
    const step = {
        step_number: 3,
        prompt: "\\text { Simplify } \( \\sin(30\u00B0) \).",
        expression: "\\frac{[ ? ]}{10} = \\frac{\\sin B}{15}",
        options: ["0.5", "0.3", "1"],
        answer: "0.5",
        "hint": "The sine rule matches angles and their opposite sides.",
        "teach": "The sine rule is used in non-right-angled triangles to relate angles and their opposite sides.",
        "topic": "Trigonometry",
        "subtopic": "Sine Rule"
    };

    // For optionsRow (LaTeX options)
    const latexOptions = [
        "\\frac{\\sin(30)}{10}",
        "\\frac{\\sin(30)}{15}",
        "\\frac{\\cos(30)}{10}"
    ];

    // Determine if all options are short (for latexOptions)
    const areLatexOptionsShort = latexOptions.every(opt => opt.length < 20);
    const optionsRowDirection = areLatexOptionsShort ? 'row' : 'column';

    // Determine if all step.options are very short (length < 10)
    const areStepOptionsVeryShort = step.options.every(opt => opt.length < 10);

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
                    <ThemedText style={[styles.title, { color: colors.text, fontFamily: 'System', letterSpacing: 0.2 }]}>
                        Maths With Dimpo 🧮
                    </ThemedText>

                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    ) : (
                        <View style={styles.topicsContainer}>
                            {Object.entries(topics).map(([category, categoryTopics]) => (
                                <View key={category} style={styles.categoryContainer}>
                                    <ThemedText style={[styles.categoryTitle, { color: colors.text }]}>
                                        {category}
                                    </ThemedText>
                                    <View style={styles.topicsList}>
                                        {categoryTopics.map((topic) => (
                                            <TouchableOpacity
                                                key={topic.name}
                                                style={[styles.topicItem, {
                                                    backgroundColor: isDark ? colors.surface : '#F8FAFC',
                                                    borderColor: colors.border,
                                                }]}
                                                onPress={() => {
                                                    // Handle topic selection
                                                    console.log('Selected topic:', topic.name);
                                                }}
                                            >
                                                <ThemedText style={[styles.topicName, { color: colors.text }]}>
                                                    {topic.name}
                                                </ThemedText>
                                                <ThemedText style={[styles.questionCount, { color: colors.textSecondary }]}>
                                                    {topic.questionCount} questions
                                                </ThemedText>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    content: {
        borderRadius: 20,
        padding: 28,
        marginTop: 28,
        borderWidth: 1,
        backgroundColor: '#FFF',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
        letterSpacing: 0.2,
    },
    subtitle: {
        fontSize: 18,
        marginBottom: 28,
        lineHeight: 26,
        fontWeight: '500',
        letterSpacing: 0.1,
    },
    featuresList: {
        gap: 16,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    featureEmoji: {
        fontSize: 24,
    },
    featureText: {
        fontSize: 16,
        fontWeight: '500',
    },
    latexOptionContainer: {
        width: '100%',
        flexWrap: 'wrap',
        color: '#000000',
    },
    latexContainer: {
        width: '100%',
        marginVertical: 8,
        backgroundColor: '#F8FAFC',
        color: '#000000',
        borderRadius: 18,
        padding: 10,
        boxShadow: '0 2px 8px #8881',
    },
    latexRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 14,
        boxShadow: '0 1px 4px #8881',
    },
    mixedContentContainer: {
        flex: 1,
        width: '100%',
    },
    optionsRow: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        gap: 8,
    },
    optionBox: {
        flex: 1,
        borderWidth: 1.5,
        borderRadius: 10,
        paddingVertical: 12,
        marginHorizontal: 4,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 60,
        backgroundColor: '#FFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    topicsContainer: {
        marginTop: 16,
        gap: 24,
    },
    categoryContainer: {
        gap: 12,
    },
    categoryTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    topicsList: {
        gap: 8,
    },
    topicItem: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    topicName: {
        fontSize: 16,
        fontWeight: '500',
    },
    questionCount: {
        fontSize: 14,
    },
}); 