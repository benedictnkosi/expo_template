import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Platform, Share, TouchableOpacity, Image, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { ThemedText } from '@/components/ThemedText';
import { AudioPlayer } from '@/components/AudioPlayer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { HOST_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { Paywall } from '../components/Paywall';
import { LinearGradient } from 'expo-linear-gradient';
import { AskParentModal } from './AskParentModal';

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

interface DailyUsage {
    quiz: number;
    lesson: number;
    podcast: number;
    date: string;
}

const { width } = Dimensions.get('window');

export function RecordingPlayerModal({ isVisible, onClose, recording, subjectName }: RecordingPlayerModalProps) {
    const { colors, isDark } = useTheme();
    const { user } = useAuth();
    const styles = createStyles(isDark);
    const audioPlayerRef = useRef<{ playSound: () => Promise<void>; stopSound: () => Promise<void> }>(null);
    const [remainingPodcasts, setRemainingPodcasts] = useState<number | null>(null);
    const [isLoadingUsage, setIsLoadingUsage] = useState(false);
    const [showPaywall, setShowPaywall] = useState(false);
    const [showParentModal, setShowParentModal] = useState(false);
    const storeLink = Platform.select({
        ios: 'https://apps.apple.com/za/app/dimpo-learning-app/id6742684696',
        android: 'https://play.google.com/store/apps/details?id=za.co.examquizafrica',
        default: 'https://play.google.com/store/apps/details?id=za.co.examquizafrica'
    });
    const parentMessage = `Hi! I've been using the Dimpo learning app to study for school and I just reached my daily limit.\nIt really helps me with subjects and past papers — can you please help me upgrade to Pro so I can keep learning every day? 🙏\n\nIt's only R29/month or R199/year. You can check it out here:\n👉 ${storeLink}`;

    useEffect(() => {
        if (isVisible && user?.uid) {
            fetchDailyUsage();
        }
    }, [isVisible, user?.uid]);

    const fetchDailyUsage = async () => {
        if (!user?.uid) return;
        setIsLoadingUsage(true);
        try {
            const response = await fetch(`${HOST_URL}/api/learner/daily-usage?uid=${user.uid}`);
            const data = await response.json();
            if (data.status === "OK") {
                setRemainingPodcasts(data.data.podcast);
                if (data.data.podcast <= 0) {
                    setShowPaywall(true);
                }
            }
        } catch (error) {
            console.error('Error fetching daily usage:', error);
        } finally {
            setIsLoadingUsage(false);
        }
    };

    useEffect(() => {
        if (isVisible && audioPlayerRef.current && recording && remainingPodcasts !== null && remainingPodcasts > 0) {
            audioPlayerRef.current.playSound();
        }
    }, [isVisible, recording, remainingPodcasts]);

    // Add cleanup effect to stop audio when modal closes
    useEffect(() => {
        return () => {
            if (audioPlayerRef.current) {
                audioPlayerRef.current.stopSound();
            }
        };
    }, []);

    if (!recording) return null;

    const audioFileName = recording.recordingFileName.replace('.opus', '.m4a');
    const audioUrl = `${HOST_URL}/api/lecture-recording/${audioFileName}?subscriptionCheck=true&uid=${user?.uid}`;
    const handleShare = async () => {
        try {
            const cleanSubjectName = subjectName.replace(/P[12]/g, '').trim();
            const shareUrl = `https://examquiz.co.za/quiz?lectureId=${recording.id}&subjectName=${encodeURIComponent(cleanSubjectName)}&uid=${user?.uid}`;
            await Share.share({
                message: `Check out this podcast on ExamQuiz:\n\n${recording.lecture_name}\n\nDownload ExamQuiz to listen to more educational podcasts!\n\nView this podcast directly: ${shareUrl}`,
                title: recording.lecture_name,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleShareWithParent = async () => {
        try {
            await Share.share({
                message: parentMessage,
                url: storeLink,
                title: 'Dimpo Pro Upgrade'
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    return (
        <>
            {showPaywall && (
                <Paywall
                    onSuccess={() => {
                        setShowPaywall(false);
                        fetchDailyUsage();
                    }}
                    onClose={() => setShowPaywall(false)}
                />
            )}
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

                        {remainingPodcasts !== null && remainingPodcasts > 0 && (
                            <TouchableOpacity
                                style={[styles.shareButton, {
                                    backgroundColor: isDark ? colors.surface : '#F3F4F6',
                                    borderColor: isDark ? colors.border : '#E5E7EB',
                                    marginTop: 16,
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
                        )}

                        {/* Upgrade to Pro button for users at/over the limit */}
                        {remainingPodcasts !== null && remainingPodcasts !== 999 && remainingPodcasts <= 0 && (
                            <ScrollView
                                style={{ width: '100%' }}
                                contentContainerStyle={{ paddingBottom: 16 }}
                                showsVerticalScrollIndicator={false}
                            >
                                <View style={{ alignItems: 'center', marginTop: 8 }}>
                                    {/* Illustration - replace with your illustration asset */}
                                    <Image
                                        source={require('@/assets/images/dimpo/limit.png')}
                                        style={{ width: 180, height: 180, marginBottom: 16 }}
                                        resizeMode="contain"
                                    />
                                    <ThemedText style={{ fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                                        🧠 You've reached today's free podcast limit!
                                    </ThemedText>
                                    <ThemedText style={{ fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 12 }}>
                                        Upgrade to keep going — no waiting till tomorrow.
                                    </ThemedText>
                                    <ThemedText style={{ fontSize: 16, textAlign: 'center', color: isDark ? '#CBD5E1' : '#64748B', marginBottom: 24 }}>
                                        🚀 Go unlimited with Pro to unlock unlimited podcasts, step-by-step maths, and audio lessons — anytime.
                                    </ThemedText>
                                    <TouchableOpacity
                                        style={{
                                            width: '100%',
                                            borderRadius: 16,
                                            overflow: 'hidden',
                                            marginBottom: 16,
                                            backgroundColor: 'transparent',
                                        }}
                                        onPress={() => setShowPaywall(true)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Upgrade to Pro"
                                    >
                                        <LinearGradient
                                            colors={isDark ? ['#7C3AED', '#4F46E5'] : ['#9333EA', '#4F46E5']}
                                            style={{ padding: 18, alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Ionicons name="star-outline" size={22} color="#fff" />
                                                <ThemedText style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>✨ Upgrade to Pro</ThemedText>
                                            </View>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{
                                            width: '100%',
                                            borderRadius: 16,
                                            paddingVertical: 16,
                                            paddingHorizontal: 20,
                                            marginBottom: 12,
                                            backgroundColor: isDark ? colors.surface : '#64748B',
                                            alignItems: 'center',
                                        }}
                                        onPress={() => setShowParentModal(true)}
                                        accessibilityRole="button"
                                        accessibilityLabel="Ask a Parent"
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Ionicons name="people-outline" size={20} color="#fff" />
                                            <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Ask a Parent</ThemedText>
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{
                                            width: '100%',
                                            borderRadius: 16,
                                            paddingVertical: 16,
                                            paddingHorizontal: 20,
                                            backgroundColor: isDark ? colors.surface : '#64748B',
                                            alignItems: 'center',
                                        }}
                                        onPress={onClose}
                                        accessibilityRole="button"
                                        accessibilityLabel="Come back tomorrow"
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Ionicons name="time-outline" size={20} color="#fff" />
                                            <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Come back tomorrow</ThemedText>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                        {remainingPodcasts !== null && remainingPodcasts !== 999 && remainingPodcasts > 0 && (
                            <View style={styles.playerContainer}>
                                <AudioPlayer
                                    ref={audioPlayerRef}
                                    audioUrl={audioUrl}
                                    title={recording.lecture_name}
                                    disabled={remainingPodcasts === null || remainingPodcasts <= 0}
                                />
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
            <AskParentModal
                isVisible={showParentModal}
                onClose={() => setShowParentModal(false)}
                parentMessage={parentMessage}
                onShare={handleShareWithParent}
                isDark={isDark}
                colors={colors}
            />
        </>
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
        usageContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 8,
            gap: 8,
            borderWidth: 1,
            alignSelf: 'center',
        },
        usageText: {
            fontSize: 14,
            fontWeight: '500',
        },
    });
}