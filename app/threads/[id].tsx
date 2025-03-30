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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Thread {
    id: string;
    title: string;
    subjectName: string;
    grade: number;
    createdById: string;
    createdByName: string;
    createdAt: Date;
}

export default function SubjectChatScreen() {
    const { id, subjectName } = useLocalSearchParams();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showNewThreadModal, setShowNewThreadModal] = useState(false);
    const [newThreadTitle, setNewThreadTitle] = useState('');

    useEffect(() => {
        if (subjectName) {
            loadThreads();
        } else {
            console.error('Subject name is missing');
        }
    }, [subjectName]);

    const loadThreads = async () => {
        try {
            const learnerGrade = await AsyncStorage.getItem('learnerGrade');
            console.log('learnerGrade', learnerGrade);
            if (!learnerGrade) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to load threads',
                    position: 'bottom'
                });
                return;
            }
            setIsLoading(true);
            const threadsRef = collection(db, 'threads');
            const q = query(
                threadsRef,
                where('subjectName', '==', subjectName),
                where('grade', '==', 12),
                orderBy('createdAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const threadsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt.toDate()
            })) as Thread[];

            setThreads(threadsData);
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
        }
    };

    const createNewThread = async () => {
        if (!newThreadTitle.trim() || !user?.uid) return;

        try {
            //get learner grade from AsyncStorage
            const learnerGrade = await AsyncStorage.getItem('learnerGrade');
            //get learner name from AsyncStorage
            const learnerName = await AsyncStorage.getItem('learnerName');
            if (!learnerGrade || !learnerName) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to create thread',
                    position: 'bottom'
                });
                return;
            }
            const threadData = {
                title: newThreadTitle.trim(),
                subjectName: subjectName as string,
                grade: parseInt(learnerGrade || '12'),
                createdById: user.uid,
                createdByName: learnerName || 'Anonymous',
                createdAt: new Date()
            };

            const docRef = await addDoc(collection(db, 'threads'), threadData);
            const newThread = {
                id: docRef.id,
                ...threadData,
                createdAt: threadData.createdAt
            };

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
            onPress={() => router.push({
                pathname: '/posts/[threadId]',
                params: {
                    threadId: item.id,
                    subjectName: item.subjectName
                }
            })}
        >
            <View style={styles.threadContent}>
                <ThemedText style={styles.threadTitle}>{item.title}</ThemedText>
                <ThemedText style={styles.threadMeta}>
                    Created by {item.createdByName} • {item.createdAt.toLocaleDateString()}
                </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
    );

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
                <ThemedText style={styles.headerTitle}>{subjectName}</ThemedText>
                <TouchableOpacity
                    style={styles.newThreadButton}
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
                />
            )}

            <Modal
                visible={showNewThreadModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowNewThreadModal(false)}
            >
                <View style={styles.modalOverlay}>
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
                        />
                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: colors.primary }]}
                            onPress={createNewThread}
                            disabled={!newThreadTitle.trim()}
                        >
                            <ThemedText style={styles.modalButtonText}>Create Discussion</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
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
        paddingTop: Platform.OS === 'ios' ? 60 : 16,
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    newThreadButton: {
        padding: 8,
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
        fontSize: 12,
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
}); 