import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/contexts/ThemeContext';
import { HOST_URL } from '@/config/api';
import { Ionicons } from '@expo/vector-icons';
import { RecordingPlayerModal } from './RecordingPlayerModal';
import { TOPIC_EMOJIS } from '../constants/topicEmojis';

interface LectureRecording {
    recordingFileName: string;
    lecture_name: string;
    image: string | null;
    main_topic: string;
}

interface RecordingsListProps {
    recordings: LectureRecording[];
    isLoading: boolean;
}

interface GroupedRecordings {
    [key: string]: LectureRecording[];
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

export function RecordingsList({ recordings, isLoading }: RecordingsListProps) {
    const { colors, isDark } = useTheme();
    const styles = createStyles(isDark);
    const [selectedRecording, setSelectedRecording] = useState<LectureRecording | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const groupedRecordings = useMemo(() => {
        return recordings.reduce((groups: GroupedRecordings, recording) => {
            const topic = recording.main_topic;
            if (!groups[topic]) {
                groups[topic] = [];
            }
            groups[topic].push(recording);
            return groups;
        }, {});
    }, [recordings]);

    const handleRecordingPress = (recording: LectureRecording) => {
        setSelectedRecording(recording);
        setIsModalVisible(true);
    };

    const handleCloseModal = () => {
        setIsModalVisible(false);
        setSelectedRecording(null);
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (recordings.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <ThemedText>No lecture recordings available for this subject.</ThemedText>
            </View>
        );
    }

    const renderRecordingCard = (lecture: LectureRecording) => (
        <TouchableOpacity
            key={lecture.recordingFileName}
            style={styles.recordingCard}
            onPress={() => handleRecordingPress(lecture)}
        >
            <View style={styles.recordingHeader}>
                {lecture.image ? (
                    <Image
                        source={{ uri: lecture.image }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                        <Ionicons name="headset" size={40} color={colors.text} />
                    </View>
                )}
                <View style={styles.recordingInfo}>
                    <ThemedText style={styles.lectureTitle}>
                        {lecture.lecture_name}
                    </ThemedText>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <>
            <ScrollView style={styles.container}>
                <View style={styles.disclaimerContainer}>
                    <ThemedText style={styles.disclaimerText}>
                        ⚠️ All lectures are AI-generated and have not been quality checked
                    </ThemedText>
                </View>
                {Object.entries(groupedRecordings).map(([topic, topicRecordings]) => (
                    <View key={topic} style={styles.topicSection}>
                        <View style={styles.topicHeader}>
                            <View style={styles.topicTitleContainer}>
                                <ThemedText style={styles.topicEmoji}>{getTopicEmoji(topic)}</ThemedText>
                                <ThemedText style={styles.topicTitle}>{topic}</ThemedText>
                            </View>
                        </View>
                        {topicRecordings.map(renderRecordingCard)}
                    </View>
                ))}
            </ScrollView>

            <RecordingPlayerModal
                isVisible={isModalVisible}
                onClose={handleCloseModal}
                recording={selectedRecording}
            />
        </>
    );
}

function createStyles(isDark: boolean) {
    return StyleSheet.create({
        container: {
            flex: 1
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
        topicSection: {
            marginBottom: 24,
        },
        topicHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12,
            paddingHorizontal: 4,
        },
        topicTitleContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            flex: 1,
        },
        topicEmoji: {
            fontSize: 24,
            marginRight: 8,
        },
        topicTitle: {
            fontSize: 17,
            fontWeight: '700',
            flex: 1,
            color: isDark ? '#E0E0E0' : '#333333',
        },
        recordingCard: {
            marginBottom: 12,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: isDark ? '#2a2a2a' : '#f5f5f5',
            padding: 12,
        },
        recordingHeader: {
            flexDirection: 'row',
            alignItems: 'flex-start',
        },
        thumbnail: {
            width: 80,
            height: 80,
            borderRadius: 8,
            marginRight: 12,
        },
        thumbnailPlaceholder: {
            backgroundColor: isDark ? '#3a3a3a' : '#e0e0e0',
            justifyContent: 'center',
            alignItems: 'center',
        },
        recordingInfo: {
            flex: 1,
            marginRight: 8,
        },
        lectureTitle: {
            fontSize: 15,
            lineHeight: 22,
        },
        disclaimerText: {
            fontSize: 12,
            color: isDark ? '#FFA500' : '#FF8C00',
            textAlign: 'center',
            padding: 12,
            backgroundColor: isDark ? 'rgba(255, 165, 0, 0.1)' : 'rgba(255, 140, 0, 0.1)',
            borderRadius: 8,
            marginBottom: 16,
        },
        disclaimerContainer: {
            paddingHorizontal: 16,
            marginTop: 8,
        },
    });
} 