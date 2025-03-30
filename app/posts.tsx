import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getPosts, Post } from '@/services/posts';
import Toast from 'react-native-toast-message';

export default function PostsScreen() {
    const { subjectName } = useLocalSearchParams();
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const [posts, setPosts] = useState<Post[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!subjectName) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Subject name is required',
                position: 'bottom'
            });
            return;
        }
        loadPosts();
    }, [subjectName]);

    const loadPosts = async () => {
        try {
            setIsLoading(true);
            const fetchedPosts = await getPosts({
                tag: subjectName as string,
                orderBy: 'createdAt',
                orderDirection: 'desc'
            });
            setPosts(fetchedPosts);
        } catch (error) {
            console.error('Error loading posts:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load posts',
                position: 'bottom'
            });
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadPosts();
    };

    const renderPost = ({ item }: { item: Post }) => (
        <TouchableOpacity
            style={[
                styles.postCard,
                { backgroundColor: isDark ? colors.card : '#FFFFFF' }
            ]}
            onPress={() => {/* Handle post press */ }}
        >
            <View style={styles.postHeader}>
                <ThemedText style={styles.postTitle}>{item.title}</ThemedText>
                <ThemedText style={styles.postAuthor}>by {item.authorName}</ThemedText>
            </View>
            <ThemedText style={styles.postContent} numberOfLines={3}>
                {item.content}
            </ThemedText>
            <View style={styles.postFooter}>
                <View style={styles.postStats}>
                    <Ionicons name="heart-outline" size={16} color={colors.textSecondary} />
                    <ThemedText style={styles.postStatText}>{item.likes}</ThemedText>
                    <Ionicons name="chatbubble-outline" size={16} color={colors.textSecondary} style={styles.commentIcon} />
                    <ThemedText style={styles.postStatText}>{item.comments}</ThemedText>
                </View>
                <ThemedText style={styles.postDate}>
                    {item.createdAt.toLocaleDateString()}
                </ThemedText>
            </View>
        </TouchableOpacity>
    );

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#F3F4F6' }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <ThemedText style={styles.loadingText}>Loading posts...</ThemedText>
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
                <ThemedText style={styles.headerTitle}>{subjectName} Posts</ThemedText>
            </LinearGradient>

            <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.postsList}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFFFFF',
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
    postsList: {
        padding: 16,
    },
    postCard: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    postHeader: {
        marginBottom: 8,
    },
    postTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    postAuthor: {
        fontSize: 14,
        opacity: 0.7,
    },
    postContent: {
        fontSize: 16,
        marginBottom: 12,
        lineHeight: 24,
    },
    postFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    postStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    postStatText: {
        marginLeft: 4,
        marginRight: 12,
        fontSize: 14,
        opacity: 0.7,
    },
    commentIcon: {
        marginLeft: 8,
    },
    postDate: {
        fontSize: 14,
        opacity: 0.7,
    },
}); 