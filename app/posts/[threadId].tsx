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
    Modal,
    Pressable,
    ViewStyle,
    TextStyle,
    Image,
    ImageStyle,
    Linking,
    Dimensions,
    Alert,
    GestureResponderEvent,
    Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, onSnapshot, addDoc, orderBy, doc, getDoc, limit, startAfter, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportMessage, uploadFile, getFileUrl } from '@/services/api';
import { getDocumentAsync } from 'expo-document-picker';
import { DocumentPickerResult, DocumentPickerAsset } from 'expo-document-picker';
import { API_BASE_URL } from '@/config/api';
import ZoomableImageNew from '@/components/ZoomableImageNew';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';

// Basic profanity detection
const PROFANITY_WORDS = [
    'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'crap', 'dick', 'piss', 'wanker',
    'cunt', 'bollocks', 'prick', 'twat', 'bugger', 'slut', 'whore', 'arse', 'douche',
    'jackass', 'motherfucker', 'faggot', 'nigger', 'spic', 'chink', 'kike', 'retard',
    'gook', 'tranny', 'hoe', 'cock', 'pussy', 'tit', 'boob', 'cum', 'dildo', 'fag',
    'skank', 'slag', 'tosser', 'wank', 'bollock', 'minge', 'shag', 'git', 'bellend'
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
    replyTo?: {
        id: string;
        text: string;
        userName: string;
    };
    attachment?: {
        url: string;
        type: 'image' | 'pdf';
        name: string;
    };
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

const MESSAGES_PER_PAGE = 100;

interface Styles {
    container: ViewStyle;
    header: ViewStyle;
    backButton: ViewStyle;
    headerContent: ViewStyle;
    headerTitle: TextStyle;
    headerSubtitle: TextStyle;
    loadingContainer: ViewStyle;
    loadingText: TextStyle;
    keyboardAvoidingView: ViewStyle;
    messagesList: ViewStyle;
    messageContainer: ViewStyle;
    ownMessage: ViewStyle;
    otherMessage: ViewStyle;
    userName: TextStyle;
    ownUserName: TextStyle;
    otherUserName: TextStyle;
    messageBubble: ViewStyle;
    ownBubble: ViewStyle;
    otherBubble: ViewStyle;
    messageText: TextStyle;
    inputContainer: ViewStyle;
    input: TextStyle;
    sendButton: ViewStyle;
    footer: ViewStyle;
    loadMoreButton: ViewStyle;
    loadMoreText: TextStyle;
    modalOverlay: ViewStyle;
    reportModalContent: ViewStyle;
    reportModalTitle: TextStyle;
    reportInput: TextStyle;
    reportModalButtons: ViewStyle;
    reportModalButton: ViewStyle;
    cancelButton: ViewStyle;
    submitButton: ViewStyle;
    buttonText: TextStyle;
    attachButton: ViewStyle;
    selectedFileContainer: ViewStyle;
    selectedFileText: TextStyle;
    removeFileButton: ViewStyle;
    attachmentContainer: ViewStyle;
    attachmentImage: ImageStyle;
    pdfContainer: ViewStyle;
    pdfText: TextStyle;
    retryButton: ViewStyle;
    retryButtonText: TextStyle;
    imageModalContainer: ViewStyle;
    closeButton: ViewStyle;
    error: TextStyle;
    attachmentImageContainer: ViewStyle;
    imageErrorContainer: ViewStyle;
    imageErrorText: TextStyle;
    replyContainer: ViewStyle;
    replyUserName: TextStyle;
    replyText: TextStyle;
    replyingToContainer: ViewStyle;
    replyingToContent: ViewStyle;
    replyingToLabel: TextStyle;
    replyingToText: TextStyle;
    inputHint: TextStyle;
}

interface SelectedFile {
    uri: string;
    name: string;
    mimeType: string;
}

// Add new interface for the context menu position
interface ContextMenuPosition {
    x: number;
    y: number;
    message: Message;
}

interface MessageItemProps {
    item: Message;
    isOwnMessage: boolean;
    onReply: (message: Message) => void;
    onLongPress: (message: Message, event: GestureResponderEvent) => void;
    colors: any;
    isDark: boolean;
    failedImages: Set<string>;
    setFailedImages: React.Dispatch<React.SetStateAction<Set<string>>>;
    handleAttachmentPress: (attachment: Message['attachment']) => void;
}

const MessageItem = React.memo(({
    item,
    isOwnMessage,
    onReply,
    onLongPress,
    colors,
    isDark,
    failedImages,
    setFailedImages,
    handleAttachmentPress
}: MessageItemProps) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const swipeThreshold = 80;

    const onGestureEvent = Animated.event(
        [{ nativeEvent: { translationX: translateX } }],
        { useNativeDriver: true }
    );

    const onHandlerStateChange = ({ nativeEvent }: any) => {
        if (nativeEvent.oldState === State.ACTIVE) {
            const translation = Math.abs(nativeEvent.translationX);

            Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: true,
            }).start();

            if (translation > swipeThreshold) {
                onReply(item);
            }
        }
    };

    return (
        <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            activeOffsetX={[-20, 20]}
        >
            <Animated.View style={[
                styles.messageContainer,
                isOwnMessage ? styles.ownMessage : styles.otherMessage,
                {
                    transform: [{
                        translateX: translateX.interpolate({
                            inputRange: [-100, 0],
                            outputRange: [-50, 0],
                            extrapolate: 'clamp',
                        })
                    }]
                }
            ]}>
                <Pressable
                    onLongPress={(event) => onLongPress(item, event)}
                    delayLongPress={500}
                >
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
                        {item.replyTo && (
                            <TouchableOpacity
                                style={[styles.replyContainer, {
                                    backgroundColor: isOwnMessage
                                        ? 'rgba(255, 255, 255, 0.1)'
                                        : (isDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.05)')
                                }]}
                            >
                                <ThemedText style={[styles.replyUserName, { color: isOwnMessage ? '#FFFFFF' : colors.text }]}>
                                    {item.replyTo.userName}
                                </ThemedText>
                                <ThemedText
                                    style={[styles.replyText, { color: isOwnMessage ? '#FFFFFF' : colors.text }]}
                                    numberOfLines={1}
                                >
                                    {item.replyTo.text}
                                </ThemedText>
                            </TouchableOpacity>
                        )}
                        {item.attachment && (
                            <View style={styles.attachmentContainer}>
                                {item.attachment.type === 'image' ? (
                                    <TouchableOpacity
                                        onPress={() => !failedImages.has(item.attachment?.url || '') && handleAttachmentPress(item.attachment)}
                                        style={styles.attachmentImageContainer}
                                    >
                                        {failedImages.has(item.attachment.url) ? (
                                            <View style={[styles.imageErrorContainer, { backgroundColor: isDark ? colors.surface : '#F3F4F6' }]}>
                                                <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
                                                <ThemedText style={styles.imageErrorText}>Image not available</ThemedText>
                                            </View>
                                        ) : (
                                            <Image
                                                source={{ uri: item.attachment.url }}
                                                style={styles.attachmentImage}
                                                resizeMode="cover"
                                                onError={() => {
                                                    setFailedImages((prev: Set<string>) => new Set([...prev, item.attachment?.url || '']));
                                                }}
                                            />
                                        )}
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.pdfContainer}
                                        onPress={() => handleAttachmentPress(item.attachment)}
                                    >
                                        <Ionicons name="document-text" size={24} color={isOwnMessage ? '#FFFFFF' : colors.text} />
                                        <ThemedText style={[styles.pdfText, { color: isOwnMessage ? '#FFFFFF' : colors.text }]}>
                                            {item.attachment.name}
                                        </ThemedText>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                        {item.text && (
                            <ThemedText style={[
                                styles.messageText,
                                { color: isOwnMessage ? '#FFFFFF' : colors.text }
                            ]}>
                                {item.text}
                            </ThemedText>
                        )}
                    </View>
                </Pressable>
            </Animated.View>
        </PanGestureHandler>
    );
});

export default function ThreadDetailScreen() {
    const { threadId, subjectName } = useLocalSearchParams();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [messages, setMessages] = useState<Message[]>([]);
    const [thread, setThread] = useState<Thread | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);
    const [lastVisible, setLastVisible] = useState<any>(null);
    const flatListRef = useRef<FlatList>(null);
    const [isReportModalVisible, setIsReportModalVisible] = useState(false);
    const [reportComment, setReportComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isImageModalVisible, setIsImageModalVisible] = useState(false);
    const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);

    useEffect(() => {
        if (!threadId || !subjectName) {
            setLoadError('Missing required parameters');
            setIsLoading(false);
            return;
        }

        // Set a timeout to prevent infinite loading
        // const timeoutId = setTimeout(() => {
        //     if (isLoading) {
        //         setLoadError('Loading timed out. Please try again.');
        //         setIsLoading(false);
        //     }
        // }, 10000); // 10 seconds timeout

        loadThreadAndMessages();

        return () => {
        };
    }, [threadId, subjectName]);

    const loadThreadAndMessages = async () => {
        try {
            setIsLoading(true);
            setLoadError(null);

            // Load thread details
            const threadDoc = await getDoc(doc(db, 'threads', threadId as string));
            if (!threadDoc.exists()) {
                setLoadError('Thread not found');
                setIsLoading(false);
                return;
            }

            const threadData = {
                id: threadDoc.id,
                ...threadDoc.data(),
                createdAt: threadDoc.data().createdAt.toDate()
            } as Thread;
            setThread(threadData);

            // Set up initial messages query with limit
            const messagesRef = collection(db, 'messages');
            const q = query(
                messagesRef,
                where('threadId', '==', threadId),
                orderBy('createdAt', 'desc'),
                limit(MESSAGES_PER_PAGE)
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const messagesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt.toDate()
                })) as Message[];

                setMessages(messagesData.reverse());
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
                setHasMoreMessages(snapshot.docs.length === MESSAGES_PER_PAGE);
                setIsLoading(false);
            }, (error) => {
                console.error('Error listening to messages:', error);
                setLoadError('Failed to load messages');
                setIsLoading(false);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error('Error loading thread:', error);
            setLoadError('Failed to load thread');
            setIsLoading(false);
        }
    };

    const loadMoreMessages = async () => {
        if (!lastVisible || isLoadingMore || !hasMoreMessages) return;

        try {
            setIsLoadingMore(true);
            const messagesRef = collection(db, 'messages');
            const q = query(
                messagesRef,
                where('threadId', '==', threadId),
                orderBy('createdAt', 'desc'),
                startAfter(lastVisible),
                limit(MESSAGES_PER_PAGE)
            );

            const snapshot = await getDocs(q);
            const newMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt.toDate()
            })) as Message[];

            if (newMessages.length > 0) {
                setMessages(prev => [...prev, ...newMessages.reverse()]);
                setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
                setHasMoreMessages(snapshot.docs.length === MESSAGES_PER_PAGE);
            } else {
                setHasMoreMessages(false);
            }
        } catch (error) {
            console.error('Error loading more messages:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load more messages',
                position: 'bottom'
            });
        } finally {
            setIsLoadingMore(false);
        }
    };

    const pickDocument = async () => {
        try {
            const result = await getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });

            if (result.assets && result.assets.length > 0) {
                const selectedAsset = result.assets[0];
                setSelectedFile({
                    uri: selectedAsset.uri,
                    name: selectedAsset.name,
                    mimeType: selectedAsset.mimeType || 'application/octet-stream'
                });
                Toast.show({
                    type: 'success',
                    text1: 'File Selected',
                    text2: `Selected: ${selectedAsset.name}`,
                    position: 'bottom'
                });
            } else {
                Toast.show({
                    type: 'info',
                    text1: 'Selection Cancelled',
                    text2: 'No file was selected',
                    position: 'bottom'
                });
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to pick document. Please try again.',
                position: 'bottom'
            });
        }
    };

    const uploadFileToServer = async (uri: string, fileName: string, mimeType: string) => {
        try {
            console.log('Starting file upload:', { uri, fileName, mimeType });
            const formData = new FormData();
            formData.append('file', {
                uri,
                type: mimeType,
                name: fileName
            } as any);

            console.log('FormData created, sending request...');
            const response = await uploadFile(formData);
            console.log('Upload response:', response);

            if (!response.fileName) {
                throw new Error('No file name in response');
            }

            const fileUrl = `${API_BASE_URL}/get-chat-file?file=${response.fileName}`;

            return fileUrl;
        } catch (error) {
            console.error('Error uploading file:', error);
            Toast.show({
                type: 'error',
                text1: 'Upload Failed',
                text2: 'Failed to upload file. Please try again.',
                position: 'bottom'
            });
            throw error;
        }
    };

    const handleReply = (message: Message) => {
        setReplyingTo(message);
    };

    const sendMessage = async () => {
        if ((!newMessage.trim() && !selectedFile) || !user?.uid || !threadId) {
            console.log('Cannot send message:', {
                hasText: !!newMessage.trim(),
                hasFile: !!selectedFile,
                hasUser: !!user?.uid,
                hasThreadId: !!threadId
            });
            return;
        }

        // Check for profanity in text message
        if (newMessage.trim() && containsProfanity(newMessage.trim())) {
            Toast.show({
                type: 'error',
                text1: 'Warning',
                text2: 'Please keep the discussion respectful. Profanity and bullying are not allowed.',
                position: 'bottom'
            });
            return;
        }

        try {
            setIsUploading(true);
            const learnerName = await AsyncStorage.getItem('learnerName');
            if (!learnerName) {
                console.error('No learner name found in AsyncStorage');
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to send message: User information not found',
                    position: 'bottom'
                });
                return;
            }

            let attachment: Message['attachment'];
            if (selectedFile) {
                console.log('Processing file attachment:', selectedFile);
                const fileType = selectedFile.mimeType.startsWith('image/') ? 'image' as const : 'pdf' as const;
                const fileUrl = await uploadFileToServer(
                    selectedFile.uri,
                    selectedFile.name,
                    selectedFile.mimeType
                );
                attachment = {
                    url: fileUrl,
                    type: fileType,
                    name: selectedFile.name
                };
                console.log('File uploaded successfully:', attachment);
            }

            const messageData: Omit<Message, 'id'> = {
                text: newMessage.trim(),
                authorUID: user.uid,
                threadId: threadId as string,
                createdAt: new Date(),
                userName: learnerName || 'Anonymous',
                ...(attachment && { attachment }),
                ...(replyingTo && {
                    replyTo: {
                        id: replyingTo.id,
                        text: replyingTo.text,
                        userName: replyingTo.userName
                    }
                })
            };

            await addDoc(collection(db, 'messages'), messageData);
            setNewMessage('');
            setSelectedFile(null);
            setReplyingTo(null);
            flatListRef.current?.scrollToEnd({ animated: true });
        } catch (error) {
            console.error('Error sending message:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to send message',
                position: 'bottom'
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleReportMessage = (message: Message) => {
        setSelectedMessage(message);
        setIsReportModalVisible(true);
    };

    const handleSubmitReport = async () => {
        if (!reportComment.trim() || !selectedMessage || !user?.uid) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Please enter a comment',
                position: 'bottom'
            });
            return;
        }

        try {
            setIsSubmitting(true);
            await reportMessage({
                author_id: selectedMessage.authorUID,
                reporter_id: user.uid,
                message_uid: selectedMessage.id,
                message: reportComment.trim()
            });

            // Close the report modal
            setIsReportModalVisible(false);
            setReportComment('');
            setSelectedMessage(null);

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Message reported successfully',
                position: 'bottom'
            });
        } catch (error) {
            console.error('Error reporting message:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to report message',
                position: 'bottom'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteMessage = async (message: Message) => {
        try {
            const messageRef = doc(db, 'messages', message.id);
            await deleteDoc(messageRef);
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Message deleted successfully',
                position: 'bottom'
            });
        } catch (error) {
            console.error('Error deleting message:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete message',
                position: 'bottom'
            });
        }
    };

    const handleMessageLongPress = (message: Message, event: GestureResponderEvent) => {
        const { pageX, pageY } = event.nativeEvent;
        const windowWidth = Dimensions.get('window').width;

        // Calculate menu position with margins
        let x = Math.max(16, Math.min(pageX - 70, windowWidth - 156));
        let y = Math.max(16, pageY - 60);

        setContextMenu({ x, y, message });
    };

    const handleContextMenuOption = (action: 'reply' | 'report' | 'delete') => {
        if (!contextMenu) return;

        switch (action) {
            case 'reply':
                handleReply(contextMenu.message);
                break;
            case 'report':
                handleReportMessage(contextMenu.message);
                break;
            case 'delete':
                handleDeleteMessage(contextMenu.message);
                break;
        }
        setContextMenu(null);
    };

    const handleAttachmentPress = async (attachment: Message['attachment']) => {
        if (!attachment) return;

        if (attachment.type === 'pdf') {
            try {
                console.log('Opening PDF URL:', attachment.url);
                const url = attachment.url;

                if (!url) {
                    throw new Error('PDF URL is missing');
                }

                const supported = await Linking.canOpenURL(url);
                if (supported) {
                    Toast.show({
                        type: 'info',
                        text1: 'Opening PDF',
                        text2: 'Opening in your default PDF viewer...',
                        position: 'bottom'
                    });
                    await Linking.openURL(url);
                } else {
                    console.error('URL not supported:', url);
                    Toast.show({
                        type: 'error',
                        text1: 'Error',
                        text2: 'Your device cannot open this PDF file',
                        position: 'bottom'
                    });
                }
            } catch (error) {
                console.error('Error opening PDF:', error, 'URL:', attachment.url);
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Could not open the PDF file. Please try again.',
                    position: 'bottom'
                });
            }
        } else if (attachment.type === 'image') {
            if (!attachment.url) {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Image URL is missing',
                    position: 'bottom'
                });
                return;
            }
            setSelectedImage(attachment.url);
            setIsImageModalVisible(true);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isOwnMessage = item.authorUID === user?.uid;

        return (
            <MessageItem
                item={item}
                isOwnMessage={isOwnMessage}
                onReply={handleReply}
                onLongPress={handleMessageLongPress}
                colors={colors}
                isDark={isDark}
                failedImages={failedImages}
                setFailedImages={setFailedImages}
                handleAttachmentPress={handleAttachmentPress}
            />
        );
    };

    const renderFooter = () => {
        if (!hasMoreMessages) return null;

        return (
            <View style={styles.footer}>
                {isLoadingMore ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                    <TouchableOpacity
                        style={styles.loadMoreButton}
                        onPress={loadMoreMessages}
                    >
                        <ThemedText style={styles.loadMoreText}>Load More Messages</ThemedText>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#F3F4F6' }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <ThemedText style={styles.loadingText}>Loading thread...</ThemedText>
                </View>
            </SafeAreaView>
        );
    }

    if (loadError || !thread) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#F3F4F6' }]}>
                <View style={styles.loadingContainer}>
                    <ThemedText style={[styles.loadingText, { color: colors.error }]}>{loadError}</ThemedText>
                    <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.primary }]}
                        onPress={loadThreadAndMessages}
                    >
                        <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
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
                        ListFooterComponent={renderFooter}
                    />

                    {replyingTo && (
                        <View style={[styles.replyingToContainer, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
                            <View style={styles.replyingToContent}>
                                <ThemedText style={styles.replyingToLabel}>Replying to {replyingTo.userName}</ThemedText>
                                <ThemedText style={styles.replyingToText} numberOfLines={1}>{replyingTo.text}</ThemedText>
                            </View>
                            <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>
                    )}

                    <ThemedText style={[styles.inputHint, { color: isDark ? colors.textSecondary : '#6B7280' }]}>
                        Swipe right to reply • Hold for more options
                    </ThemedText>

                    <View style={[styles.inputContainer, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
                        <TouchableOpacity
                            style={[styles.attachButton, { backgroundColor: isDark ? colors.surface : '#F3F4F6' }]}
                            onPress={pickDocument}
                            disabled={isUploading}
                        >
                            <Ionicons
                                name="attach"
                                size={20}
                                color={isDark ? colors.text : '#9CA3AF'}
                            />
                        </TouchableOpacity>
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
                        {selectedFile && (
                            <View style={[
                                styles.selectedFileContainer,
                                { backgroundColor: isDark ? colors.surface : '#F3F4F6' }
                            ]}>
                                <ThemedText style={styles.selectedFileText} numberOfLines={1}>
                                    {selectedFile.name}
                                </ThemedText>
                                <TouchableOpacity
                                    onPress={() => setSelectedFile(null)}
                                    style={styles.removeFileButton}
                                >
                                    <Ionicons name="close-circle" size={16} color={colors.text} />
                                </TouchableOpacity>
                            </View>
                        )}
                        <TouchableOpacity
                            style={[styles.sendButton, { backgroundColor: colors.primary }]}
                            onPress={sendMessage}
                            disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                        >
                            {isUploading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Ionicons
                                    name="send"
                                    size={18}
                                    color={newMessage.trim() || selectedFile ? '#FFFFFF' : '#9CA3AF'}
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>

                <Modal
                    visible={isReportModalVisible}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setIsReportModalVisible(false)}
                >
                    <Pressable
                        style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
                        onPress={() => setIsReportModalVisible(false)}
                    >
                        <View style={[styles.reportModalContent, {
                            backgroundColor: isDark ? colors.card : '#FFFFFF',
                            marginTop: insets.top
                        }]}>
                            <ThemedText style={[styles.reportModalTitle, { color: colors.text }]}>Report Message</ThemedText>
                            <TextInput
                                style={[styles.reportInput, {
                                    backgroundColor: isDark ? colors.surface : '#F8FAFC',
                                    borderColor: colors.border,
                                    color: colors.text
                                }]}
                                placeholder="Why are you reporting this message?"
                                placeholderTextColor={isDark ? '#666666' : '#64748B'}
                                value={reportComment}
                                onChangeText={setReportComment}
                                multiline
                                maxLength={200}
                            />
                            <View style={styles.reportModalButtons}>
                                <TouchableOpacity
                                    style={[styles.reportModalButton, styles.cancelButton, {
                                        backgroundColor: isDark ? colors.surface : '#E2E8F0'
                                    }]}
                                    onPress={() => setIsReportModalVisible(false)}
                                >
                                    <ThemedText style={[styles.buttonText, { color: colors.text }]}>Cancel</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.reportModalButton, styles.submitButton, {
                                        backgroundColor: colors.primary
                                    }]}
                                    onPress={handleSubmitReport}
                                    disabled={isSubmitting}
                                >
                                    <ThemedText style={[styles.buttonText, { color: '#FFFFFF' }]}>
                                        {isSubmitting ? 'Submitting...' : 'Submit'}
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Pressable>
                </Modal>

                <Modal
                    visible={isImageModalVisible}
                    transparent={true}
                    onRequestClose={() => {
                        setIsImageModalVisible(false);
                        setSelectedImage(null);
                    }}
                >
                    <View style={styles.imageModalContainer}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => {
                                setIsImageModalVisible(false);
                                setSelectedImage(null);
                            }}
                        >
                            <Ionicons name="close" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                        {selectedImage && (
                            <ZoomableImageNew
                                imageUrl={selectedImage}
                                onClose={() => {
                                    setIsImageModalVisible(false);
                                    setSelectedImage(null);
                                }}
                            />
                        )}
                    </View>
                </Modal>

                {contextMenu && (
                    <Pressable
                        style={styles.contextMenuOverlay}
                        onPress={() => setContextMenu(null)}
                    >
                        <View
                            style={[
                                styles.contextMenuContainer,
                                {
                                    backgroundColor: isDark ? colors.card : '#FFFFFF',
                                    top: contextMenu.y,
                                    left: contextMenu.x,
                                }
                            ]}
                        >
                            {contextMenu.message.authorUID === user?.uid ? (
                                <>
                                    <TouchableOpacity
                                        style={styles.contextMenuItem}
                                        onPress={() => handleContextMenuOption('reply')}
                                    >
                                        <Ionicons name="return-up-back" size={18} color={colors.text} />
                                        <ThemedText style={styles.contextMenuText}>Reply</ThemedText>
                                    </TouchableOpacity>
                                    <View style={[styles.contextMenuDivider, { backgroundColor: isDark ? colors.border : '#E5E7EB' }]} />
                                    <TouchableOpacity
                                        style={styles.contextMenuItem}
                                        onPress={() => handleContextMenuOption('delete')}
                                    >
                                        <Ionicons name="trash-outline" size={18} color={colors.error} />
                                        <ThemedText style={[styles.contextMenuText, { color: colors.error }]}>Delete</ThemedText>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={styles.contextMenuItem}
                                        onPress={() => handleContextMenuOption('reply')}
                                    >
                                        <Ionicons name="return-up-back" size={18} color={colors.text} />
                                        <ThemedText style={styles.contextMenuText}>Reply</ThemedText>
                                    </TouchableOpacity>
                                    <View style={[styles.contextMenuDivider, { backgroundColor: isDark ? colors.border : '#E5E7EB' }]} />
                                    <TouchableOpacity
                                        style={styles.contextMenuItem}
                                        onPress={() => handleContextMenuOption('report')}
                                    >
                                        <Ionicons name="flag-outline" size={18} color={colors.error} />
                                        <ThemedText style={[styles.contextMenuText, { color: colors.error }]}>Report</ThemedText>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </Pressable>
                )}
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create<Styles & {
    contextMenuOverlay: ViewStyle;
    contextMenuContainer: ViewStyle;
    contextMenuItem: ViewStyle;
    contextMenuText: TextStyle;
    contextMenuDivider: ViewStyle;
    inputHint: TextStyle;
}>({
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
        position: 'relative',
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
        padding: 12,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        minHeight: 60,
        paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    },
    input: {
        flex: 1,
        marginRight: 8,
        padding: 8,
        paddingLeft: 12,
        borderRadius: 20,
        fontSize: 16,
        minHeight: 36,
        maxHeight: 100,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    loadMoreButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#E5E7EB',
    },
    loadMoreText: {
        fontSize: 14,
        color: '#4F46E5',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    reportModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    reportModalTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    reportInput: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        padding: 12,
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    reportModalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 8,
    },
    reportModalButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        minWidth: 80,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#E2E8F0',
    },
    submitButton: {
        backgroundColor: '#4F46E5',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    attachButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    selectedFileContainer: {
        position: 'absolute',
        top: -30,
        left: 56,
        right: 50,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 4,
        marginRight: 8,
    },
    selectedFileText: {
        fontSize: 12,
        color: '#6B7280',
        marginRight: 4,
        flex: 1,
    },
    removeFileButton: {
        padding: 2,
    },
    attachmentContainer: {
        marginBottom: 8,
        borderRadius: 8,
        overflow: 'hidden',
    },
    attachmentImage: {
        width: 200,
        height: 200,
        borderRadius: 8,
    },
    pdfContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 8,
    },
    pdfText: {
        marginLeft: 8,
        fontSize: 14,
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    imageModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        right: 20,
        zIndex: 1,
        padding: 8,
    },
    error: {
        color: '#EF4444',
    },
    attachmentImageContainer: {
        width: 200,
        height: 200,
        borderRadius: 8,
        overflow: 'hidden',
    },
    imageErrorContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    imageErrorText: {
        marginTop: 8,
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    replyContainer: {
        padding: 8,
        borderRadius: 8,
        marginBottom: 8,
    },
    replyUserName: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
        opacity: 0.8,
    },
    replyText: {
        fontSize: 12,
        opacity: 0.7,
    },
    replyingToContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    replyingToContent: {
        flex: 1,
        marginRight: 12,
    },
    replyingToLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    replyingToText: {
        fontSize: 14,
        opacity: 0.7,
    },
    contextMenuOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    contextMenuContainer: {
        position: 'absolute',
        width: 140,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        overflow: 'hidden',
        margin: 16,
    },
    contextMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    contextMenuText: {
        fontSize: 14,
        fontWeight: '500',
    },
    contextMenuDivider: {
        height: 1,
        width: '100%',
    },
    inputHint: {
        fontSize: 11,
        textAlign: 'center',
        paddingBottom: 4,
        backgroundColor: 'transparent',
    },
}); 