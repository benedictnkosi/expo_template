import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Modal, TextInput, StyleSheet, Keyboard } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '@/config/api';
import Toast from 'react-native-toast-message';
import { analytics } from '@/services/analytics';

interface Note {
    id: number;
    created_at: string;
    text: string;
    description?: string;
    subject_name: string;
}

interface NoteListProps {
    notes: Note[];
    subjectName: string;
    userUid: string;
    isDark: boolean;
    colors: {
        primary: string;
        background: string;
        text: string;
        textSecondary: string;
    };
    currentQuestionId?: number;
    onNotesChange: (notes: Note[]) => void;
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
            fontSize: 14,
            marginBottom: 8,
            color: isDark ? '#E5E7EB' : '#1F2937',
        },
        noteDate: {
            fontSize: 14,
            color: isDark ? '#9CA3AF' : '#6B7280',
        },
        noteActions: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginLeft: 'auto',
        },
        noteActionButton: {
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
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
        },
        modalContent: {
            backgroundColor: isDark ? '#1F2937' : '#fff',
            padding: 20,
            borderRadius: 12,
            width: '90%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        deleteModalContent: {
            backgroundColor: isDark ? '#1F2937' : '#fff',
            padding: 20,
            borderRadius: 12,
            width: '90%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            marginBottom: 16,
            color: isDark ? '#E5E7EB' : '#1F2937',
        },
        modalHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
        },
        doneButton: {
            padding: 8,
            borderRadius: 6,
            backgroundColor: 'rgba(128, 128, 128, 0.2)',
        },
        doneButtonText: {
            fontSize: 16,
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

export function NoteList({
    notes,
    subjectName,
    userUid,
    isDark,
    colors,
    currentQuestionId,
    onNotesChange
}: NoteListProps) {
    const styles = createStyles(isDark);
    const [showAddNoteModal, setShowAddNoteModal] = useState(false);
    const [showEditNoteModal, setShowEditNoteModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
    const [newNoteText, setNewNoteText] = useState('');
    const [editNoteText, setEditNoteText] = useState('');
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [newNote, setNewNote] = useState('');

    const fetchNotes = async () => {
        if (!userUid) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/notes?uid=${userUid}&subject_name=${subjectName}`);
            const data = await response.json();
            if (data.status === "OK") {
                onNotesChange(data.notes);
            }
        } catch (error) {
            console.error('Error fetching notes:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to load notes',
            });
        } finally {
            setIsLoading(false);
        }
    };



    useEffect(() => {
        fetchNotes();
    }, [subjectName, currentQuestionId]);

    const addNote = async () => {
        if (!newNoteText.trim()) return;

        try {

            const response = await fetch(`${API_BASE_URL}/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uid: userUid,
                    subject_name: subjectName,
                    text: newNoteText.trim(),
                    question_id: currentQuestionId,
                }),
            });

            const data = await response.json();
            if (data.status === "OK") {
                // Track successful note creation
                await analytics.track('add_note_success', {
                    user_id: userUid,
                    subject_name: subjectName,
                    question_id: currentQuestionId,
                    note_id: data.note.id,
                    note_length: newNoteText.trim().length
                });

                onNotesChange([...notes, data.note]);
                setNewNoteText('');
                setShowAddNoteModal(false);
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Note added successfully',
                });
            }
        } catch (error) {
            console.error('Error adding note:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to add note',
            });
        }
    };

    const editNote = async () => {
        if (!editingNote || !editNoteText.trim()) return;

        try {
            const response = await fetch(`${API_BASE_URL}/notes/${editingNote.id}/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uid: userUid,
                    text: editNoteText.trim(),
                    subject_name: subjectName,
                    date: new Date().toISOString(),
                }),
            });

            const data = await response.json();
            if (data.status === "OK") {
                onNotesChange(notes.map(note =>
                    note.id === editingNote.id ? { ...note, text: editNoteText.trim() } : note
                ));
                setEditingNote(null);
                setEditNoteText('');
                setShowEditNoteModal(false);
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Note updated successfully',
                });
                fetchNotes();
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

    const deleteNote = async (noteId: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/notes/${noteId}?uid=${userUid}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    uid: userUid,
                }),
            });

            const data = await response.json();
            if (data.status === "OK") {
                onNotesChange(notes.filter(note => note.id !== noteId));
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Note deleted successfully',
                });
            }
        } catch (error) {
            console.error('Error deleting note:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete note',
            });
        } finally {
            setNoteToDelete(null);
            setShowDeleteConfirmModal(false);
        }
    };

    const handleDeletePress = (noteId: number) => {
        setNoteToDelete(noteId);
        setShowDeleteConfirmModal(true);
    };

    return (
        <View style={styles.section}>
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddNoteModal(true)}
            >
                <Ionicons name="add" size={24} color={colors.text} />
                <ThemedText style={styles.addButtonText}>Add New Note</ThemedText>
            </TouchableOpacity>

            {notes.length > 0 ? (
                <View style={styles.notesList}>
                    {notes.map((note, index) => {
                        const cardColors = [
                            isDark ? '#4B5563' : '#FFE082',
                            isDark ? '#4F4F4F' : '#F8BBD0',
                            isDark ? '#374151' : '#BBDEFB',
                            isDark ? '#3B4252' : '#C8E6C9',
                            isDark ? '#44475A' : '#E1BEE7',
                            isDark ? '#2D3748' : '#FFCCBC'
                        ];
                        const color = cardColors[index % cardColors.length];

                        return (
                            <View
                                key={note.id}
                                style={[styles.noteCard, { backgroundColor: color }]}
                            >
                                <View style={styles.noteContent}>

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
                                            <Ionicons name="create-outline" size={16} color={isDark ? '#E5E7EB' : '#666'} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.noteActionButton}
                                            onPress={() => handleDeletePress(note.id)}
                                        >
                                            <Ionicons name="close" size={16} color={isDark ? '#E5E7EB' : '#666'} />
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

            {/* Add Note Modal */}
            <Modal
                visible={showAddNoteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowAddNoteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>Add New Note</ThemedText>
                            <TouchableOpacity
                                style={styles.doneButton}
                                onPress={() => Keyboard.dismiss()}
                            >
                                <ThemedText style={styles.doneButtonText}>Done</ThemedText>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[
                                styles.modalInput,
                                {
                                    backgroundColor: isDark ? '#374151' : '#fff',
                                    color: isDark ? '#E5E7EB' : '#1F2937',
                                }
                            ]}
                            value={newNoteText}
                            onChangeText={setNewNoteText}
                            placeholder="Enter your note..."
                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            multiline
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setNewNoteText('');
                                    setShowAddNoteModal(false);
                                }}
                            >
                                <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.saveButton,
                                    !newNoteText.trim() && styles.disabledButton
                                ]}
                                onPress={addNote}
                                disabled={!newNoteText.trim()}
                            >
                                <ThemedText style={styles.modalButtonText}>Save</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Edit Note Modal */}
            <Modal
                visible={showEditNoteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowEditNoteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>Edit Note</ThemedText>
                            <TouchableOpacity
                                style={styles.doneButton}
                                onPress={() => Keyboard.dismiss()}
                            >
                                <ThemedText style={styles.doneButtonText}>Done</ThemedText>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={[
                                styles.modalInput,
                                {
                                    backgroundColor: isDark ? '#374151' : '#fff',
                                    color: isDark ? '#E5E7EB' : '#1F2937',
                                }
                            ]}
                            value={editNoteText}
                            onChangeText={setEditNoteText}
                            placeholder="Enter your note..."
                            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                            multiline
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setEditingNote(null);
                                    setEditNoteText('');
                                    setShowEditNoteModal(false);
                                }}
                            >
                                <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.saveButton,
                                    !editNoteText.trim() && styles.disabledButton
                                ]}
                                onPress={editNote}
                                disabled={!editNoteText.trim()}
                            >
                                <ThemedText style={styles.modalButtonText}>Save</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteConfirmModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteConfirmModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.deleteModalContent}>
                        <ThemedText style={styles.modalTitle}>Delete Note</ThemedText>
                        <ThemedText style={[styles.noteText, { marginBottom: 24 }]}>
                            Are you sure you want to delete this note? This action cannot be undone.
                        </ThemedText>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setNoteToDelete(null);
                                    setShowDeleteConfirmModal(false);
                                }}
                            >
                                <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton, { backgroundColor: '#DC2626' }]}
                                onPress={() => noteToDelete && deleteNote(noteToDelete)}
                            >
                                <ThemedText style={styles.modalButtonText}>Delete</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
} 