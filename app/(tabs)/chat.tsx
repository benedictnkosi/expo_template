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
    Text,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLearner } from '@/services/api';
import { analytics } from '@/services/analytics';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Header } from '@/components/Header';
import subjectEmojis from '@/assets/subject-emojis.json';
import grade89SubjectsEmojis from '@/assets/subject-emojis-grade89.json';
import { ProPromoCard } from '@/components/ProPromoCard';

interface Subject {
    id: string;
    name: string;
    emoji: string;
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
                        ⚠️ Let's keep it friendly and on topic! No profanity or bullying. Violations will lead to account suspension.{'\n\n'}🔒 Sharing phone numbers or asking for them in the chat will result in a ban.
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
        subscription?: string;
    } | null>(null);
    const [learnerGrade, setLearnerGrade] = useState<string>('');
    const [lastAccessTimes, setLastAccessTimes] = useState<Record<string, number>>({});
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [hiddenSubjects, setHiddenSubjects] = useState<string[]>([]);
    const [showHiddenModal, setShowHiddenModal] = useState(false);

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
                const warningAccepted = await AsyncStorage.getItem('newChatWarningAccepted');
                if (!warningAccepted) {
                    setShowWarningModal(true);
                }

                // Load last access times
                const times = await AsyncStorage.getItem('subjectLastAccessTimes');
                const accessTimes = times ? JSON.parse(times) : {};
                setLastAccessTimes(accessTimes);

                // Load hidden subjects
                const stored = await AsyncStorage.getItem('hiddenSubjects');
                setHiddenSubjects(stored ? JSON.parse(stored) : []);

                // Fetch learner info
                const learner = await getLearner(user.uid);
                setLearnerInfo({
                    name: learner.name || '',
                    grade: learner.grade?.number?.toString() || '',
                    school: learner.school_name || '',
                    avatar: learner.avatar || '',
                    subscription: learner.subscription || 'free'
                });

                // Create subjects from emojis based on grade
                const currentGrade = learner.grade?.number?.toString() || '';
                const subjectsList = Object.entries(
                    (currentGrade === '8' || currentGrade === '9')
                        ? grade89SubjectsEmojis
                        : subjectEmojis
                ).map(([name, emoji]) => ({
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    name,
                    emoji,
                    newThreadCount: 0
                }));

                // Get new thread counts for each subject
                const threadsRef = collection(db, 'threads');
                const grade = parseInt(currentGrade || '0');

                if (grade > 0) {
                    const updatedSubjects = await Promise.all(subjectsList.map(async (subject) => {
                        const lastAccess = accessTimes[subject.name] || 0;
                        const threadsQuery = query(
                            threadsRef,
                            where('subjectName', '==', subject.name),
                            ...(subject.name !== 'The Dimpo Chronicles' ? [where('grade', '==', grade)] : []),
                            where('createdAt', '>', new Date(lastAccess))
                        );
                        const threadsSnapshot = await getDocs(threadsQuery);
                        return {
                            ...subject,
                            newThreadCount: threadsSnapshot.size
                        };
                    }));

                    setSubjects(updatedSubjects);
                } else {
                    setSubjects(subjectsList);
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
        await AsyncStorage.setItem('newChatWarningAccepted', 'true');
        setShowWarningModal(false);
    };

    // Hide subject handler
    const handleHideSubject = async (subjectId: string) => {
        const updated = [...hiddenSubjects, subjectId];
        setHiddenSubjects(updated);
        await AsyncStorage.setItem('hiddenSubjects', JSON.stringify(updated));
    };

    // Unhide subject handler
    const handleUnhideSubject = async (subjectId: string) => {
        const updated = hiddenSubjects.filter(id => id !== subjectId);
        setHiddenSubjects(updated);
        await AsyncStorage.setItem('hiddenSubjects', JSON.stringify(updated));
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
    const hiddenSubjectObjs = subjects.filter(subject => hiddenSubjects.includes(subject.id));

    return (
        <ThemedView style={styles.container}>
            <Header learnerInfo={learnerInfo} />
            <View style={[styles.header, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
                <ThemedText style={styles.title}>Grade {learnerGrade} Chat Groups 💬</ThemedText>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Pinned General Discussion */}
                <TouchableOpacity
                    style={[
                        styles.subjectCard,
                        styles.pinnedCard,
                        { backgroundColor: isDark ? colors.card : '#FFFFFF' }
                    ]}
                    onPress={() => router.push({
                        pathname: '/threads/[id]',
                        params: {
                            id: 'general',
                            subjectName: 'General Discussion'
                        }
                    })}
                >
                    <View style={[styles.pinnedIconContainer, { backgroundColor: colors.primary }]}>
                        <Text style={{ fontSize: 24 }}>💬</Text>
                    </View>
                    <View style={styles.subjectInfo}>
                        <ThemedText style={styles.subjectName}>General Discussion</ThemedText>
                        <ThemedText style={[styles.subjectMembers, { color: colors.textSecondary }]}>
                            Grade {learnerGrade} general chat
                        </ThemedText>
                    </View>
                    <Ionicons
                        name="chevron-forward"
                        size={24}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>

                {/* Daily Reading - Dimpo */}
                <TouchableOpacity
                    style={[
                        styles.subjectCard,
                        styles.pinnedCard,
                        { backgroundColor: isDark ? colors.card : '#FFFFFF' }
                    ]}
                    onPress={() => router.push({
                        pathname: '/threads/[id]',
                        params: {
                            id: 'the-dimpo-chronicles',
                            subjectName: 'The Dimpo Chronicles'
                        }
                    })}
                >
                    <View style={[styles.pinnedIconContainer, { backgroundColor: colors.primary }]}>
                        <Text style={{ fontSize: 24 }}>📖</Text>
                    </View>
                    <View style={styles.subjectInfo}>
                        <ThemedText style={styles.subjectName}>The Dimpo Chronicles</ThemedText>
                        <ThemedText style={[styles.subjectMembers, { color: colors.textSecondary }]}>
                            Daily reading discussions and insights
                        </ThemedText>
                    </View>
                    <Ionicons
                        name="chevron-forward"
                        size={24}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>

                {/* Past Papers */}
                <TouchableOpacity
                    style={[
                        styles.subjectCard,
                        styles.pinnedCard,
                        { backgroundColor: isDark ? colors.card : '#FFFFFF' }
                    ]}
                    onPress={() => router.push({
                        pathname: '/threads/[id]',
                        params: {
                            id: 'past-papers',
                            subjectName: 'Past Papers'
                        }
                    })}
                >
                    <View style={[styles.pinnedIconContainer, { backgroundColor: colors.primary }]}>
                        <Text style={{ fontSize: 24 }}>📝</Text>
                    </View>
                    <View style={styles.subjectInfo}>
                        <ThemedText style={styles.subjectName}>Past Papers</ThemedText>
                        <ThemedText style={[styles.subjectMembers, { color: colors.textSecondary }]}>
                            Share Past Papers here
                        </ThemedText>
                    </View>
                    <Ionicons
                        name="chevron-forward"
                        size={24}
                        color={colors.textSecondary}
                    />
                </TouchableOpacity>

                {/* Pro Promo Card - Only show if subscription is free */}
                {learnerInfo?.subscription === 'free' && (
                    <ProPromoCard
                        onPress={() => router.push('/pro' as any)}
                        testID="pro-promo-card"
                        showCrown={false}
                    />
                )}

                <View style={styles.subjectInfo}>
                    <ThemedText style={styles.subjectName}>Subjects</ThemedText>
                </View>

                {visibleSubjects.map((subject) => (
                    <TouchableOpacity
                        key={subject.id}
                        style={[
                            styles.subjectCard,
                            { backgroundColor: isDark ? colors.card : '#FFFFFF' }
                        ]}
                        onPress={() => handleSubjectPress(subject)}
                    >
                        <View style={styles.emojiContainer}>
                            <ThemedText style={styles.emoji}>{subject.emoji}</ThemedText>
                        </View>
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
                            <TouchableOpacity
                                onPress={e => {
                                    e.stopPropagation();
                                    handleHideSubject(subject.id);
                                }}
                                style={styles.hideButton}
                                accessibilityLabel={`Hide ${subject.name} group`}
                            >
                                <Ionicons name="eye-off" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <Ionicons
                                name="chevron-forward"
                                size={24}
                                color={colors.textSecondary}
                            />
                        </View>
                    </TouchableOpacity>
                ))}
                {hiddenSubjects.length > 0 && (
                    <TouchableOpacity
                        style={styles.showHiddenButton}
                        onPress={() => setShowHiddenModal(true)}
                        accessibilityLabel="Show hidden groups"
                    >
                        <Ionicons name="eye" size={18} color={colors.primary} />
                        <ThemedText style={[styles.showHiddenText, { color: colors.primary }]}>Show Hidden Groups</ThemedText>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Hidden Groups Modal */}
            <Modal
                visible={showHiddenModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowHiddenModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.hiddenModalContent, { backgroundColor: isDark ? colors.card : '#FFF' }]}>
                        <ThemedText style={styles.modalTitle}>Hidden Groups</ThemedText>
                        {hiddenSubjectObjs.length === 0 ? (
                            <ThemedText style={styles.emptyText}>No hidden groups</ThemedText>
                        ) : (
                            hiddenSubjectObjs.map(subject => (
                                <View key={subject.id} style={styles.hiddenGroupRow}>
                                    <View style={styles.emojiContainer}>
                                        <ThemedText style={styles.emoji}>{subject.emoji}</ThemedText>
                                    </View>
                                    <ThemedText style={styles.subjectName}>{subject.name}</ThemedText>
                                    <TouchableOpacity
                                        onPress={() => handleUnhideSubject(subject.id)}
                                        style={styles.unhideButton}
                                        accessibilityLabel={`Unhide ${subject.name} group`}
                                    >
                                        <Ionicons name="eye" size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                        <TouchableOpacity
                            style={styles.closeModalButton}
                            onPress={() => setShowHiddenModal(false)}
                        >
                            <ThemedText style={styles.closeModalText}>Close</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <WarningModal
                visible={showWarningModal}
                onAccept={handleAcceptWarning}
                isDark={isDark}
                colors={colors}
            />
        </ThemedView>
    );
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
    pinnedCard: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 24,
    },
    pinnedIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    emojiContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    emoji: {
        fontSize: 24,
    },
    hideButton: {
        marginLeft: 8,
        padding: 4,
    },
    showHiddenButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        alignSelf: 'center',
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
    },
    showHiddenText: {
        marginLeft: 6,
        fontSize: 15,
        fontWeight: '500',
    },
    hiddenModalContent: {
        width: '80%',
        maxWidth: 400,
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
    },
    hiddenGroupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        width: '100%',
    },
    unhideButton: {
        marginLeft: 'auto',
        padding: 4,
    },
    closeModalButton: {
        marginTop: 16,
        padding: 10,
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        width: '100%',
    },
    closeModalText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    proFeaturesContainer: {
        marginTop: 8,
        gap: 4,
    },
    proFeature: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    proFeatureIcon: {
        fontSize: 16,
    },
    proFeatureText: {
        fontSize: 14,
    },
}); 