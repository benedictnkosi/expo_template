import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, TextInput, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import Modal from 'react-native-modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { HOST_URL } from '@/config/api';
import { analytics } from '@/services/analytics';

interface Todo {
    id: number;
    title: string;
    status: 'pending' | 'completed';
    subject_name: string;
    created_at: string;
    due_date?: string;
}

interface TodoListProps {
    todos: Todo[];
    subjectName: string;
    userUid: string;
    isDark: boolean;
    colors: any;
    onTodosChange: (todos: Todo[]) => void;
}

function createStyles(isDark: boolean) {
    return StyleSheet.create({
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
            fontSize: 14,
            marginBottom: 4,
            color: isDark ? '#E5E7EB' : '#1F2937',
        },
        completedTodo: {
            textDecorationLine: 'line-through',
            opacity: 0.6,
        },
        dueDate: {
            fontSize: 14,
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
            padding: 4,
            borderRadius: 6,
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
            fontSize: 14,
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
        iosDatePickerButtons: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            padding: 12,
        },
        iosDateButton: {
            padding: 12,
            borderRadius: 8,
            alignItems: 'center',
        },
        iosDateButtonCancel: {
            backgroundColor: 'rgba(128, 128, 128, 0.2)',
        },
        iosDateButtonConfirm: {
            backgroundColor: '#6B46C1',
        },
        iosDateButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: '#fff',
        },
        datePickerModal: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        },
        datePickerHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: 'rgba(128, 128, 128, 0.3)',
        },
        datePickerHeaderButton: {
            padding: 8,
        },
        datePickerHeaderButtonText: {
            fontSize: 16,
            fontWeight: '500',
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            margin: 0,
        },
        deleteModalContent: {
            backgroundColor: isDark ? '#2a2a2a' : '#fff',
            borderRadius: 12,
            padding: 20,
            width: '100%',
            margin: 0,
        },
    });
}

