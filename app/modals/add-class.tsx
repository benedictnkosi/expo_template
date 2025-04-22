import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Pressable, ActivityIndicator, TextInput, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL, HOST_URL } from '@/config/api';
import { fetchMySubjects } from '@/services/api';
import { Subject } from '@/types/api';

const DAYS = [
    { id: 'monday', label: 'Mon' },
    { id: 'tuesday', label: 'Tue' },
    { id: 'wednesday', label: 'Wed' },
    { id: 'thursday', label: 'Thu' },
    { id: 'friday', label: 'Fri' }
] as const;

const SUBJECTS = [
    'Accounting',
    'Afrikaans',
    'Agricultural Management Practices',
    'Agricultural Sciences',
    'Agricultural Technology',
    'Automotive',
    'Business Studies',
    'Civil Services',
    'Civil Technology',
    'Computer Application Technology',
    'Construction',
    'Consumer Studies',
    'Dance Studies',
    'Design',
    'Digital Electronics',
    'Dramatic Arts',
    'Economics',
    'Electrical Technology',
    'Electronics',
    'Engineering Graphic and Design',
    'English',
    'Fitting and Machining',
    'Geography',
    'History',
    'Hospitality Studies',
    'Information Technology',
    'IsiNdebele',
    'IsiXhosa',
    'IsiZulu',
    'Life Orientation',
    'Life Sciences',
    'Marine Sciences',
    'Mathematical Literacy',
    'Mathematics',
    'Mechanical Technology',
    'Music',
    'Physical Sciences',
    'Power Systems',
    'Religion Studies',
    'Sepedi',
    'Sesotho',
    'Setswana',
    'Siswati',
    'South African Sign Language',
    'Technical Mathematics',
    'Technical Sciences',
    'Tourism',
    'Tshivenda',
    'Visual Arts',
    'Welding and Metalwork',
    'Woodworking',
    'Xitsonga'
] as const;

type DayId = typeof DAYS[number]['id'];

const TIME_SLOTS = (() => {
    const slots = [];
    for (let hour = 8; hour <= 15; hour++) {
        const formattedHour = hour.toString().padStart(2, '0');
        slots.push(
            `${formattedHour}:00`,
            `${formattedHour}:15`,
            `${formattedHour}:30`,
            `${formattedHour}:45`
        );
    }
    return slots;
})();

// Helper function to convert time string to minutes
const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

// Helper function to check for time overlap
const hasTimeOverlap = (
    newStartTime: string,
    newEndTime: string,
    existingClasses: Array<{ startTime: string; endTime: string }>
): boolean => {
    const newStart = timeToMinutes(newStartTime);
    const newEnd = timeToMinutes(newEndTime);

    return existingClasses.some((class_) => {
        const existingStart = timeToMinutes(class_.startTime);
        const existingEnd = timeToMinutes(class_.endTime);

        return (
            (newStart >= existingStart && newStart < existingEnd) ||
            (newEnd > existingStart && newEnd <= existingEnd) ||
            (newStart <= existingStart && newEnd >= existingEnd)
        );
    });
};

