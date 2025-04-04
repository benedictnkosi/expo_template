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

interface NotesAndTodosProps {
    subjectName: string;
    currentQuestion?: {
        id: number;
        subject: {
            id: number;
        };
    } | null;
}

type TabType = 'todo' | 'notes';

function createStyles(isDark: boolean) {
    return StyleSheet.create({
        container: {
            flex: 1,
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
        loadingIndicator: {
            marginLeft: 8,
        },
        tabContainer: {
            flexDirection: 'row',
            padding: 8,
            gap: 8,
        },
        tabButton: {
            flex: 1,
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
        },
        activeTab: {
            backgroundColor: '#6B46C1',
        },
        tabText: {
            fontSize: 16,
            fontWeight: '500',
        },
        activeTabText: {
            color: '#fff',
        },
        content: {
            flex: 1,
            padding: 16,
        },
        section: {
            flex: 1,
        },
        addButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 12,
            backgroundColor: 'rgba(128, 128, 128, 0.1)',
            borderRadius: 8,
            marginBottom: 16,
        },
        addButtonText: {
            marginLeft: 8,
            fontSize: 16,
        },
        notesList: {
            gap: 12,
        },
        noteCard: {
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        noteContent: {
            flexDirection: 'row',
            alignItems: 'flex-start',
        },
        noteIcon: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(128, 128, 128, 0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
        },
        noteTextContainer: {
            flex: 1,
        },
        noteText: {
            fontSize: 16,
            marginBottom: 8,
            color: isDark ? '#E5E7EB' : '#1F2937',
        },
        noteDate: {
            fontSize: 12,
            color: isDark ? '#9CA3AF' : '#6B7280',
        },
        noteActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginLeft: 'auto',
        },
        noteActionButton: {
            padding: 8,
            borderRadius: 8,
            backgroundColor: 'rgba(128, 128, 128, 0.2)',
        },
        todosList: {
            gap: 12,
        },
        todoCard: {
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 4,
            elevation: 3,
        },
        todoCheckbox: {
            marginRight: 12,
        },
        checkbox: {
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: isDark ? '#9CA3AF' : '#6B7280',
            alignItems: 'center',
            justifyContent: 'center',
        },
        checkedCheckbox: {
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
        },
        todoContent: {
            flex: 1,
        },
        todoText: {
            fontSize: 16,
            marginBottom: 4,
            color: isDark ? '#E5E7EB' : '#1F2937',
        },
        completedTodo: {
            textDecorationLine: 'line-through',
            opacity: 0.6,
        },
        dueDate: {
            fontSize: 12,
            color: isDark ? '#9CA3AF' : '#6B7280',
        },
        overdueDate: {
            color: isDark ? '#EF4444' : '#DC2626',
            fontWeight: '500',
        },
        dueSoonDate: {
            color: isDark ? '#F59E0B' : '#D97706',
            fontWeight: '500',
        },
        todoActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        todoActionButton: {
            padding: 8,
            borderRadius: 8,
            backgroundColor: 'rgba(128, 128, 128, 0.2)',
        },
        emptyState: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
        },
        emptyStateText: {
            marginTop: 16,
            fontSize: 16,
            textAlign: 'center',
            color: isDark ? '#9CA3AF' : '#6B7280',
        },
        modalContent: {
            padding: 20,
            borderRadius: 12,
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 16,
            color: isDark ? '#E5E7EB' : '#1F2937',
        },
        modalInput: {
            borderWidth: 1,
            borderColor: 'rgba(128, 128, 128, 0.2)',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            fontSize: 16,
            minHeight: 100,
        },
        dateInputContainer: {
            marginBottom: 16,
        },
        dateLabel: {
            fontSize: 14,
            marginBottom: 8,
            opacity: 0.7,
            color: isDark ? '#E5E7EB' : '#1F2937',
        },
        dateInput: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            marginTop: 8,
        },
        dateText: {
            fontSize: 16,
            color: isDark ? '#E5E7EB' : '#1F2937',
        },
        modalButtons: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 8,
        },
        modalButton: {
            padding: 12,
            borderRadius: 8,
            minWidth: 100,
            alignItems: 'center',
        },
        cancelButton: {
            backgroundColor: 'rgba(128, 128, 128, 0.2)',
        },
        saveButton: {
            backgroundColor: '#6B46C1',
        },
        modalButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: '#fff',
        },
        disabledButton: {
            opacity: 0.5,
        },
    });
}