export function TodoList({ 
    todos, 
    subjectName, 
    userUid, 
    isDark, 
    colors, 
    onTodosChange 
}: TodoListProps) {
    const styles = createStyles(isDark);
    const [newTodo, setNewTodo] = useState('');
    const [showAddTodoModal, setShowAddTodoModal] = useState(false);
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
    const [showEditTodoModal, setShowEditTodoModal] = useState(false);
    const [editTodoTitle, setEditTodoTitle] = useState('');
    const [editTodoDueDate, setEditTodoDueDate] = useState<Date | null>(null);
    const [showEditDatePicker, setShowEditDatePicker] = useState(false);
    const [isCreatingTodo, setIsCreatingTodo] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [todoToDelete, setTodoToDelete] = useState<number | null>(null);

    const cardColors = [
        isDark ? '#4B5563' : '#FFE082', // yellow/gray
        isDark ? '#4F4F4F' : '#F8BBD0', // pink/dark gray
        isDark ? '#374151' : '#BBDEFB', // blue/slate
        isDark ? '#3B4252' : '#C8E6C9', // green/dark slate
        isDark ? '#44475A' : '#E1BEE7', // purple/dracula
        isDark ? '#2D3748' : '#FFCCBC'  // orange/dark blue gray
    ];

    const fetchTodos = async () => {
        if (!userUid) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${HOST_URL}/api/todos?learnerUid=${userUid}&subjectName=${subjectName}`);
            const data = await response.json();
            onTodosChange(data);
        } catch (error) {
            console.error('Error fetching todos:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load todos',
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTodos();
    }, [subjectName]);

    const createTodo = async () => {
        if (!userUid || !newTodo.trim()) return;
        setIsCreatingTodo(true);
        try {
            // Set time to 23:59 for the due date
            const dueDate = selectedDate ? new Date(selectedDate) : null;
            if (dueDate) {
                dueDate.setHours(23, 59, 0, 0);
            }

            const response = await fetch(`${HOST_URL}/api/todos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    learnerUid: userUid,
                    title: newTodo,
                    subjectName: subjectName,
                    dueDate: dueDate?.toISOString(),
                }),
            });
            const data = await response.json();
            if (data.success === true) {
                const updatedTodos = [...todos, data.todo];
                onTodosChange(updatedTodos);
                setNewTodo('');
                setShowAddTodoModal(false);
                setSelectedDate(null);

                // Log analytics event for todo creation
                await analytics.track('create_todo', {
                    user_id: userUid,
                    subject_name: subjectName,
                    has_due_date: Boolean(dueDate),
                    todo_id: data.todo.id
                });

                Toast.show({
                    type: 'success',
                    text1: 'Todo Added',
                    text2: 'Your todo has been saved successfully',
                });
            }
        } catch (error: any) {
            console.error('Error creating todo:', error);
            // Log analytics event for failed todo creation
            await analytics.track('create_todo_failed', {
                user_id: userUid,
                subject_name: subjectName,
                error: error?.message || 'Unknown error'
            });
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to create todo',
            });
        } finally {
            setIsCreatingTodo(false);
        }
    };

    const updateTodo = async (todoId: number, updates: {
        title?: string;
        dueDate?: string;
        status?: 'pending' | 'completed';
    }) => {
        if (!userUid) return;

        try {
            // Set time to 23:59 for the due date if it exists
            const updatedDueDate = updates.dueDate ? (() => {
                const date = new Date(updates.dueDate);
                date.setHours(23, 59, 0, 0);
                return date.toISOString();
            })() : undefined;

            const response = await fetch(`${HOST_URL}/api/todos/${todoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    learnerUid: userUid,
                    ...updates,
                    dueDate: updatedDueDate
                })
            });

            const updatedTodo = await response.json();
            
            const updatedTodos = todos.map(todo => 
                todo.id === todoId ? {
                    ...todo,
                    title: updatedTodo.title,
                    status: updatedTodo.status,
                    due_date: updatedTodo.due_date,
                    created_at: updatedTodo.created_at
                } : todo
            );
            
            onTodosChange(updatedTodos);

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
        if (!userUid) return;

        try {
            const response = await fetch(`${HOST_URL}/api/todos/${todoId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    learnerUid: userUid
                })
            });

            if (response.ok) {
                const updatedTodos = todos.filter(todo => todo.id !== todoId);
                onTodosChange(updatedTodos);
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

    const handleDeleteTodo = (todoId: number) => {
        setTodoToDelete(todoId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDeleteTodo = async () => {
        if (todoToDelete) {
            await deleteTodo(todoToDelete);
            setShowDeleteConfirmModal(false);
            setTodoToDelete(null);
        }
    };

    const handleDateChange = (event: any, date?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        
        if (date) {
            if (Platform.OS === 'ios') {
                setTempDate(date);
            } else {
                setSelectedDate(date);
            }
        }
    };

    const handleIOSDateConfirm = () => {
        setSelectedDate(tempDate);
        setShowDatePicker(false);
    };

    const handleIOSDateCancel = () => {
        setShowDatePicker(false);
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

    const sortTodos = (todos: Todo[]) => {
        return [...todos].sort((a, b) => {
            if (a.status === 'completed' && b.status !== 'completed') return 1;
            if (a.status !== 'completed' && b.status === 'completed') return -1;
            
            const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
            const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
            
            return dateA - dateB;
        });
    };

    return (
        <View style={styles.section}>
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddTodoModal(true)}
            >
                <Ionicons name="add" size={24} color={colors.text} />
                <ThemedText style={styles.addButtonText}>Add New Task</ThemedText>
            </TouchableOpacity>

            {todos.length > 0 ? (
                <View style={styles.todosList}>
                    {sortTodos(todos).map((todo, index) => {
                        const color = cardColors[index % cardColors.length];
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
                                        <Ionicons name="create-outline" size={16} color={isDark ? '#E5E7EB' : '#666'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.todoActionButton}
                                        onPress={() => handleDeleteTodo(todo.id)}
                                    >
                                        <Ionicons name="close" size={16} color={isDark ? '#E5E7EB' : '#666'} />
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
                    {Platform.OS === 'ios' && showDatePicker && (
                        <View>
                            <DateTimePicker
                                value={tempDate}
                                mode="date"
                                display="spinner"
                                onChange={handleDateChange}
                                minimumDate={new Date()}
                                themeVariant={isDark ? 'dark' : 'light'}
                            />
                            <View style={styles.iosDatePickerButtons}>
                                <TouchableOpacity
                                    style={[styles.iosDateButton, styles.iosDateButtonCancel]}
                                    onPress={handleIOSDateCancel}
                                >
                                    <ThemedText style={styles.iosDateButtonText}>Cancel</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.iosDateButton, styles.iosDateButtonConfirm]}
                                    onPress={handleIOSDateConfirm}
                                >
                                    <ThemedText style={styles.iosDateButtonText}>Confirm</ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => {
                                setShowAddTodoModal(false);
                                setSelectedDate(null);
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

            {/* Android Date Picker */}
            {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                    value={selectedDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                    themeVariant={isDark ? 'dark' : 'light'}
                />
            )}

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
                    {Platform.OS === 'ios' && showEditDatePicker && (
                        <View>
                            <DateTimePicker
                                value={editTodoDueDate || new Date()}
                                mode="date"
                                display="spinner"
                                onChange={(event, date) => {
                                    if (date) {
                                        setEditTodoDueDate(date);
                                    }
                                }}
                                minimumDate={new Date()}
                                themeVariant={isDark ? 'dark' : 'light'}
                            />
                            <View style={styles.iosDatePickerButtons}>
                                <TouchableOpacity
                                    style={[styles.iosDateButton, styles.iosDateButtonCancel]}
                                    onPress={() => setShowEditDatePicker(false)}
                                >
                                    <ThemedText style={styles.iosDateButtonText}>Cancel</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.iosDateButton, styles.iosDateButtonConfirm]}
                                    onPress={() => setShowEditDatePicker(false)}
                                >
                                    <ThemedText style={styles.iosDateButtonText}>Confirm</ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
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

            {/* Android Edit Date Picker */}
            {Platform.OS === 'android' && showEditDatePicker && (
                <DateTimePicker
                    value={editTodoDueDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                        setShowEditDatePicker(false);
                        if (date) {
                            setEditTodoDueDate(date);
                        }
                    }}
                    minimumDate={new Date()}
                    themeVariant={isDark ? 'dark' : 'light'}
                />
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isVisible={showDeleteConfirmModal}
                onBackdropPress={() => {
                    setShowDeleteConfirmModal(false);
                    setTodoToDelete(null);
                }}
                backdropOpacity={0.5}
                animationIn="slideInUp"
                animationOut="slideOutDown"
                style={{ margin: 0 }}
            >
                <View style={[styles.deleteModalContent, { backgroundColor: isDark ? '#2a2a2a' : '#fff' }]}>
                    <ThemedText style={styles.modalTitle}>Delete Task</ThemedText>
                    <ThemedText style={[styles.todoText, { marginBottom: 24 }]}>
                        Are you sure you want to delete this task? This action cannot be undone.
                    </ThemedText>
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => {
                                setShowDeleteConfirmModal(false);
                                setTodoToDelete(null);
                            }}
                        >
                            <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.saveButton]}
                            onPress={confirmDeleteTodo}
                        >
                            <ThemedText style={styles.modalButtonText}>Delete</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
} 