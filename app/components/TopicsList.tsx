import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { HOST_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import Toast from 'react-native-toast-message';
import { TOPIC_EMOJIS } from '../constants/topicEmojis';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Topic {
    name: string;
    questionCount: number;
}

interface TopicsListProps {
    subjectName: string;
    isDark: boolean;
    colors: {
        primary: string;
        background: string;
        text: string;
        textSecondary: string;
    };
    handleTopicSelect: (topic: string) => void;
}

interface TopicResponse {
    status: string;
    topics: {
        [category: string]: Topic[];
    };
    subjects: {
        id: number;
        name: string;
    }[];
}

function getTopicEmoji(topic: string): string {
    const lowerTopic = topic.toLowerCase();
    const lowerMainCategory = topic.split(':')[0].trim().toLowerCase();

    // First try to match the exact topic
    const exactMatch = Object.entries(TOPIC_EMOJIS).find(([key]) => key.toLowerCase() === lowerTopic);
    if (exactMatch) {
        return exactMatch[1] as string;
    }

    // If no exact match, try to match the main category (before the colon)
    const categoryMatch = Object.entries(TOPIC_EMOJIS).find(([key]) => key.toLowerCase() === lowerMainCategory);
    if (categoryMatch) {
        return categoryMatch[1] as string;
    }

    // Return default emoji if no match found
    return '📚';
}

export function TopicsList({ subjectName, isDark, colors, handleTopicSelect }: TopicsListProps) {
    const { user } = useAuth();
    const [topics, setTopics] = useState<TopicResponse['topics']>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchTopics();
    }, [subjectName]);

    const fetchTopics = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(
                `${HOST_URL}/public/learn/question/topics?subject_name=${encodeURIComponent(subjectName)}&uid=${user?.uid}`
            );
            const data = await response.json();

            if (data.status === 'OK') {
                // Filter out "no match" from Uncategorized
                if (data.topics['Uncategorized']) {
                    data.topics['Uncategorized'] = data.topics['Uncategorized'].filter(
                        (topic: Topic) => topic.name.toLowerCase() !== 'no match'
                    );
                }
                setTopics(data.topics);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to load topics',
                });
            }
        } catch (error) {
            console.error('Error fetching topics:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load topics',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (Object.keys(topics).length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <ThemedText>No topics available for this subject.</ThemedText>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={[
                styles.hintContainer,
                {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                }
            ]}>
                <ThemedText style={styles.hintText}>
                    👆 Tap start a quiz or lessons for a topic
                </ThemedText>
            </View>
            {Object.entries(topics).map(([category, subtopics]) => (
                <View key={category} style={styles.categoryContainer}>
                    {category !== 'Uncategorized' && (
                        <View style={styles.categoryTitleContainer}>
                            <ThemedText style={styles.categoryEmoji}>{getTopicEmoji(category)}</ThemedText>
                            <ThemedText
                                style={[styles.categoryTitle, styles.clickableCategory]}
                                onPress={() => handleTopicSelect(category)}
                            >
                                {category}
                            </ThemedText>
                            <View style={styles.startQuizContainer}>
                                <MaterialCommunityIcons
                                    name="play-circle"
                                    size={16}
                                    color={colors.primary}
                                />
                                <ThemedText
                                    style={[styles.startQuizText, { color: colors.primary }]}
                                    onPress={() => handleTopicSelect(category)}
                                >
                                    Start
                                </ThemedText>
                            </View>
                        </View>
                    )}
                    {subtopics.map((topic, index) => (
                        <View
                            key={index}
                            style={[
                                styles.topicItem,
                                {
                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)'
                                }
                            ]}
                        >
                            <View style={styles.topicContent}>
                                <ThemedText style={styles.topicText}>
                                    {topic.name}
                                </ThemedText>
                            </View>
                            <View style={styles.questionCountContainer}>
                                <ThemedText style={styles.questionCount}>
                                    {topic.questionCount} {topic.questionCount === 1 ? 'question' : 'questions'}
                                </ThemedText>
                            </View>
                        </View>
                    ))}
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    hintContainer: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
    },
    hintText: {
        fontSize: 14,
        textAlign: 'center',
        opacity: 0.8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    categoryContainer: {
        marginBottom: 24,
    },
    categoryTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        flexWrap: 'wrap',
        width: '100%',
    },
    categoryEmoji: {
        fontSize: 24,
        marginRight: 8,
        flexShrink: 0,
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: '600',
        opacity: 0.8,
        flex: 1,
        flexWrap: 'wrap',
    },
    clickableCategory: {
        textDecorationLine: 'underline',
        textDecorationStyle: 'dotted',
        textDecorationColor: 'rgba(0, 0, 0, 0.3)',
    },
    startQuizContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    startQuizText: {
        fontSize: 16,
        marginLeft: 4,
    },
    topicItem: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
    },
    topicContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    topicText: {
        fontSize: 14,
        lineHeight: 24,
        flex: 1,
    },
    questionCountContainer: {
        alignSelf: 'flex-end',
    },
    questionCount: {
        fontSize: 12,
        opacity: 0.7,
    },
}); 