export function NotesAndTodos({ subjectName, currentQuestion }: NotesAndTodosProps) {
    const { user } = useAuth();
    const { colors, isDark } = useTheme();
    const styles = createStyles(isDark);
    const [notes, setNotes] = useState<Note[]>([]);
    const [todos, setTodos] = useState<Todo[]>([]);
    const [isNotesLoading, setIsNotesLoading] = useState(false);
    const [isTodosLoading, setIsTodosLoading] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [newTodo, setNewTodo] = useState('');
    const [showAddNoteModal, setShowAddNoteModal] = useState(false);
    const [showAddTodoModal, setShowAddTodoModal] = useState(false);
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
    const [showEditTodoModal, setShowEditTodoModal] = useState(false);
    const [editTodoTitle, setEditTodoTitle] = useState('');
    const [editTodoDueDate, setEditTodoDueDate] = useState<Date | null>(null);
    const [showEditDatePicker, setShowEditDatePicker] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('todo');
    const [todoDueDate, setTodoDueDate] = useState<string>('');
    const [isCreatingNote, setIsCreatingNote] = useState(false);
    const [isCreatingTodo, setIsCreatingTodo] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [editNoteText, setEditNoteText] = useState('');
    const [showEditNoteModal, setShowEditNoteModal] = useState(false);

    const cardColors = [
        isDark ? '#4B5563' : '#FFE082', // yellow/gray
        isDark ? '#4F4F4F' : '#F8BBD0', // pink/dark gray
        isDark ? '#374151' : '#BBDEFB', // blue/slate
        isDark ? '#3B4252' : '#C8E6C9', // green/dark slate
        isDark ? '#44475A' : '#E1BEE7', // purple/dracula
        isDark ? '#2D3748' : '#FFCCBC'  // orange/dark blue gray
    ];

    const fetchNotes = async () => {
        if (!user?.uid) return;
        setIsNotesLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/notes?uid=${user.uid}&subject_name=${subjectName}`);
            const data = await response.json();
            if (data.status === "OK") {
                setNotes(data.notes);
            }
        } catch (error) {
            console.error('Error fetching notes:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load notes',
            });
        } finally {
            setIsNotesLoading(false);
        }
    };

    const fetchTodos = async () => {
        if (!user?.uid) return;
        setIsTodosLoading(true);
        try {
            const response = await fetch(`${HOST_URL}/api/todos?learnerUid=${user.uid}&subjectName=${subjectName}`);
            const data = await response.json();
            // The API returns an array of todos directly
            setTodos(data);
        } catch (error) {
            console.error('Error fetching todos:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load todos',
            });
        } finally {
            setIsTodosLoading(false);
        }
    };

    const createNote = async () => {
        if (!user?.uid || !newNote.trim()) return;
        try {
            const response = await fetch(`${API_BASE_URL}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uid: user.uid,
                    text: newNote,
                    subject_name: subjectName,
                    question_id: currentQuestion?.id,
                }),
            });
            const data = await response.json();
            if (data.status === "OK") {
                setNewNote('');
                setShowAddNoteModal(false);
                await fetchNotes();
                Toast.show({
                    type: 'success',
                    text1: 'Note Added',
                    text2: 'Your note has been saved successfully',
                });
            }
        } catch (error) {
            console.error('Error creating note:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to create note',
            });
        }
    };

    const createTodo = async () => {
        if (!user?.uid || !newTodo.trim()) return;
        try {
            const response = await fetch(`${HOST_URL}/api/todos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    learnerUid: user.uid,
                    title: newTodo,
                    subjectName: subjectName,
                    dueDate: selectedDate?.toISOString().split('T')[0],
                }),
            });
            const data = await response.json();
            if (data.success === true) {
                setNewTodo('');
                setShowAddTodoModal(false);
                setSelectedDate(null);
                setTodoDueDate('');
                await fetchTodos();
                Toast.show({
                    type: 'success',
                    text1: 'Todo Added',
                    text2: 'Your todo has been saved successfully',
                });
            }
        } catch (error) {
            console.error('Error creating todo:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to create todo',
            });
        }
    };

    const updateTodo = async (todoId: number, updates: {
        title?: string;
        dueDate?: string;
        status?: 'pending' | 'completed';
    }) => {
        if (!user?.uid) return;

        try {
            const response = await fetch(`${HOST_URL}/api/todos/${todoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    learnerUid: user.uid,
                    ...updates
                })
            });

            const updatedTodo = await response.json();
            
            // Update the local state with the returned todo object
            setTodos(prevTodos => prevTodos.map(todo => 
                todo.id === todoId ? {
                    ...todo,
                    title: updatedTodo.title,
                    status: updatedTodo.status,
                    due_date: updatedTodo.due_date,
                    created_at: updatedTodo.created_at
                } : todo
            ));

            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Todo updated successfully',
            });
        } catch (error) {
            console.error('Error updating todo:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to update todo',
            });
        }
    };

    const toggleTodoStatus = async (todoId: number) => {
        const todo = todos.find(t => t.id === todoId);
        if (!todo) return;

        await updateTodo(todoId, {
            status: todo.status === 'completed' ? 'pending' : 'completed'
        });
    };

    const deleteTodo = async (todoId: number) => {
        if (!user?.uid) return;

        try {
            const response = await fetch(`${HOST_URL}/api/todos/${todoId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    learnerUid: user.uid
                })
            });

            if (response.ok) {
                setTodos(prevTodos => prevTodos.filter(todo => todo.id !== todoId));
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Todo deleted successfully',
                });
            } else {
                throw new Error('Failed to delete todo');
            }
        } catch (error) {
            console.error('Error deleting todo:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete todo',
            });
        }
    };

    const deleteNote = async (noteId: number) => {
        if (!user?.uid) return;

        try {
            const response = await fetch(`${API_BASE_URL}/notes/${noteId}?uid=${user.uid}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    learnerUid: user.uid
                })
            });

            if (response.ok) {
                setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Note deleted successfully',
                });
            } else {
                throw new Error('Failed to delete note');
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete note',
            });
        }
    };

    const handleDateChange = (event: any, date?: Date) => {
        setShowDatePicker(false);
        if (date) {
            setSelectedDate(date);
            setTodoDueDate(date.toISOString().split('T')[0]);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const handleEditDateChange = (event: any, date?: Date) => {
        setShowEditDatePicker(false);
        if (date) {
            setEditTodoDueDate(date);
        }
    };

    const openEditModal = (todo: Todo) => {
        setEditingTodo(todo);
        setEditTodoTitle(todo.title);
        setEditTodoDueDate(todo.due_date ? new Date(todo.due_date) : null);
        setShowEditTodoModal(true);
    };

    const handleEditTodo = async () => {
        if (!editingTodo) return;

        await updateTodo(editingTodo.id, {
            title: editTodoTitle,
            dueDate: editTodoDueDate?.toISOString().split('T')[0]
        });

        setShowEditTodoModal(false);
        setEditingTodo(null);
        setEditTodoTitle('');
        setEditTodoDueDate(null);
    };

    const updateNote = async (noteId: number, newText: string) => {
        if (!user?.uid) return;

        try {
            const response = await fetch(`${API_BASE_URL}/notes/${noteId}/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uid: user.uid,
                    text: newText,
                    subject_name: subjectName
                })
            });

            const data = await response.json();
            
            if (data.status === "OK") {
                setNotes(prevNotes => prevNotes.map(note => 
                    note.id === noteId ? { ...note, text: newText } : note
                ));
                setEditingNote(null);
                setEditNoteText('');
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Note updated successfully',
                });
            } else {
                throw new Error('Failed to update note');
            }
        } catch (error) {
            console.error('Error updating note:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to update note',
            });
        }
    };

    const sortTodos = (todos: Todo[]) => {
        return [...todos].sort((a, b) => {
            // First, sort by completion status (completed items go to bottom)
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (a.status !== 'completed' && b.status === 'completed') return -1;
            
            // If both are completed or both are pending, sort by due date
            const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
            const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
            
            return dateA - dateB;
        });
    };

    useEffect(() => {
        fetchNotes();
        fetchTodos();
    }, [subjectName, currentQuestion]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#1a1a1a' : '#fff' }]}>
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Ionicons name="star" size={24} color="#FFD700" />
                    <ThemedText style={styles.headerTitle}>My Collection</ThemedText>
                    {(isNotesLoading || isTodosLoading) && (
                        <ActivityIndicator size="small" color="#FFD700" style={styles.loadingIndicator} />
                    )}
                </View>
            </View>

            {/* Tab Buttons */}
            <View style={styles.tabContainer}>
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
                        To Do
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
                        Notes
                    </ThemedText>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {activeTab === 'notes' ? (
                    <View style={styles.section}>
                        {/* Add Note Button */}
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setShowAddNoteModal(true)}
                        >
                            <Ionicons name="add" size={24} color={colors.text} />
                            <ThemedText style={styles.addButtonText}>Add New Note</ThemedText>
                        </TouchableOpacity>

                        {/* Notes List */}
                        {notes.length > 0 ? (
                            <View style={styles.notesList}>
                                {notes.map((note, index) => {
                                    const colors = [
                                        isDark ? '#4B5563' : '#FFE082', // yellow/gray
                                        isDark ? '#4F4F4F' : '#F8BBD0', // pink/dark gray
                                        isDark ? '#374151' : '#BBDEFB', // blue/slate
                                        isDark ? '#3B4252' : '#C8E6C9', // green/dark slate
                                        isDark ? '#44475A' : '#E1BEE7', // purple/dracula
                                        isDark ? '#2D3748' : '#FFCCBC'  // orange/dark blue gray
                                    ];
                                    const color = colors[index % colors.length];

                                    return (
                                        <View
                                            key={note.id}
                                            style={[styles.noteCard, { backgroundColor: color }]}
                                        >
                                            <View style={styles.noteContent}>
                                                <View style={styles.noteIcon}>
                                                    <Ionicons name="document-text" size={20} color={isDark ? '#E5E7EB' : '#666'} />
                                                </View>
                                                <View style={styles.noteTextContainer}>
                                                    <ThemedText style={styles.noteText}>
                                                        {note.text}
                                                    </ThemedText>
                                                    <ThemedText style={styles.noteDate}>
                                                        {new Date(note.created_at).toLocaleDateString()}
                                                    </ThemedText>
                                                </View>
                                                <View style={styles.noteActions}>
                                                    <TouchableOpacity
                                                        style={styles.noteActionButton}
                                                        onPress={() => {
                                                            setEditingNote(note);
                                                            setEditNoteText(note.text);
                                                            setShowEditNoteModal(true);
                                                        }}
                                                    >
                                                        <Ionicons name="create-outline" size={20} color={isDark ? '#E5E7EB' : '#666'} />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={styles.noteActionButton}
                                                        onPress={() => deleteNote(note.id)}
                                                    >
                                                        <Ionicons name="trash-outline" size={20} color={isDark ? '#E5E7EB' : '#666'} />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="document-text" size={48} color={colors.textSecondary} />
                                <ThemedText style={styles.emptyStateText}>
                                    No notes yet. Add your first note!
                                </ThemedText>
                            </View>
                        )}
                    </View>
                ) : (
                    <View style={styles.section}>
                        {/* Add Todo Button */}
                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => setShowAddTodoModal(true)}
                        >
                            <Ionicons name="add" size={24} color={colors.text} />
                            <ThemedText style={styles.addButtonText}>Add New Task</ThemedText>
                        </TouchableOpacity>

                        {/* Todos List */}
                        {todos.length > 0 ? (
                            <View style={styles.todosList}>
                                {sortTodos(todos).map((todo, index) => {
                                    const colors = [
                                        isDark ? '#4B5563' : '#FFE082', // yellow/gray
                                        isDark ? '#4F4F4F' : '#F8BBD0', // pink/dark gray
                                        isDark ? '#374151' : '#BBDEFB', // blue/slate
                                        isDark ? '#3B4252' : '#C8E6C9', // green/dark slate
                                        isDark ? '#44475A' : '#E1BEE7', // purple/dracula
                                        isDark ? '#2D3748' : '#FFCCBC'  // orange/dark blue gray
                                    ];
                                    const color = colors[index % colors.length];
                                    const dueDate = todo.due_date ? new Date(todo.due_date) : null;
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const isOverdue = dueDate && dueDate < today;
                                    const isDueSoon = dueDate && !isOverdue && 
                                        (dueDate.getTime() - today.getTime()) <= 7 * 24 * 60 * 60 * 1000;

                                    return (
                                        <View
                                            key={todo.id}
                                            style={[
                                                styles.todoCard,
                                                { backgroundColor: color }
                                            ]}
                                        >
                                            <TouchableOpacity
                                                style={styles.todoCheckbox}
                                                onPress={() => toggleTodoStatus(todo.id)}
                                            >
                                                <View style={[
                                                    styles.checkbox,
                                                    todo.status === 'completed' && styles.checkedCheckbox
                                                ]}>
                                                    {todo.status === 'completed' && (
                                                        <Ionicons name="checkmark" size={16} color="#4CAF50" />
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                            <View style={styles.todoContent}>
                                                <ThemedText style={[
                                                    styles.todoText,
                                                    todo.status === 'completed' && styles.completedTodo
                                                ]}>
                                                    {todo.title}
                                                </ThemedText>
                                                {todo.due_date && (
                                                    <ThemedText style={[
                                                        styles.dueDate,
                                                        isOverdue && styles.overdueDate,
                                                        isDueSoon && styles.dueSoonDate
                                                    ]}>
                                                        Due: {new Date(todo.due_date).toLocaleDateString()}
                                                    </ThemedText>
                                                )}
                                            </View>
                                            <View style={styles.todoActions}>
                                                <TouchableOpacity
                                                    style={styles.todoActionButton}
                                                    onPress={() => openEditModal(todo)}
                                                >
                                                    <Ionicons name="create-outline" size={20} color={isDark ? '#E5E7EB' : '#666'} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.todoActionButton}
                                                    onPress={() => deleteTodo(todo.id)}
                                                >
                                                    <Ionicons name="trash-outline" size={20} color={isDark ? '#E5E7EB' : '#666'} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="checkbox-outline" size={48} color={colors.textSecondary} />
                                <ThemedText style={styles.emptyStateText}>
                                    No tasks yet. Add your first task!
                                </ThemedText>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Add Note Modal */}
            <Modal isVisible={showAddNoteModal} onBackdropPress={() => setShowAddNoteModal(false)}>
                <View style={[styles.modalContent, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}>
                    <ThemedText style={styles.modalTitle}>Add New Note</ThemedText>
                    <TextInput
                        style={[styles.modalInput, { color: isDark ? '#fff' : '#000' }]}
                        value={newNote}
                        onChangeText={setNewNote}
                        placeholder="Write your note here..."
                        placeholderTextColor={isDark ? '#666' : '#999'}
                        multiline
                    />
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => setShowAddNoteModal(false)}
                        >
                            <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.saveButton]}
                            onPress={createNote}
                            disabled={isCreatingNote || !newNote.trim()}
                        >
                            {isCreatingNote ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <ThemedText style={styles.modalButtonText}>Add Note</ThemedText>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Add Todo Modal */}
            <Modal isVisible={showAddTodoModal} onBackdropPress={() => setShowAddTodoModal(false)}>
                <View style={[styles.modalContent, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}>
                    <ThemedText style={styles.modalTitle}>Add New Task</ThemedText>
                    <TextInput
                        style={[styles.modalInput, { color: isDark ? '#fff' : '#000' }]}
                        value={newTodo}
                        onChangeText={setNewTodo}
                        placeholder="Write your task here..."
                        placeholderTextColor={isDark ? '#666' : '#999'}
                        multiline
                    />
                    <View style={styles.dateInputContainer}>
                        <ThemedText style={styles.dateLabel}>Due Date *</ThemedText>
                        <TouchableOpacity
                            style={[styles.dateInput, { 
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                            }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <ThemedText style={[
                                styles.dateText,
                                { color: selectedDate ? (isDark ? '#fff' : '#000') : (isDark ? '#666' : '#999') }
                            ]}>
                                {selectedDate ? formatDate(selectedDate) : 'Select due date'}
                            </ThemedText>
                            <Ionicons 
                                name="calendar-outline" 
                                size={20} 
                                color={isDark ? '#E5E7EB' : '#999'} 
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => {
                                setShowAddTodoModal(false);
                                setSelectedDate(null);
                                setTodoDueDate('');
                            }}
                        >
                            <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.modalButton, 
                                styles.saveButton,
                                (!newTodo.trim() || !selectedDate) && styles.disabledButton
                            ]}
                            onPress={createTodo}
                            disabled={!newTodo.trim() || !selectedDate}
                        >
                            {isCreatingTodo ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <ThemedText style={styles.modalButtonText}>Add Task</ThemedText>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Edit Todo Modal */}
            <Modal isVisible={showEditTodoModal} onBackdropPress={() => setShowEditTodoModal(false)}>
                <View style={[styles.modalContent, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}>
                    <ThemedText style={styles.modalTitle}>Edit Task</ThemedText>
                    <TextInput
                        style={[styles.modalInput, { color: isDark ? '#fff' : '#000' }]}
                        value={editTodoTitle}
                        onChangeText={setEditTodoTitle}
                        placeholder="Edit your task..."
                        placeholderTextColor={isDark ? '#666' : '#999'}
                        multiline
                    />
                    <View style={styles.dateInputContainer}>
                        <ThemedText style={styles.dateLabel}>Due Date</ThemedText>
                        <TouchableOpacity
                            style={[styles.dateInput, { 
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                            }]}
                            onPress={() => setShowEditDatePicker(true)}
                        >
                            <ThemedText style={[
                                styles.dateText,
                                { color: editTodoDueDate ? (isDark ? '#fff' : '#000') : (isDark ? '#666' : '#999') }
                            ]}>
                                {editTodoDueDate ? formatDate(editTodoDueDate) : 'Select due date'}
                            </ThemedText>
                            <Ionicons 
                                name="calendar-outline" 
                                size={20} 
                                color={isDark ? '#E5E7EB' : '#999'} 
                            />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => {
                                setShowEditTodoModal(false);
                                setEditingTodo(null);
                                setEditTodoTitle('');
                                setEditTodoDueDate(null);
                            }}
                        >
                            <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.saveButton]}
                            onPress={handleEditTodo}
                            disabled={!editTodoTitle.trim()}
                        >
                            <ThemedText style={styles.modalButtonText}>Save Changes</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Edit Note Modal */}
            <Modal isVisible={showEditNoteModal} onBackdropPress={() => setShowEditNoteModal(false)}>
                <View style={[styles.modalContent, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}>
                    <ThemedText style={styles.modalTitle}>Edit Note</ThemedText>
                    <TextInput
                        style={[styles.modalInput, { color: isDark ? '#fff' : '#000' }]}
                        value={editNoteText}
                        onChangeText={setEditNoteText}
                        placeholder="Edit your note..."
                        placeholderTextColor={isDark ? '#666' : '#999'}
                        multiline
                    />
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => {
                                setShowEditNoteModal(false);
                                setEditingNote(null);
                                setEditNoteText('');
                            }}
                        >
                            <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.saveButton]}
                            onPress={() => {
                                if (editingNote) {
                                    updateNote(editingNote.id, editNoteText);
                                    setShowEditNoteModal(false);
                                }
                            }}
                            disabled={!editNoteText.trim()}
                        >
                            <ThemedText style={styles.modalButtonText}>Save Changes</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {showDatePicker && (
                <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    themeVariant={isDark ? 'dark' : 'light'}
                />
            )}

            {showEditDatePicker && (
                <DateTimePicker
                    value={editTodoDueDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleEditDateChange}
                    minimumDate={new Date()}
                    themeVariant={isDark ? 'dark' : 'light'}
                />
            )}
        </SafeAreaView>
    );
} 