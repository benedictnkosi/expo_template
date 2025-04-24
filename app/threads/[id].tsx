import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Modal,
    ActivityIndicator,
    Platform,
    Image,
    KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs, addDoc, orderBy, limit, startAfter, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredPushToken } from '@/services/notifications';
import { HOST_URL } from '@/config/api';
import { getSubjectIcon } from '@/utils/subjectIcons';

interface Thread {
    id: string;
    title: string;
    subjectName: string;
    grade: number;
    createdById: string;
    createdByName: string;
    createdAt: Date;
    newMessageCount?: number;
    isSubscribed?: boolean;
}

const NoTopicsFound = ({ isDark, colors }: { isDark: boolean; colors: any }) => (
    <View style={styles.noTopicsContainer}>
        <Ionicons
            name="chatbubbles-outline"
            size={64}
            color={isDark ? colors.textSecondary : '#9CA3AF'}
        />
        <ThemedText style={styles.noTopicsTitle}>No Topics Yet</ThemedText>
        <ThemedText style={styles.noTopicsSubtitle}>
            Be the first to start a discussion in this subject
        </ThemedText>
    </View>
);

export default function SubjectChatScreen() {
    const { id, subjectName } = useLocalSearchParams();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [lastVisible, setLastVisible] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const [showNewThreadModal, setShowNewThreadModal] = useState(false);
    const [newThreadTitle, setNewThreadTitle] = useState('');
    const [lastAccessTimes, setLastAccessTimes] = useState<Record<string, number>>({});
    const THREADS_PER_PAGE = 100;

    useEffect(() => {
        if (subjectName) {
            loadThreads();
            loadLastAccessTimes();
        } else {
            console.error('Subject name is missing');
        }
    }, [subjectName]);

    // Add focus effect to reload threads when returning from thread detail
    useFocusEffect(
        React.useCallback(() => {
            if (subjectName) {
                loadLastAccessTimes().then(() => {
                    loadThreads();
                });
            }
        }, [subjectName])
    );

    const loadLastAccessTimes = async () => {
        try {
            const times = await AsyncStorage.getItem('threadLastAccessTimes');
            if (times) {
                setLastAccessTimes(JSON.parse(times));
            }
        } catch (error) {
            console.error('Error loading last access times:', error);
        }
    };

    const updateLastAccessTime = async (threadId: string) => {
        try {
            const currentTime = Date.now();
            const newTimes = { ...lastAccessTimes, [threadId]: currentTime };
            await AsyncStorage.setItem('threadLastAccessTimes', JSON.stringify(newTimes));
            setLastAccessTimes(newTimes);
        } catch (error) {
            console.error('Error updating last access time:', error);
        }
    };

    const toggleThreadNotifications = async (thread: Thread) => {
        if (!user?.uid) return;

        try {
            const pushToken = await getStoredPushToken();
            if (!pushToken) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Push notification token not found',
                    position: 'bottom'
                });
                return;
            }

            const notificationsRef = collection(db, 'notifications');
            const notificationQuery = query(
                notificationsRef,
                where('authorID', '==', user.uid),
                where('threadId', '==', thread.id)
            );
            const querySnapshot = await getDocs(notificationQuery);

            if (querySnapshot.empty) {
                // Enable notifications
                await addDoc(notificationsRef, {
                    authorID: user.uid,
                    pushToken,
                    threadId: thread.id
                });
                setThreads(prev => prev.map(t =>
                    t.id === thread.id ? { ...t, isSubscribed: true } : t
                ));
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Notifications enabled for this thread',
                    position: 'bottom'
                });
            } else {
                // Disable notifications
                const docRef = doc(db, 'notifications', querySnapshot.docs[0].id);
                await deleteDoc(docRef);
                setThreads(prev => prev.map(t =>
                    t.id === thread.id ? { ...t, isSubscribed: false } : t
                ));
                Toast.show({
                    type: 'info',
                    text1: 'Success',
                    text2: 'Notifications disabled for this thread',
                    position: 'bottom'
                });
            }
        } catch (error) {
            console.error('Error toggling thread notifications:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to update notification settings',
                position: 'bottom'
            });
        }
    };

    const loadThreads = async (loadMore = false) => {
        try {
            // Get fresh last access times before loading threads
            const times = await AsyncStorage.getItem('threadLastAccessTimes');
            const freshLastAccessTimes = times ? JSON.parse(times) : {};
            setLastAccessTimes(freshLastAccessTimes);

            const learnerGrade = await AsyncStorage.getItem('learnerGrade');
            if (!learnerGrade) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to load threads - grade not found',
                    position: 'bottom'
                });
                return;
            }

            const grade = parseInt(learnerGrade);
            if (isNaN(grade) || grade < 1 || grade > 12) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Invalid grade level',
                    position: 'bottom'
                });
                return;
            }

            if (!loadMore) {
                setIsLoading(true);
            } else {
                setIsLoadingMore(true);
            }

            const threadsRef = collection(db, 'threads');
            let q = query(
                threadsRef,
                where('subjectName', '==', subjectName),
                where('grade', '==', grade),
                orderBy('createdAt', 'desc'),
                limit(THREADS_PER_PAGE)
            );

            if (loadMore && lastVisible) {
                q = query(
                    threadsRef,
                    where('subjectName', '==', subjectName),
                    where('grade', '==', grade),
                    orderBy('createdAt', 'desc'),
                    startAfter(lastVisible),
                    limit(THREADS_PER_PAGE)
                );
            }

            const querySnapshot = await getDocs(q);
            let threadsWithCounts = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt.toDate()
            })) as Thread[];

            // Get new message counts for each thread using fresh last access times
            threadsWithCounts = await Promise.all(
                threadsWithCounts.map(async (thread) => {
                    const lastAccess = freshLastAccessTimes[thread.id] || 0;
                    const messagesRef = collection(db, 'messages');
                    const messagesQuery = query(
                        messagesRef,
                        where('threadId', '==', thread.id),
                        where('createdAt', '>', new Date(lastAccess))
                    );
                    const messagesSnapshot = await getDocs(messagesQuery);
                    return {
                        ...thread,
                        newMessageCount: messagesSnapshot.size
                    };
                })
            );

            // Get notification subscriptions for the current user
            if (user?.uid) {
                const notificationsRef = collection(db, 'notifications');
                const notificationQuery = query(
                    notificationsRef,
                    where('authorID', '==', user.uid)
                );
                const notificationSnapshot = await getDocs(notificationQuery);
                const subscribedThreadIds = new Set(notificationSnapshot.docs.map(doc => doc.data().threadId));

                // Add isSubscribed flag to threads
                threadsWithCounts = threadsWithCounts.map(thread => ({
                    ...thread,
                    isSubscribed: subscribedThreadIds.has(thread.id)
                }));
            }

            setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
            setHasMore(querySnapshot.docs.length === THREADS_PER_PAGE);

            if (loadMore) {
                setThreads(prev => [...prev, ...threadsWithCounts]);
            } else {
                setThreads(threadsWithCounts);
            }
        } catch (error) {
            console.error('Error loading threads:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load threads',
                position: 'bottom'
            });
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    };

    const handleThreadPress = async (thread: Thread) => {
        await updateLastAccessTime(thread.id);
        router.push({
            pathname: '/posts/[threadId]',
            params: {
                threadId: thread.id,
                subjectName: thread.subjectName
            }
        });
    };

    const createNewThread = async () => {
        if (!newThreadTitle.trim() || !user?.uid) return;

        try {
            //get learner grade from AsyncStorage
            const learnerGrade = await AsyncStorage.getItem('learnerGrade');
            //get learner name from AsyncStorage
            const learnerName = await AsyncStorage.getItem('learnerName');

            // Enhanced validation
            if (!learnerGrade || !learnerName) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Missing user information. Please ensure you are properly logged in.',
                    position: 'bottom'
                });
                return;
            }


            // Validate grade is a number and within acceptable range
            const grade = parseInt(learnerGrade);
            if (isNaN(grade) || grade < 1 || grade > 12) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Invalid grade level',
                    position: 'bottom'
                });
                return;
            }

            // Validate title length and content
            if (newThreadTitle.trim().length < 3) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Thread title must be at least 3 characters long',
                    position: 'bottom'
                });
                return;
            }

            // Validate that title is not an email address
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailRegex.test(newThreadTitle.trim())) {
                return;
            }

            const threadData = {
                title: newThreadTitle.trim(),
                subjectName: subjectName as string,
                grade: grade,
                createdById: user.uid,
                createdByName: learnerName,
                createdAt: new Date()
            };

            // Validate subject name
            if (!subjectName || typeof subjectName !== 'string') {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Invalid subject name',
                    position: 'bottom'
                });
                return;
            }

            const docRef = await addDoc(collection(db, 'threads'), threadData);
            const newThread = {
                id: docRef.id,
                ...threadData,
                createdAt: threadData.createdAt
            };

            // Send push notification for new thread (non-blocking)
            fetch(`${HOST_URL}/api/push-notifications/new-thread`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subject_name: subjectName,
                    thread_title: newThreadTitle.trim(),
                    uid: user.uid
                })
            }).catch(error => {
                console.error('Error sending push notification for new thread:', error);
            });

            setThreads(prev => [newThread, ...prev]);
            setNewThreadTitle('');
            setShowNewThreadModal(false);
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'New thread created',
                position: 'bottom'
            });
        } catch (error) {
            console.error('Error creating thread:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to create thread',
                position: 'bottom'
            });
        }
    };

    const renderThread = ({ item }: { item: Thread }) => (
        <TouchableOpacity
            style={[
                styles.threadItem,
                { backgroundColor: isDark ? colors.card : '#FFFFFF' }
            ]}
            onPress={() => handleThreadPress(item)}
        >
            <View style={styles.threadContent}>
                <ThemedText style={styles.threadTitle}>{item.title}</ThemedText>
                <ThemedText style={styles.threadMeta}>
                    Created by {item.createdByName} • {item.createdAt.toLocaleDateString()}
                </ThemedText>
            </View>
            <View style={styles.threadRightContent}>
                {(item.newMessageCount ?? 0) > 0 && (
                    <View style={[styles.newMessageBadge, { backgroundColor: colors.primary }]}>
                        <ThemedText style={styles.newMessageCount}>{item.newMessageCount}</ThemedText>
                    </View>
                )}
                <TouchableOpacity
                    onPress={(e) => {
                        e.stopPropagation();
                        toggleThreadNotifications(item);
                    }}
                    style={styles.notificationButton}
                >
                    <Ionicons
                        name={item.isSubscribed ? "notifications" : "notifications-outline"}
                        size={24}
                        color={item.isSubscribed ? colors.primary : colors.textSecondary}
                    />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </View>
        </TouchableOpacity>
    );

    const renderFooter = () => {
        if (!hasMore) return null;

        return (
            <TouchableOpacity
                style={[styles.loadMoreButton, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}
                onPress={() => loadThreads(true)}
                disabled={isLoadingMore}
            >
                {isLoadingMore ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <ThemedText style={styles.loadMoreText}>Load More</ThemedText>
                )}
            </TouchableOpacity>
        );
    };


    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#F3F4F6' }]}>
            <LinearGradient
                colors={isDark ? ['#4F46E5', '#4338CA'] : ['#10B981', '#047857']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Image
                        source={getSubjectIcon(subjectName as string)}
                        style={styles.headerIcon}
                    />
                    <ThemedText style={styles.headerTitle}>{subjectName}</ThemedText>
                </View>
                <TouchableOpacity
                    style={[styles.newThreadButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
                    onPress={() => setShowNewThreadModal(true)}
                >
                    <Ionicons name="add" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </LinearGradient>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <ThemedText style={styles.loadingText}>Loading discussions...</ThemedText>
                </View>
            ) : (
                <FlatList
                    data={threads}
                    renderItem={renderThread}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.threadsList}
                    ListFooterComponent={renderFooter}
                    ListEmptyComponent={() => <NoTopicsFound isDark={isDark} colors={colors} />}
                />
            )}

            <Modal
                visible={showNewThreadModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowNewThreadModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setShowNewThreadModal(false)}
                    >
                        <View style={[styles.modalContent, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
                            <View style={styles.modalHeader}>
                                <ThemedText style={styles.modalTitle}>New Discussion</ThemedText>
                                <TouchableOpacity onPress={() => setShowNewThreadModal(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={[
                                    styles.modalInput,
                                    { color: colors.text, backgroundColor: isDark ? colors.surface : '#F3F4F6' }
                                ]}
                                value={newThreadTitle}
                                onChangeText={setNewThreadTitle}
                                placeholder="Enter discussion title..."
                                placeholderTextColor={isDark ? colors.textSecondary : '#9CA3AF'}
                                maxLength={50}
                                autoFocus
                            />
                            <TouchableOpacity
                                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                                onPress={createNewThread}
                                disabled={!newThreadTitle.trim()}
                            >
                                <ThemedText style={styles.modalButtonText}>Create Discussion</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: Platform.OS === 'ios' ? 16 : 16,
    },
    backButton: {
        marginRight: 16,
    },
    headerTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerIcon: {
        width: 32,
        height: 32,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    newThreadButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
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
    threadsList: {
        padding: 16,
    },
    threadItem: {
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
    threadContent: {
        flex: 1,
    },
    threadTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    threadMeta: {
        fontSize: 14,
        opacity: 0.7,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    modalInput: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        fontSize: 16,
    },
    modalButton: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    loadMoreButton: {
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    loadMoreText: {
        fontSize: 16,
        fontWeight: '600',
    },
    threadRightContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    newMessageBadge: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    newMessageCount: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    noTopicsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    noTopicsTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    noTopicsSubtitle: {
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.7,
    },
    notificationButton: {
        padding: 8,
    },
}); 