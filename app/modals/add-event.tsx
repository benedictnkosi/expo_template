import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, Pressable, Switch } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColorScheme } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parse } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL, HOST_URL } from '@/config/api';
import Toast from 'react-native-toast-message';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { fetchMySubjects } from '@/services/api';
import { SubjectPicker } from '@/components/SubjectPicker';
import { analytics } from '@/services/analytics';

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
                        Error
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
    const { date: initialDate, edit, title: initialTitle, subject: initialSubject, startTime: initialStartTime, endTime: initialEndTime, reminder: initialReminder } = useLocalSearchParams<{
        date: string;
        edit?: string;
        title?: string;
        subject?: string;
        startTime?: string;
        endTime?: string;
        reminder?: string;
    }>();
    const colorScheme = useColorScheme();
    const { user } = useAuth();

    const [title, setTitle] = useState(initialTitle || '');
    const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject || 'Accounting');
    const [customSubject, setCustomSubject] = useState<string>('');
    const [isCustomSubject, setIsCustomSubject] = useState<boolean>(false);
    const [selectedDate, setSelectedDate] = useState(() => {
        return initialDate ? parse(initialDate, 'yyyy-MM-dd', new Date()) : new Date();
    });
    const [startTime, setStartTime] = useState(() => {
        if (initialStartTime) {
            const [hours, minutes] = initialStartTime.split(':');
            const time = new Date();
            time.setHours(parseInt(hours));
            time.setMinutes(parseInt(minutes));
            return time;
        }
        const now = new Date();
        now.setMinutes(0);
        return now;
    });
    const [endTime, setEndTime] = useState(() => {
        if (initialEndTime) {
            const [hours, minutes] = initialEndTime.split(':');
            const time = new Date();
            time.setHours(parseInt(hours));
            time.setMinutes(parseInt(minutes));
            return time;
        }
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
    const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
    const isEditing = edit === 'true';


    const handleSubjectChange = (value: string) => {
        if (value === 'custom') {
            setIsCustomSubject(true);
            setSelectedSubject('');
        } else {
            setIsCustomSubject(false);
            setSelectedSubject(value);
        }
    };

    const handleSubmit = async () => {
        if (!user?.uid || !title) return;

        const finalSubject = isCustomSubject ? customSubject : selectedSubject;

        if (!finalSubject) {
            setErrorMessage('Please select or enter a subject');
            setErrorVisible(true);
            return;
        }

        if (isCustomSubject && !customSubject.trim()) {
            setErrorMessage('Please enter a custom subject name');
            setErrorVisible(true);
            return;
        }

        // Validate minimum duration of 30 minutes
        const durationInMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        if (durationInMinutes < 29) {
            console.log(durationInMinutes);
            setErrorMessage('⏰ Oops! Events need to be at least 30 minutes long. Let\'s give it more time! ✨');
            setErrorVisible(true);
            return;
        }

        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        const newEvent = {
            title,
            subject: finalSubject,
            startTime: format(startTime, 'HH:mm'),
            endTime: format(endTime, 'HH:mm'),
            reminder: reminderEnabled
        };

        try {
            // First get current events
            const getResponse = await fetch(`${API_BASE_URL}/learner?uid=${user.uid}`);
            const currentData = await getResponse.json();
            const currentEvents = currentData.events || {};

            // Check for conflicts
            const conflicts = currentEvents[formattedDate]?.filter((event: { title: string; startTime: string; endTime: string }) => {
                if (isEditing && event.title === initialTitle && event.startTime === initialStartTime && event.endTime === initialEndTime) {
                    return false; // Skip the event being edited
                }
                return (
                    (newEvent.startTime >= event.startTime && newEvent.startTime < event.endTime) ||
                    (newEvent.endTime > event.startTime && newEvent.endTime <= event.endTime) ||
                    (newEvent.startTime <= event.startTime && newEvent.endTime >= event.endTime)
                );
            });

            if (conflicts?.length > 0) {
                setConflictingEvent(conflicts[0]);
                setErrorVisible(true);
                setErrorMessage('This time slot conflicts with an existing event');
                return;
            }

            // Update events
            const updatedEvents = { ...currentEvents };

            // If editing, remove the event from its original date
            if (isEditing && initialDate) {
                const originalDate = initialDate;
                if (updatedEvents[originalDate]) {
                    updatedEvents[originalDate] = updatedEvents[originalDate].filter(
                        (event: { title: string; startTime: string; endTime: string }) =>
                            !(event.title === initialTitle && event.startTime === initialStartTime && event.endTime === initialEndTime)
                    );
                    // Remove the date key if no events left
                    if (updatedEvents[originalDate].length === 0) {
                        delete updatedEvents[originalDate];
                    }
                }
            }

            // Add the event to the new date
            if (!updatedEvents[formattedDate]) {
                updatedEvents[formattedDate] = [];
            }
            updatedEvents[formattedDate].push(newEvent);

            const response = await fetch(`${HOST_URL}/api/learner/${user.uid}/events`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    events: updatedEvents
                }),
            });

            const data = await response.json();
            if (data.status === 'OK') {
                // Log the new plan creation
                await analytics.track('create_plan', {
                    title,
                    subject: finalSubject,
                    date: formattedDate,
                    startTime: format(startTime, 'HH:mm'),
                    endTime: format(endTime, 'HH:mm'),
                    reminder: reminderEnabled
                });

                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: isEditing ? 'Event updated successfully' : 'Event added successfully',
                });
                router.back();
            } else {
                throw new Error(data.message || 'Failed to save event');
            }
        } catch (error) {
            console.error('Error saving event:', error);
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to save event',
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
                    <View style={styles.titleContainer}>
                        <Text style={[
                            styles.title,
                            { color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text }
                        ]}>
                            📚 Plan For Your Future
                        </Text>
                        <Text style={[
                            styles.subtitle,
                            { color: colorScheme === 'dark' ? Colors.dark.textSecondary : Colors.light.textSecondary }
                        ]}>
                            Schedule your study sessions, exams, assignments, and more
                        </Text>
                    </View>
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
                    <SubjectPicker
                        selectedSubject={selectedSubject}
                        isCustomSubject={isCustomSubject}
                        onSubjectChange={handleSubjectChange}
                    />

                    {isCustomSubject && (
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: colorScheme === 'dark' ? Colors.dark.surface : Colors.light.surface,
                                    color: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text,
                                    borderColor: colorScheme === 'dark' ? Colors.dark.border : Colors.light.border,
                                }
                            ]}
                            value={customSubject}
                            onChangeText={setCustomSubject}
                            placeholder="Enter custom subject name"
                            placeholderTextColor={colorScheme === 'dark' ? Colors.dark.textSecondary : Colors.light.textSecondary}
                        />
                    )}

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
                            placeholder="title"
                            placeholderTextColor={colorScheme === 'dark' ? Colors.dark.textSecondary : Colors.light.textSecondary}
                            maxLength={50}
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
                        <Text style={styles.submitButtonText}>
                            {isEditing ? '🔄 Update' : '➕ Add'}
                        </Text>
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
                            minuteInterval={5}
                            onChange={(event, selectedDate) => {
                                setShowStartPicker(false);
                                if (selectedDate) {
                                    setStartTime(selectedDate);
                                    // Set end time to 1 hour after start time
                                    const newEndTime = new Date(selectedDate.getTime() + 60 * 60 * 1000);
                                    setEndTime(newEndTime);
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
                            minuteInterval={5}
                            minimumDate={new Date(startTime.getTime() + 30 * 60 * 1000)}
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
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    titleContainer: {
        flex: 1,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
        opacity: 0.8,
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
    pickerContainer: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 16,
        overflow: 'hidden',
    },
    picker: {
        height: 48,
    },
}); 