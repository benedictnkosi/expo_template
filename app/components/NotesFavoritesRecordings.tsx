import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL, HOST_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import Toast from 'react-native-toast-message';
import { useTheme } from '@/contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NoteList } from './NoteList';
import { FavoritesList } from './FavoritesList';
import { RecordingsList } from './RecordingsList';

interface Note {
    id: number;
    created_at: string;
    text: string;
    description?: string;
    subject_name: string;
}

interface FavoriteQuestion {
    id: string;
    createdAt: {
        date: string;
        timezone_type: number;
        timezone: string;
    };
    questionId: number;
    question: string;
    aiExplanation: string | null;
    subjectId: number;
    context: string;
    favoriteCount: number;
}

interface PopularQuestion {
    questionId: number;
    question: string;
    context: string;
    favoriteCount: number;
}

interface LectureRecording {
    recordingFileName: string;
    lecture_name: string;
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
    popularQuestions: FavoriteQuestion[];
    isFavoritesLoading: boolean;
    loadSpecificQuestion: (questionId: number) => Promise<void>;
    getFavoriteCardColor: (index: number) => string;
    defaultTab?: TabType;
}

export type TabType = 'notes' | 'favorites' | 'lectures';

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
            fontSize: 14,
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
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        emptyContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        lecturesContainer: {
            flex: 1,
            padding: 16,
        },
        lectureCard: {
            marginBottom: 16,
            borderRadius: 12,
            overflow: 'hidden',
        },
    });
}

export function NotesFavoritesRecordings({
    subjectName,
    currentQuestion,
    favoriteQuestions,
    popularQuestions,
    isFavoritesLoading,
    loadSpecificQuestion,
    getFavoriteCardColor,
    defaultTab = 'favorites'
}: NotesAndTodosProps) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = createStyles(isDark);
    const [notes, setNotes] = useState<Note[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
    const [lectureRecordings, setLectureRecordings] = useState<LectureRecording[]>([]);
    const [isLecturesLoading, setIsLecturesLoading] = useState(false);

    useEffect(() => {
        if (activeTab === 'lectures') {
            fetchLectureRecordings();
        }
    }, [activeTab, subjectName]);

    const fetchLectureRecordings = async () => {
        try {
            setIsLecturesLoading(true);
            const response = await fetch(`${HOST_URL}/api/topics/recordings/${encodeURIComponent(subjectName)}`);
            const data = await response.json();

            if (data.status === 'success') {
                setLectureRecordings(data.data);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Error',
                    text2: 'Failed to load lecture recordings',
                });
            }
        } catch (error) {
            console.error('Error fetching lecture recordings:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load lecture recordings',
            });
        } finally {
            setIsLecturesLoading(false);
        }
    };

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
                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        activeTab === 'lectures' && styles.activeTab,
                        { backgroundColor: activeTab === 'lectures' ? colors.primary : 'rgba(255, 255, 255, 0.1)' }
                    ]}
                    onPress={() => setActiveTab('lectures')}
                >
                    <ThemedText style={[
                        styles.tabText,
                        activeTab === 'lectures' && styles.activeTabText
                    ]}>
                        🎧 Lectures
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
                ) : activeTab === 'favorites' ? (
                    <FavoritesList
                        favoriteQuestions={favoriteQuestions}
                        popularQuestions={popularQuestions}
                        isFavoritesLoading={isFavoritesLoading}
                        loadSpecificQuestion={loadSpecificQuestionHandler}
                        getFavoriteCardColor={getFavoriteCardColor}
                    />
                ) : (
                    <RecordingsList
                        recordings={lectureRecordings}
                        isLoading={isLecturesLoading}
                    />
                )}
            </ScrollView>
        </SafeAreaView>
    );
} 