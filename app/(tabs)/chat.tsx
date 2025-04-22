import React, { useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Platform,
    Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchMySubjects, getLearner } from '@/services/api';
import { analytics } from '@/services/analytics';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Header } from '@/components/Header';

interface Subject {
    id: string;
    name: string;
    total_questions: number;
    answered_questions: number;
    correct_answers: number;
    newThreadCount?: number;
}

interface WarningModalProps {
    visible: boolean;
    onAccept: () => void;
    isDark: boolean;
    colors: any;
}

function WarningModal({ visible, onAccept, isDark, colors }: WarningModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onAccept}
        >
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, {
                    backgroundColor: isDark ? colors.card : '#FFFFFF',
                    borderColor: colors.border
                }]}>
                    <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                        Community Guidelines
                    </ThemedText>
                    <ThemedText style={[styles.modalMessage, { color: colors.textSecondary }]}>
                        ⚠️ Let's keep it friendly and on topic! No profanity or bullying. Violations will lead to account suspension.{'\n\n'}🔒 For your safety, please do not share personal information like phone numbers in the chat.
                    </ThemedText>
                    <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: colors.primary }]}
                        onPress={onAccept}
                    >
                        <ThemedText style={styles.modalButtonText}>I Understand</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

export default function ChatScreen() {
    const { user, signOut } = useAuth();
    const { colors, isDark } = useTheme();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [learnerInfo, setLearnerInfo] = useState<{
        name: string;
        grade: string;
        school?: string;
        avatar?: string;
    } | null>(null);
    const [hiddenSubjects, setHiddenSubjects] = useState<string[]>([]);
    const [learnerGrade, setLearnerGrade] = useState<string>('');
    const [lastAccessTimes, setLastAccessTimes] = useState<Record<string, number>>({});
    const [showWarningModal, setShowWarningModal] = useState(false);

    useEffect(() => {
        async function loadLearnerGrade() {
            const grade = await AsyncStorage.getItem('learnerGrade');
            if (grade) {
                setLearnerGrade(grade);
            }
        }
        loadLearnerGrade();
    }, []);

    useEffect(() => {
        async function loadData() {
            if (!user?.uid) return;

            try {
                setIsLoading(true);

                // Check if warning has been accepted
                const warningAccepted = await AsyncStorage.getItem('chatWarningAccepted');
                if (!warningAccepted) {
                    setShowWarningModal(true);
                }

                // Load hidden subjects
                const stored = await AsyncStorage.getItem('hiddenSubjects');
                const hidden = stored ? JSON.parse(stored) : [];
                setHiddenSubjects(hidden);

                // Load last access times
                const times = await AsyncStorage.getItem('subjectLastAccessTimes');
                const accessTimes = times ? JSON.parse(times) : {};
                setLastAccessTimes(accessTimes);

                // Fetch learner info
                const learner = await getLearner(user.uid);
                setLearnerInfo({
                    name: learner.name || '',
                    grade: learner.grade?.number?.toString() || '',
                    school: learner.school_name || '',
                    avatar: learner.avatar || ''
                });

                // Load subjects
                const response = await fetchMySubjects(user.uid);
                if (response?.subjects && Array.isArray(response.subjects)) {
                    const subjectGroups = response.subjects.reduce((acc: Record<string, Subject>, curr) => {
                        if (!curr?.name) return acc;
                        const baseName = curr.name.split(' P')[0];

                        if (!acc[baseName]) {
                            acc[baseName] = {
                                id: curr.id.toString(),
                                name: baseName,
                                total_questions: curr.totalSubjectQuestions || 0,
                                answered_questions: curr.totalResults || 0,
                                correct_answers: curr.correctAnswers || 0
                            };
                        } else {
                            acc[baseName].total_questions += curr.totalSubjectQuestions || 0;
                            acc[baseName].answered_questions += curr.totalResults || 0;
                            acc[baseName].correct_answers += curr.correctAnswers || 0;
                        }
                        return acc;
                    }, {});

                    const groupedSubjects = Object.values(subjectGroups);

                    // Get new thread counts for each subject
                    const subjectsWithCounts = await Promise.all(
                        groupedSubjects.map(async (subject) => {
                            const lastAccess = accessTimes[subject.name] || 0;
                            const threadsRef = collection(db, 'threads');
                            const threadsQuery = query(
                                threadsRef,
                                where('subjectName', '==', subject.name),
                                where('createdAt', '>', new Date(lastAccess))
                            );
                            const threadsSnapshot = await getDocs(threadsQuery);
                            return {
                                ...subject,
                                newThreadCount: threadsSnapshot.size
                            };
                        })
                    );

                    setSubjects(subjectsWithCounts);
                }
            } catch (error) {
                console.error('Error loading chats:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, [user?.uid]);

    const handleSubjectPress = async (subject: Subject) => {
        if (user?.uid) {
            // Update last access time for the subject
            const currentTime = Date.now();
            const newTimes = { ...lastAccessTimes, [subject.name]: currentTime };
            await AsyncStorage.setItem('subjectLastAccessTimes', JSON.stringify(newTimes));
            setLastAccessTimes(newTimes);

            // Reset the newThreadCount for this subject
            setSubjects(prevSubjects =>
                prevSubjects.map(s =>
                    s.id === subject.id
                        ? { ...s, newThreadCount: 0 }
                        : s
                )
            );

            analytics.track('open_subject_chat', {
                user_id: user.uid,
                subject_name: subject.name,
                subject_id: subject.id
            });
            router.push({
                pathname: '/threads/[id]',
                params: {
                    id: subject.id,
                    subjectName: subject.name
                }
            });
        }
    };

    const handleAcceptWarning = async () => {
        await AsyncStorage.setItem('chatWarningAccepted', 'true');
        setShowWarningModal(false);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F3F4F6' }]}>
                <Header learnerInfo={null} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <ThemedText style={styles.loadingText}>Loading Chats...</ThemedText>
                </View>
            </View>
        );
    }

    const visibleSubjects = subjects.filter(subject => !hiddenSubjects.includes(subject.id));

    return (
        <ThemedView style={styles.container}>
            <Header learnerInfo={learnerInfo} />
            <View style={[styles.header, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
                <ThemedText style={styles.title}>Grade {learnerGrade} Chat Groups 💬</ThemedText>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {visibleSubjects.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <ThemedText style={styles.emptyText}>No subjects available</ThemedText>
                    </View>
                ) : (
                    visibleSubjects.map((subject) => (
                        <TouchableOpacity
                            key={subject.id}
                            style={[
                                styles.subjectCard,
                                { backgroundColor: isDark ? colors.card : '#FFFFFF' }
                            ]}
                            onPress={() => handleSubjectPress(subject)}
                        >
                            <Image
                                source={getSubjectIcon(subject.name)}
                                style={styles.subjectIcon}
                            />
                            <View style={styles.subjectInfo}>
                                <ThemedText style={styles.subjectName}>{subject.name}</ThemedText>
                                <ThemedText style={[styles.subjectMembers, { color: colors.textSecondary }]}>
                                    Tap to join chat
                                </ThemedText>
                            </View>
                            <View style={styles.subjectRightContent}>
                                {(subject.newThreadCount ?? 0) > 0 && (
                                    <View style={[styles.newThreadBadge, { backgroundColor: colors.primary }]}>
                                        <ThemedText style={styles.newThreadCount}>{subject.newThreadCount}</ThemedText>
                                    </View>
                                )}
                                <Ionicons
                                    name="chevron-forward"
                                    size={24}
                                    color={colors.textSecondary}
                                />
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            <WarningModal
                visible={showWarningModal}
                onAccept={handleAcceptWarning}
                isDark={isDark}
                colors={colors}
            />
        </ThemedView>
    );
}

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
        'Life orientation': require('@/assets/images/subjects/life-orientation.png'),
        'Tourism': require('@/assets/images/subjects/tourism.png'),
        'default': require('@/assets/images/subjects/mathematics.png')
    };
    return icons[subjectName as keyof typeof icons] || icons.default;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 60 : 16,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyText: {
        fontSize: 16,
        opacity: 0.7,
    },
    subjectCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    subjectIcon: {
        width: 40,
        height: 40,
        marginRight: 12,
    },
    subjectInfo: {
        flex: 1,
    },
    subjectName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    subjectMembers: {
        fontSize: 14,
    },
    warningContainer: {
        padding: 12,
        marginBottom: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    warningText: {
        fontSize: 14,
        lineHeight: 20,
    },
    subjectRightContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    newThreadBadge: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    newThreadCount: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        maxWidth: 400,
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 24,
        textAlign: 'center',
    },
    modalButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
}); 