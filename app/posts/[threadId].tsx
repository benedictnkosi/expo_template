import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, onSnapshot, addDoc, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Basic profanity detection
const PROFANITY_WORDS = [
    // Add your profanity list here
    'badword1',
    'badword2',
    // ... more words
];

function containsProfanity(text: string): boolean {
    const lowerText = text.toLowerCase();
    return PROFANITY_WORDS.some(word => lowerText.includes(word));
}

interface Message {
    id: string;
    text: string;
    authorUID: string;
    createdAt: Date;
    threadId: string;
    userName: string;
}

interface Thread {
    id: string;
    title: string;
    subjectName: string;
    grade: number;
    createdById: string;
    createdByName: string;
    createdAt: Date;
}

export default function ThreadDetailScreen() {
    const { threadId, subjectName } = useLocalSearchParams();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const [messages, setMessages] = useState<Message[]>([]);
    const [thread, setThread] = useState<Thread | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (!threadId || !subjectName) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Missing required parameters',
                position: 'bottom'
            });
            return;
        }
        loadThreadAndMessages();
    }, [threadId, subjectName]);

    const loadThreadAndMessages = async () => {
        try {
            setIsLoading(true);

            // Load thread details
            const threadDoc = await getDoc(doc(db, 'threads', threadId as string));
            if (threadDoc.exists()) {
                const threadData = {
                    id: threadDoc.id,
                    ...threadDoc.data(),
                    createdAt: threadDoc.data().createdAt.toDate()
                } as Thread;
                setThread(threadData);
            }

            // Set up real-time listener for messages
            const messagesRef = collection(db, 'messages');
            const q = query(
                messagesRef,
                where('threadId', '==', threadId),
                orderBy('createdAt', 'asc')
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const messagesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt.toDate()
                })) as Message[];
                setMessages(messagesData);
                setIsLoading(false);
            }, (error) => {
                console.error('Error listening to messages:', error);
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to load messages',
                    position: 'bottom'
                });
                setIsLoading(false);
            });

            // Cleanup function
            return () => unsubscribe();
        } catch (error) {
            console.error('Error loading thread:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load thread',
                position: 'bottom'
            });
            setIsLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!newMessage.trim() || !user?.uid || !threadId) return;

        // Check for profanity
        if (containsProfanity(newMessage.trim())) {
            Toast.show({
                type: 'error',
                text1: 'Warning',
                text2: 'Please keep the discussion respectful. Profanity and bullying are not allowed.',
                position: 'bottom'
            });
            return;
        }

        try {
            //get name from AsyncStorage    
            const learnerName = await AsyncStorage.getItem('learnerName');
            if (!learnerName) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to send message',
                    position: 'bottom'
                });
                return;
            }
            const messageData: Omit<Message, 'id'> = {
                text: newMessage.trim(),
                authorUID: user.uid,
                threadId: threadId as string,
                createdAt: new Date(),
                userName: learnerName || 'Anonymous'
            };

            await addDoc(collection(db, 'messages'), messageData);
            setNewMessage('');
            flatListRef.current?.scrollToEnd({ animated: true });
        } catch (error) {
            console.error('Error sending message:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to send message',
                position: 'bottom'
            });
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isOwnMessage = item.authorUID === user?.uid;

        return (
            <View style={[
                styles.messageContainer,
                isOwnMessage ? styles.ownMessage : styles.otherMessage
            ]}>
                <ThemedText style={[
                    styles.userName,
                    isOwnMessage ? styles.ownUserName : styles.otherUserName
                ]}>
                    {item.userName || 'Anonymous'}
                </ThemedText>
                <View style={[
                    styles.messageBubble,
                    isOwnMessage ? styles.ownBubble : styles.otherBubble,
                    { backgroundColor: isOwnMessage ? colors.primary : (isDark ? colors.card : '#E5E7EB') }
                ]}>
                    <ThemedText style={[
                        styles.messageText,
                        { color: isOwnMessage ? '#FFFFFF' : colors.text }
                    ]}>
                        {item.text}
                    </ThemedText>
                </View>
            </View>
        );
    };

    if (!thread) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#F3F4F6' }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <ThemedText style={styles.loadingText}>Loading thread...</ThemedText>
                </View>
            </SafeAreaView>
        );
    }

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
                <View style={styles.headerContent}>
                    <ThemedText style={styles.headerTitle}>{thread.title}</ThemedText>
                    <ThemedText style={styles.headerSubtitle}>
                        Created by {thread.createdByName} • {thread.createdAt.toLocaleDateString()}
                    </ThemedText>
                </View>
            </LinearGradient>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.messagesList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />

                <View style={[styles.inputContainer, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
                    <TextInput
                        style={[
                            styles.input,
                            { color: colors.text, backgroundColor: isDark ? colors.surface : '#F3F4F6' }
                        ]}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        placeholder="Type a message..."
                        placeholderTextColor={isDark ? colors.textSecondary : '#9CA3AF'}
                        multiline
                        maxLength={250}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: colors.primary }]}
                        onPress={sendMessage}
                        disabled={!newMessage.trim()}
                    >
                        <Ionicons
                            name="send"
                            size={24}
                            color={newMessage.trim() ? '#FFFFFF' : '#9CA3AF'}
                        />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
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
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#FFFFFF',
        opacity: 0.8,
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
    keyboardAvoidingView: {
        flex: 1,
    },
    messagesList: {
        padding: 16,
    },
    messageContainer: {
        marginBottom: 16,
        maxWidth: '80%',
    },
    ownMessage: {
        alignSelf: 'flex-end',
    },
    otherMessage: {
        alignSelf: 'flex-start',
    },
    userName: {
        fontSize: 12,
        marginBottom: 4,
        opacity: 0.7,
    },
    ownUserName: {
        textAlign: 'right',
    },
    otherUserName: {
        textAlign: 'left',
    },
    messageBubble: {
        padding: 12,
        borderRadius: 16,
    },
    ownBubble: {
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    input: {
        flex: 1,
        marginRight: 12,
        padding: 12,
        borderRadius: 20,
        fontSize: 16,
        maxHeight: 100,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
}); 