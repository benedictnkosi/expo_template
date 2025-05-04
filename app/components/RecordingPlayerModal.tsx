import React from 'react';
import { View, StyleSheet, Dimensions, Platform, Share, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { ThemedText } from '@/components/ThemedText';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { HOST_URL } from '@/config/api';

interface LectureRecording {
    id: string;
    recordingFileName: string;
    lecture_name: string;
    main_topic: string;
}

interface RecordingPlayerModalProps {
    isVisible: boolean;
    onClose: () => void;
    recording: LectureRecording | null;
    subjectName: string;
}

const { width } = Dimensions.get('window');

export function RecordingPlayerModal({ isVisible, onClose, recording, subjectName }: RecordingPlayerModalProps) {
    const { colors, isDark } = useTheme();
    const styles = createStyles(isDark);

    if (!recording) return null;

    const audioFileName = recording.recordingFileName.replace('.opus', '.m4a');
    const audioUrl = `${HOST_URL}/api/lecture-recording/${audioFileName}`;

    const handleShare = async () => {
        try {
            const cleanSubjectName = subjectName.replace(/P[12]/g, '').trim();
            const shareUrl = `https://examquiz.co.za/quiz?lectureId=${recording.id}&subjectName=${encodeURIComponent(cleanSubjectName)}`;
            await Share.share({
                message: `Check out this podcast on ExamQuiz:\n\n${recording.lecture_name}\n\nDownload ExamQuiz to listen to more educational podcasts!\n\nView this podcast directly: ${shareUrl}`,
                title: recording.lecture_name,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    return (
        <Modal
            isVisible={isVisible}
            onBackdropPress={onClose}
            onBackButtonPress={onClose}
            style={styles.modal}
            backdropOpacity={0.8}
        >
            <View style={styles.container}>
                <View style={styles.header}>
                    <ThemedText style={styles.title}>{recording.main_topic}</ThemedText>
                    <Ionicons
                        name="close"
                        size={24}
                        color={colors.text}
                        onPress={onClose}
                        style={styles.closeButton}
                    />
                </View>

                <View style={styles.content}>
                    <TouchableOpacity
                        style={[styles.shareButton, {
                            backgroundColor: isDark ? colors.surface : '#F3F4F6',
                            borderColor: isDark ? colors.border : '#E5E7EB',
                            marginBottom: 16,
                        }]}
                        onPress={handleShare}
                    >
                        <Ionicons
                            name="share-outline"
                            size={20}
                            color={isDark ? colors.text : '#4B5563'}
                        />
                        <ThemedText style={[styles.shareButtonText, { color: isDark ? colors.text : '#4B5563' }]}>
                            Share this lecture
                        </ThemedText>
                    </TouchableOpacity>

                    <View style={styles.playerContainer}>
                        <AudioPlayer
                            audioUrl={audioUrl}
                            title={recording.lecture_name}
                        />
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function createStyles(isDark: boolean) {
    return StyleSheet.create({
        modal: {
            margin: 0,
            justifyContent: 'center',
            alignItems: 'center',
        },
        container: {
            width: width * 0.9,
            maxHeight: '90%',
            backgroundColor: isDark ? '#2a2a2a' : '#fff',
            borderRadius: 16,
            overflow: 'hidden',
        },
        header: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? '#3a3a3a' : '#e0e0e0',
        },
        title: {
            fontSize: 18,
            fontWeight: '600',
            flex: 1,
            marginRight: 16,
            lineHeight: 24,
        },
        closeButton: {
            padding: 4,
        },
        content: {
            padding: 16,
        },
        playerContainer: {
            marginTop: 24,
        },
        shareButton: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            gap: 4,
            borderWidth: 1,
            alignSelf: 'center',
        },
        shareButtonText: {
            fontSize: 14,
            fontWeight: '500',
        },
    });
}