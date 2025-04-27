import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import { ThemedText } from '@/components/ThemedText';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { HOST_URL } from '@/config/api';

interface LectureRecording {
    recordingFileName: string;
    lecture_name: string;
    image: string | null;
}

interface RecordingPlayerModalProps {
    isVisible: boolean;
    onClose: () => void;
    recording: LectureRecording | null;
}

const { width } = Dimensions.get('window');

export function RecordingPlayerModal({ isVisible, onClose, recording }: RecordingPlayerModalProps) {
    const { colors, isDark } = useTheme();
    const styles = createStyles(isDark);

    useEffect(() => {
        if (recording) {
            const audioUrl = `${HOST_URL}/api/lecture-recording/${recording.recordingFileName}`;
            console.log('[RecordingPlayerModal] Audio URL constructed:', audioUrl);
            console.log('[RecordingPlayerModal] Recording data:', recording);
            console.log('[RecordingPlayerModal] HOST_URL:', HOST_URL);
        }
    }, [recording]);

    if (!recording) return null;

    const audioUrl = `${HOST_URL}/api/lecture-recording/${recording.recordingFileName}`;

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
                    <ThemedText style={styles.title}>{recording.lecture_name}</ThemedText>
                    <Ionicons
                        name="close"
                        size={24}
                        color={colors.text}
                        onPress={onClose}
                        style={styles.closeButton}
                    />
                </View>

                <View style={styles.content}>
                    {recording.image ? (
                        <Image
                            source={{ uri: recording.image }}
                            style={styles.image}
                            resizeMode="cover"
                            onLoadStart={() => console.log('[RecordingPlayerModal] Image loading started:', recording.image)}
                            onLoad={() => console.log('[RecordingPlayerModal] Image loaded successfully:', recording.image)}
                            onError={(error) => console.error('[RecordingPlayerModal] Image loading error:', error.nativeEvent.error)}
                        />
                    ) : (
                        <View style={[styles.image, styles.imagePlaceholder]}>
                            <Ionicons name="headset" size={48} color={colors.text} />
                        </View>
                    )}

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
        image: {
            width: '100%',
            height: width * 0.6,
            borderRadius: 12,
            marginBottom: 16,
        },
        imagePlaceholder: {
            backgroundColor: isDark ? '#3a3a3a' : '#e0e0e0',
            justifyContent: 'center',
            alignItems: 'center',
        },
        playerContainer: {
            marginTop: 24,
        },
    });
} 