const ErrorAlert = ({
    visible,
    message,
    onClose,
    conflictingClass = null
}: {
    visible: boolean;
    message: string;
    onClose: () => void;
    conflictingClass?: { subject: string; startTime: string; endTime: string; } | null;
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
                    {conflictingClass && (
                        <View style={[
                            styles.conflictingClassInfo,
                            { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }
                        ]}>
                            <Text style={[
                                styles.conflictingClassText,
                                { color: isDark ? '#EBEBF5' : '#48484A' }
                            ]}>
                                Conflicts with: {conflictingClass.subject}
                            </Text>
                            <Text style={[
                                styles.conflictingClassTime,
                                { color: isDark ? '#EBEBF5' : '#48484A' }
                            ]}>
                                {conflictingClass.startTime} - {conflictingClass.endTime}
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

export default function AddClassModal() {
    const colorScheme = useColorScheme();
    const router = useRouter();
    const { user } = useAuth();
    const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECTS[0]);
    const [customSubject, setCustomSubject] = useState<string>('');
    const [isCustomSubject, setIsCustomSubject] = useState<boolean>(false);
    const [selectedDay, setSelectedDay] = useState<DayId>(DAYS[0].id);
    const [selectedStartTime, setSelectedStartTime] = useState(TIME_SLOTS[0]);
    const [selectedEndTime, setSelectedEndTime] = useState(TIME_SLOTS[4]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorVisible, setErrorVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [conflictingClass, setConflictingClass] = useState<{ subject: string; startTime: string; endTime: string; } | null>(null);

    const handleStartTimeChange = useCallback((time: string) => {
        const startIndex = TIME_SLOTS.indexOf(time);
        const endIndex = Math.min(startIndex + 4, TIME_SLOTS.length - 1);

        setSelectedStartTime(time);
        setSelectedEndTime(TIME_SLOTS[endIndex]);
    }, []);

    const handleSubjectChange = useCallback((value: string) => {
        if (value === 'custom') {
            setIsCustomSubject(true);
            setSelectedSubject('');
        } else {
            setIsCustomSubject(false);
            setSelectedSubject(value);
        }
    }, []);

    const resetForm = () => {
        setSelectedSubject(SUBJECTS[0]);
        setCustomSubject('');
        setIsCustomSubject(false);
        setSelectedDay(DAYS[0].id);
        setSelectedStartTime(TIME_SLOTS[0]);
        setSelectedEndTime(TIME_SLOTS[4]);
    };

    const handleSave = async () => {
        if (!user?.uid) {
            setErrorMessage('User not authenticated');
            setErrorVisible(true);
            return;
        }

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

        setIsSubmitting(true);
        try {
            // First, fetch the current timetable
            const getResponse = await fetch(`${API_BASE_URL}/learner?uid=${user.uid}`);
            if (!getResponse.ok) {
                throw new Error('Failed to fetch current timetable');
            }
            const currentData = await getResponse.json();

            // Initialize empty timetable if not present
            const emptyTimetable: Record<string, Array<{ subject: string; startTime: string; endTime: string }>> = {
                monday: [],
                tuesday: [],
                wednesday: [],
                thursday: [],
                friday: [],
                saturday: [],
                sunday: []
            };

            const currentTimetable = currentData.timetable || emptyTimetable;
            const existingClasses = currentTimetable[selectedDay] || [];

            // Check for conflicts and find the conflicting class
            const conflictingClassInfo = existingClasses.find((class_: { subject: string; startTime: string; endTime: string }) =>
                hasTimeOverlap(selectedStartTime, selectedEndTime, [class_])
            );

            if (conflictingClassInfo) {
                setConflictingClass(conflictingClassInfo);
                setErrorMessage('This time slot conflicts with an existing class. Please choose a different time.');
                setErrorVisible(true);
                setIsSubmitting(false);
                return;
            }

            // Create new class entry
            const newClass = {
                subject: finalSubject,
                startTime: selectedStartTime,
                endTime: selectedEndTime
            };

            // Merge with existing classes for the selected day
            const updatedClasses = [...existingClasses, newClass];

            // Update the timetable
            const response = await fetch(`${HOST_URL}/api/learner/${user.uid}/timetable`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    timetable: {
                        ...currentTimetable,
                        [selectedDay]: updatedClasses
                    }
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response:', errorText);
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            if (data.status === 'OK') {
                setShowSuccess(true);
                resetForm();
                setTimeout(() => setShowSuccess(false), 2000);
            } else {
                throw new Error(data.message || 'Failed to add class');
            }
        } catch (error) {
            console.error('Error adding class:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to add class. Please try again.');
            setErrorVisible(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        router.back();
    };

    if (isLoading) {
        return (
            <View style={[styles.overlay, { justifyContent: 'center', alignItems: 'center' }]}>
                <View style={[styles.modal, { justifyContent: 'center', alignItems: 'center', height: 200 }]}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={{ marginTop: 16, color: colorScheme === 'dark' ? '#fff' : '#000' }}>
                        Loading subjects...
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <Pressable style={styles.overlay} onPress={handleClose}>
            <Pressable
                style={[
                    styles.modal,
                    { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#fff' }
                ]}
                onPress={e => e.stopPropagation()}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color={colorScheme === 'dark' ? '#fff' : '#000'} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                        ✏️ Add New Class 📚
                    </Text>
                    <TouchableOpacity
                        onPress={handleSave}
                        style={styles.saveButton}
                        disabled={isSubmitting || (!selectedSubject && !customSubject)}
                    >
                        <Text style={[
                            styles.saveButtonText,
                            (isSubmitting || (!selectedSubject && !customSubject)) && styles.saveButtonTextDisabled
                        ]}>
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {showSuccess && (
                    <View style={[
                        styles.successMessage,
                        { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F1F3F5' }
                    ]}>
                        <Ionicons name="checkmark-circle" size={20} color="#34C759" />
                        <Text style={[
                            styles.successText,
                            { color: colorScheme === 'dark' ? '#fff' : '#000' }
                        ]}>
                            Class added successfully!
                        </Text>
                    </View>
                )}

                <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                            📚 Subject
                        </Text>
                        <View style={[
                            styles.pickerContainer,
                            { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7' }
                        ]}>
                            <Picker
                                selectedValue={isCustomSubject ? 'custom' : selectedSubject}
                                onValueChange={handleSubjectChange}
                                style={[
                                    styles.picker,
                                    { color: colorScheme === 'dark' ? '#fff' : '#000' }
                                ]}
                                itemStyle={{
                                    fontSize: 17,
                                    fontWeight: '400',
                                    color: colorScheme === 'dark' ? '#fff' : '#000'
                                }}
                            >
                                {SUBJECTS.map((subject) => (
                                    <Picker.Item
                                        key={subject}
                                        label={subject}
                                        value={subject}
                                    />
                                ))}
                                <Picker.Item label="Custom Subject" value="custom" />
                            </Picker>
                        </View>
                        {isCustomSubject && (
                            <View style={[
                                styles.inputContainer,
                                { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F1F3F5' }
                            ]}>
                                <TextInput
                                    style={[
                                        styles.textInput,
                                        { color: colorScheme === 'dark' ? '#fff' : '#000' }
                                    ]}
                                    placeholder="Enter subject name"
                                    placeholderTextColor={colorScheme === 'dark' ? '#8E8E93' : '#8E8E93'}
                                    value={customSubject}
                                    onChangeText={setCustomSubject}
                                />
                            </View>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                            📅 Day
                        </Text>
                        <View style={styles.dayButtonsContainer}>
                            {DAYS.map((day) => (
                                <TouchableOpacity
                                    key={day.id}
                                    style={[
                                        styles.dayButton,
                                        selectedDay === day.id && styles.dayButtonSelected,
                                        {
                                            backgroundColor: colorScheme === 'dark'
                                                ? selectedDay === day.id
                                                    ? '#007AFF'
                                                    : '#2C2C2E'
                                                : selectedDay === day.id
                                                    ? '#007AFF'
                                                    : '#F2F2F7'
                                        }
                                    ]}
                                    onPress={() => setSelectedDay(day.id)}
                                >
                                    <Text style={[
                                        styles.dayButtonText,
                                        selectedDay === day.id && styles.dayButtonTextSelected,
                                        {
                                            color: colorScheme === 'dark'
                                                ? selectedDay === day.id
                                                    ? '#FFFFFF'
                                                    : '#EBEBF5'
                                                : selectedDay === day.id
                                                    ? '#FFFFFF'
                                                    : '#000000'
                                        }
                                    ]}>
                                        {day.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                            🕐 Start Time
                        </Text>
                        <View style={[
                            styles.pickerContainer,
                            { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7' }
                        ]}>
                            <Picker
                                selectedValue={selectedStartTime}
                                onValueChange={handleStartTimeChange}
                                style={[
                                    styles.picker,
                                    { color: colorScheme === 'dark' ? '#fff' : '#000' }
                                ]}
                                itemStyle={{
                                    fontSize: 17,
                                    fontWeight: '400',
                                    color: colorScheme === 'dark' ? '#fff' : '#000'
                                }}
                            >
                                {TIME_SLOTS.map((time) => (
                                    <Picker.Item
                                        key={time}
                                        label={time}
                                        value={time}
                                    />
                                ))}
                            </Picker>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
                            🕒 End Time
                        </Text>
                        <View style={[
                            styles.pickerContainer,
                            { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7' }
                        ]}>
                            <Picker
                                selectedValue={selectedEndTime}
                                onValueChange={setSelectedEndTime}
                                style={[
                                    styles.picker,
                                    { color: colorScheme === 'dark' ? '#fff' : '#000' }
                                ]}
                                itemStyle={{
                                    fontSize: 17,
                                    fontWeight: '400',
                                    color: colorScheme === 'dark' ? '#fff' : '#000'
                                }}
                            >
                                {TIME_SLOTS.slice(TIME_SLOTS.indexOf(selectedStartTime) + 1).map((time) => (
                                    <Picker.Item
                                        key={time}
                                        label={time}
                                        value={time}
                                    />
                                ))}
                            </Picker>
                        </View>
                    </View>
                </ScrollView>
            </Pressable>

            <ErrorAlert
                visible={errorVisible}
                message={errorMessage}
                onClose={() => {
                    setErrorVisible(false);
                    setConflictingClass(null);
                }}
                conflictingClass={conflictingClass}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: '90%',
        maxWidth: 400,
        borderRadius: 14,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    closeButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 16,
    },
    saveButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: '#007AFF',
        fontSize: 17,
        fontWeight: '600',
    },
    saveButtonTextDisabled: {
        opacity: 0.5,
    },
    formContainer: {
        padding: 20,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 8,
        color: '#000',
    },
    pickerContainer: {
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: 'trasn',
        height: 50,
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    picker: {
        width: '100%',
        marginTop: Platform.OS === 'ios' ? -6 : 0,
    },
    inputContainer: {
        marginTop: 8,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    textInput: {
        fontSize: 16,
        height: 40,
    },
    successMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginHorizontal: 16,
        marginTop: 8,
        borderRadius: 8,
    },
    successText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
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
    conflictingClassInfo: {
        width: '100%',
        padding: 16,
        borderRadius: 10,
        marginBottom: 16,
    },
    conflictingClassText: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 4,
    },
    conflictingClassTime: {
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
    dayButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    dayButton: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayButtonSelected: {
        backgroundColor: '#007AFF',
    },
    dayButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    dayButtonTextSelected: {
        color: '#FFFFFF',
    },
} as const); 