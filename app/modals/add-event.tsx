import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, Pressable, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parse } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { HOST_URL } from '@/config/api';
import Toast from 'react-native-toast-message';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const ErrorAlert = ({
    visible,
    message,
    onClose,
    conflictingEvent = null
}: {
    visible: boolean;
    message: string;
    onClose: () => void;
    conflictingEvent?: { title: string; startTime: string; endTime: string; } | null;
}) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.errorOverlay} onPress={onClose}>
                <Pressable
                    style={[
                        styles.errorModal,
                        { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }
                    ]}
                    onPress={e => e.stopPropagation()}
                >
                    <View style={styles.errorIconContainer}>
                        <Ionicons
                            name="alert-circle"
                            size={32}
                            color="#FF3B30"
                        />
                    </View>
                    <Text style={[
                        styles.errorTitle,
                        { color: isDark ? '#FFFFFF' : '#000000' }
                    ]}>
                        Time Conflict
                    </Text>
                    <Text style={[
                        styles.errorMessage,
                        { color: isDark ? '#EBEBF5' : '#48484A' }
                    ]}>
                        {message}
                    </Text>
                    {conflictingEvent && (
                        <View style={[
                            styles.conflictingEventInfo,
                            { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }
                        ]}>
                            <Text style={[
                                styles.conflictingEventText,
                                { color: isDark ? '#EBEBF5' : '#48484A' }
                            ]}>
                                Conflicts with: {conflictingEvent.title}
                            </Text>
                            <Text style={[
                                styles.conflictingEventTime,
                                { color: isDark ? '#EBEBF5' : '#48484A' }
                            ]}>
                                {conflictingEvent.startTime} - {conflictingEvent.endTime}
                            </Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={[
                            styles.errorButton,
                            { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }
                        ]}
                        onPress={onClose}
                    >
                        <Text style={[
                            styles.errorButtonText,
                            { color: '#007AFF' }
                        ]}>
                            OK
                        </Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

export default function AddEventModal() {
    const router = useRouter();
    const { date: initialDate } = useLocalSearchParams<{ date: string }>();
    const colorScheme = useColorScheme();
    const { user } = useAuth();

    const [title, setTitle] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => {
        return initialDate ? parse(initialDate, 'yyyy-MM-dd', new Date()) : new Date();
    });
    const [startTime, setStartTime] = useState(() => {
        const now = new Date();
        now.setMinutes(0);
        return now;
    });
    const [endTime, setEndTime] = useState(() => {
        const now = new Date();
        now.setMinutes(0);
        now.setHours(now.getHours() + 1);
        return now;
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [errorVisible, setErrorVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [conflictingEvent, setConflictingEvent] = useState<{ title: string; startTime: string; endTime: string; } | null>(null);
    const [reminderEnabled, setReminderEnabled] = useState(false);

    const hasTimeConflict = (newEvent: { startTime: string; endTime: string }, existingEvents: { title: string; startTime: string; endTime: string }[]) => {
        const newStart = new Date(`2000-01-01T${newEvent.startTime}`);
        const newEnd = new Date(`2000-01-01T${newEvent.endTime}`);

        return existingEvents.find(event => {
            const existingStart = new Date(`2000-01-01T${event.startTime}`);
            const existingEnd = new Date(`2000-01-01T${event.endTime}`);

            return (
                (newStart >= existingStart && newStart < existingEnd) ||
                (newEnd > existingStart && newEnd <= existingEnd) ||
                (newStart <= existingStart && newEnd >= existingEnd)
            );
        });
    };

    const handleSubmit = async () => {
        if (!user?.uid || !title) return;

        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        const newEvent = {
            title,
            startTime: format(startTime, 'HH:mm'),
            endTime: format(endTime, 'HH:mm'),
            reminder: reminderEnabled
        };

        try {
            // First get current events
            const response = await fetch(`${HOST_URL}/public/learn/learner?uid=${user.uid}`);
            const data = await response.json();
            const currentEvents = data.events || {};

            // Check for time conflicts
            const existingEvents = currentEvents[formattedDate] || [];
            const conflict = hasTimeConflict(newEvent, existingEvents);

            if (conflict) {
                setConflictingEvent(conflict);
                setErrorMessage('This time slot conflicts with an existing event. Please choose a different time.');
                setErrorVisible(true);
                return;
            }

            const updatedEvents = {
                ...currentEvents,
                [formattedDate]: [...existingEvents, newEvent]
            };

            // Update events
            const updateResponse = await fetch(`${HOST_URL}/api/learner/${user.uid}/events`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    events: updatedEvents
                }),
            });

            const updateData = await updateResponse.json();
            if (updateData.status === 'OK') {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Event added successfully',
                });
                router.back();
            } else {
                throw new Error(updateData.message || 'Failed to add event');
            }
        } catch (error) {
            console.error('Error adding event:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to add event',
            });
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={[
                    styles.container,
                    { backgroundColor: colorScheme === 'dark' ? Colors.dark.background : Colors.light.background }
                ]}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={styles.header}>
                    <Text style={[
                        styles.title,
                        { color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text }
                    ]}>
                        📚 Add a new schedule
                    </Text>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => router.back()}
                    >
                        <Ionicons
                            name="close"
                            size={24}
                            color={colorScheme === 'dark' ? Colors.dark.text : Colors.light.text}
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Text style={[
                            styles.label,
                            { color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text }
                        ]}>
                            📝 Title
                        </Text>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: colorScheme === 'dark' ? Colors.dark.surface : Colors.light.surface,
                                    color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text,
                                    borderColor: colorScheme === 'dark' ? Colors.dark.border : Colors.light.border,
                                }
                            ]}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Study or exam title"
                            placeholderTextColor={colorScheme === 'dark' ? Colors.dark.textSecondary : Colors.light.textSecondary}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={[
                            styles.label,
                            { color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text }
                        ]}>
                            📅 Date
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.timeButton,
                                {
                                    backgroundColor: colorScheme === 'dark' ? Colors.dark.surface : Colors.light.surface,
                                    borderColor: colorScheme === 'dark' ? Colors.dark.border : Colors.light.border,
                                }
                            ]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={[
                                styles.timeText,
                                { color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text }
                            ]}>
                                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.timeContainer}>
                        <View style={[styles.inputContainer, { flex: 1 }]}>
                            <Text style={[
                                styles.label,
                                { color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text }
                            ]}>
                                ⏰ Start Time
                            </Text>
                            <TouchableOpacity
                                style={[
                                    styles.timeButton,
                                    {
                                        backgroundColor: colorScheme === 'dark' ? Colors.dark.surface : Colors.light.surface,
                                        borderColor: colorScheme === 'dark' ? Colors.dark.border : Colors.light.border,
                                    }
                                ]}
                                onPress={() => setShowStartPicker(true)}
                            >
                                <Text style={[
                                    styles.timeText,
                                    { color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text }
                                ]}>
                                    {format(startTime, 'HH:mm')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.inputContainer, { flex: 1 }]}>
                            <Text style={[
                                styles.label,
                                { color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text }
                            ]}>
                                ⏰ End Time
                            </Text>
                            <TouchableOpacity
                                style={[
                                    styles.timeButton,
                                    {
                                        backgroundColor: colorScheme === 'dark' ? Colors.dark.surface : Colors.light.surface,
                                        borderColor: colorScheme === 'dark' ? Colors.dark.border : Colors.light.border,
                                    }
                                ]}
                                onPress={() => setShowEndPicker(true)}
                            >
                                <Text style={[
                                    styles.timeText,
                                    { color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text }
                                ]}>
                                    {format(endTime, 'HH:mm')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.reminderContainer}>
                        <View style={styles.reminderHeader}>
                            <Text style={[
                                styles.label,
                                { color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text }
                            ]}>
                                🔔 Reminder (3 days and 1 day before)
                            </Text>
                            <Switch
                                value={reminderEnabled}
                                onValueChange={setReminderEnabled}
                                trackColor={{ false: '#767577', true: '#81b0ff' }}
                                thumbColor={reminderEnabled ? '#007AFF' : '#f4f3f4'}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            !title && styles.submitButtonDisabled
                        ]}
                        onPress={handleSubmit}
                        disabled={!title}
                    >
                        <Text style={styles.submitButtonText}>➕ Add</Text>
                    </TouchableOpacity>

                    {showDatePicker && (
                        <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display="spinner"
                            onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) {
                                    setSelectedDate(selectedDate);
                                }
                            }}
                        />
                    )}

                    {showStartPicker && (
                        <DateTimePicker
                            value={startTime}
                            mode="time"
                            is24Hour={true}
                            display="spinner"
                            onChange={(event, selectedDate) => {
                                setShowStartPicker(false);
                                if (selectedDate) {
                                    setStartTime(selectedDate);
                                    setEndTime(new Date(selectedDate.getTime() + 60 * 60 * 1000));
                                }
                            }}
                        />
                    )}

                    {showEndPicker && (
                        <DateTimePicker
                            value={endTime}
                            mode="time"
                            is24Hour={true}
                            display="spinner"
                            minimumDate={startTime}
                            onChange={(event, selectedDate) => {
                                setShowEndPicker(false);
                                if (selectedDate) {
                                    setEndTime(selectedDate);
                                }
                            }}
                        />
                    )}
                </View>
            </ScrollView>

            <ErrorAlert
                visible={errorVisible}
                message={errorMessage}
                onClose={() => {
                    setErrorVisible(false);
                    setConflictingEvent(null);
                }}
                conflictingEvent={conflictingEvent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 64,
    },
    contentContainer: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    form: {
        gap: 16,
    },
    inputContainer: {
        gap: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
    },
    input: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 16,
        fontSize: 16,
    },
    timeButton: {
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    timeText: {
        fontSize: 16,
    },
    submitButton: {
        height: 48,
        borderRadius: 12,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    timeContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    errorOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorModal: {
        width: '85%',
        maxWidth: 340,
        borderRadius: 14,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    errorIconContainer: {
        marginBottom: 16,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    errorMessage: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 22,
    },
    conflictingEventInfo: {
        width: '100%',
        padding: 16,
        borderRadius: 10,
        marginBottom: 16,
    },
    conflictingEventText: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 4,
    },
    conflictingEventTime: {
        fontSize: 14,
    },
    errorButton: {
        width: '100%',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    errorButtonText: {
        fontSize: 17,
        fontWeight: '600',
    },
    reminderContainer: {
        gap: 8,
    },
    reminderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
}); 