import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import { API_BASE_URL, HOST_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import Toast from 'react-native-toast-message';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TodoList } from './TodoList';
import { NoteList } from './NoteList';
import { FavoritesList } from './FavoritesList';

interface Note {
    id: number;
    created_at: string;
    text: string;
    description?: string;
    subject_name: string;
}

interface Todo {
    id: number;
    title: string;
    status: 'pending' | 'completed';
    subject_name: string;
    created_at: string;
    due_date?: string;
}

interface FavoriteQuestion {
    id: string;
    questionId: number;
    question: string;
    context: string;
}

interface NotesAndTodosProps {
    subjectName: string;
    currentQuestion?: {
        id: number;
        subject: {
            id: number;
        };
    } | null;
    favoriteQuestions: FavoriteQuestion[];
    isFavoritesLoading: boolean;
    loadSpecificQuestion: (questionId: number) => Promise<void>;
    getFavoriteCardColor: (index: number) => string;
    defaultTab?: TabType;
}

export type TabType = 'todo' | 'notes' | 'favorites';

function createStyles(isDark: boolean) {
    return StyleSheet.create({
        container: {
            flex: 1,
            paddingHorizontal: 8,
        },
        header: {
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(128, 128, 128, 0.2)',
        },
        headerContent: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        headerTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            marginLeft: 8,
        },
        tabContainer: {
            flexDirection: 'row',
            paddingHorizontal: 6,
            paddingVertical: 12,
            gap: 8,
        },
        tabButton: {
            flex: 1,
            paddingVertical: 12,
            paddingHorizontal: 6,
            borderRadius: 8,
            alignItems: 'center',
        },
        activeTab: {
            backgroundColor: '#6B46C1',
        },
        tabText: {
            fontSize: 12,
            fontWeight: '500',
        },
        activeTabText: {
            color: '#fff',
        },
        content: {
            flex: 1,
            paddingVertical: 16,
            paddingHorizontal: 0,
        },
    });
}

export function NotesAndTodosAndFavorites({ 
    subjectName, 
    currentQuestion, 
    favoriteQuestions, 
    isFavoritesLoading, 
    loadSpecificQuestion, 
    getFavoriteCardColor,
    defaultTab = 'favorites'
}: NotesAndTodosProps) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = createStyles(isDark);
    const [notes, setNotes] = useState<Note[]>([]);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

    useEffect(() => {
        // No need to fetch todos here anymore as it's handled in TodoList
    }, [subjectName, currentQuestion]);

    const loadSpecificQuestionHandler = async (questionId: number) => {
        try {
            await loadSpecificQuestion(questionId);
        } catch (error) {
            console.error('Error loading specific question:', error);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Ionicons name="star" size={24} color="#FFD700" />
                    <ThemedText style={styles.headerTitle}>My Collection</ThemedText>
                </View>
            </View>

            <View style={styles.tabContainer}>
            <TouchableOpacity
                    style={[
                        styles.tabButton,
                        activeTab === 'favorites' && styles.activeTab,
                        { backgroundColor: activeTab === 'favorites' ? colors.primary : 'rgba(255, 255, 255, 0.1)' }
                    ]}
                    onPress={() => setActiveTab('favorites')}
                >
                    <ThemedText style={[
                        styles.tabText,
                        activeTab === 'favorites' && styles.activeTabText
                    ]}>
                        ⭐️ Favorites
                    </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        activeTab === 'todo' && styles.activeTab,
                        { backgroundColor: activeTab === 'todo' ? colors.primary : 'rgba(255, 255, 255, 0.1)' }
                    ]}
                    onPress={() => setActiveTab('todo')}
                >
                    <ThemedText style={[
                        styles.tabText,
                        activeTab === 'todo' && styles.activeTabText
                    ]}>
                        ✅ To Do
                    </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        activeTab === 'notes' && styles.activeTab,
                        { backgroundColor: activeTab === 'notes' ? colors.primary : 'rgba(255, 255, 255, 0.1)' }
                    ]}
                    onPress={() => setActiveTab('notes')}
                >
                    <ThemedText style={[
                        styles.tabText,
                        activeTab === 'notes' && styles.activeTabText
                    ]}>
                        📝 Notes
                    </ThemedText>
                </TouchableOpacity>
                
            </View>

            <ScrollView style={styles.content}>
                {activeTab === 'notes' ? (
                    <NoteList
                        notes={notes}
                        subjectName={subjectName}
                        userUid={user?.uid || ''}
                        isDark={isDark}
                        colors={colors}
                        currentQuestionId={currentQuestion?.id}
                        onNotesChange={setNotes}
                    />
                ) : activeTab === 'todo' ? (
                    <TodoList
                        todos={todos}
                        subjectName={subjectName}
                        userUid={user?.uid || ''}
                        isDark={isDark}
                        colors={colors}
                        onTodosChange={setTodos}
                    />
                ) : (
                    <FavoritesList
                        favoriteQuestions={favoriteQuestions}
                        isFavoritesLoading={isFavoritesLoading}
                        loadSpecificQuestion={loadSpecificQuestionHandler}
                        getFavoriteCardColor={getFavoriteCardColor}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
} 