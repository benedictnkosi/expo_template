import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL, HOST_URL } from '@/config/api';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Header } from '@/components/Header';

interface Class {
  subject: string;
  startTime: string;
  endTime: string;
}

interface Timetable {
  monday: Class[];
  tuesday: Class[];
  wednesday: Class[];
  thursday: Class[];
  friday: Class[];
  saturday: Class[];
  sunday: Class[];
}

interface LearnerData {
  timetable: Timetable;
  name: string;
  grade: Grade;
  school_name: string;
  avatar: string;
}

interface Grade {
  number: number;
  name: string;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'
];

const COLORS = [
  '#4361EE', // Deep Blue
  '#4CC9F0', // Light Blue
  '#4CAF50', // Green
  '#9C27B0', // Purple
  '#FF9800', // Orange
  '#E91E63', // Pink
  '#F72585', // Hot Pink
  '#2EC4B6', // Teal
  '#FF6B6B', // Coral Red
  '#845EC2', // Purple Blue
  '#FF9671', // Peach
  '#00C9A7', // Mint
  '#4D8076', // Forest Green
  '#C75146', // Rust Red
  '#3D5A80', // Navy Blue
  '#FFB800', // Golden Yellow
  '#98CE00', // Lime Green
  '#FB5607', // Bright Orange
  '#7209B7', // Deep Purple
];

// Function to get current day name in lowercase
function getCurrentDay(): string {
  const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
  // Convert Sunday (0) to 6 to match our DAYS array (where Monday is 0)
  const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  // If it's weekend, default to Monday (0)
  return DAYS[adjustedIndex > 4 ? 0 : adjustedIndex];
}

export default function TimetableScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<string>(getCurrentDay());
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subjectColorMap, setSubjectColorMap] = useState<Map<string, string>>(new Map());
  const [learnerInfo, setLearnerInfo] = useState<{
    name: string;
    grade: string;
    school?: string;
    avatar?: string;
  } | null>(null);

  // Function to initialize subject colors
  const initializeSubjectColors = (timetableData: Timetable) => {
    const uniqueSubjects = new Set<string>();
    Object.values(timetableData).forEach(dayClasses => {
      dayClasses.forEach((cls: Class) => uniqueSubjects.add(cls.subject));
    });

    const newColorMap = new Map<string, string>();
    Array.from(uniqueSubjects).forEach((subject, index) => {
      newColorMap.set(subject, COLORS[index % COLORS.length]);
    });
    setSubjectColorMap(newColorMap);
  };

  const fetchTimetable = async () => {
    if (!user?.uid) return;

    try {
      const response = await fetch(`${API_BASE_URL}/learner?uid=${user.uid}`);
      const data: LearnerData = await response.json();
      setLearnerInfo({
        name: data.name || '',
        grade: data.grade?.number?.toString() || '',
        school: data.school_name || '',
        avatar: data.avatar || ''
      });

      // Initialize empty timetable if not present
      const emptyTimetable: Timetable = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      };

      setTimetable(data.timetable || emptyTimetable);
      if (data.timetable) {
        initializeSubjectColors(data.timetable);
      }
    } catch (error) {
      console.error('Error fetching timetable:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTimetable();
    }, [])
  );

  const handleAddClass = () => {
    router.push('/modals/add-class');
  };

  const getClassesForDay = (day: string) => {
    return timetable?.[day as keyof Timetable] || [];
  };

  const getClassesInHourSlot = (day: string, hourSlot: string) => {
    const classes = getClassesForDay(day);
    return classes.filter(cls => {
      const [slotHour] = hourSlot.split(':');
      const [startHour] = cls.startTime.split(':');
      return slotHour === startHour;
    });
  };

  const calculateTopOffset = (startTime: string) => {
    const [hour, minute] = startTime.split(':').map(Number);
    // Calculate offset based on minutes (0-60 minutes maps to 0-64 pixels)
    return (minute / 60) * 64;
  };

  const calculateHeight = (startTime: string, endTime: string) => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const totalStartMinutes = startHour * 60 + startMinute;
    const totalEndMinutes = endHour * 60 + endMinute;
    const durationMinutes = totalEndMinutes - totalStartMinutes;

    // Convert duration to height (1 hour = 64px)
    return Math.max(48, (durationMinutes / 60) * 64);
  };

  const deleteClass = async (day: string, classToDelete: Class) => {
    if (!user?.uid) return;

    try {
      // First, fetch the current timetable
      const getResponse = await fetch(`${API_BASE_URL}/learner?uid=${user.uid}`);
      const currentData = await getResponse.json();
      const currentTimetable = currentData.timetable || {};

      // Filter out the class to delete
      const updatedClasses = currentTimetable[day].filter(
        (cls: Class) =>
          cls.subject !== classToDelete.subject ||
          cls.startTime !== classToDelete.startTime ||
          cls.endTime !== classToDelete.endTime
      );

      // Update the timetable
      const response = await fetch(`${HOST_URL}/api/learner/${user.uid}/timetable`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timetable: {
            ...currentTimetable,
            [day]: updatedClasses
          }
        }),
      });

      const data = await response.json();
      if (data.status === 'OK') {
        setTimetable({
          ...currentTimetable,
          [day]: updatedClasses
        });
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Class deleted successfully',
        });
      } else {
        throw new Error(data.message || 'Failed to delete class');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete class',
      });
    }
  };

  const handleDeleteClass = (day: string, classToDelete: Class) => {
    Alert.alert(
      'Delete Class',
      `Are you sure you want to delete ${classToDelete.subject} class?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteClass(day, classToDelete),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header learnerInfo={learnerInfo} />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>
          📅 My Classes
        </Text>
        <TouchableOpacity
          onPress={handleAddClass}
          style={styles.addButton}
          activeOpacity={0.7}
        >
          <View style={styles.addButtonInner}>
            <Ionicons name="add" size={28} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.daysRow}>
        {DAYS.slice(0, 5).map((day) => (
          <TouchableOpacity
            key={day}
            onPress={() => setSelectedDay(day)}
            style={[
              styles.dayButton,
              selectedDay === day && styles.selectedDayButton
            ]}
          >
            <Text
              style={[
                styles.dayText,
                selectedDay === day && styles.selectedDayText
              ]}
            >
              {day === 'monday' ? 'Mon' :
                day === 'tuesday' ? 'Tue' :
                  day === 'wednesday' ? 'Wed' :
                    day === 'thursday' ? 'Thu' : 'Fri'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scheduleContainer}>
        {TIME_SLOTS.map((time) => (
          <View key={time} style={styles.timeSlot}>
            <Text style={styles.timeText}>
              {time}
            </Text>
            <View style={styles.classSlot}>
              {getClassesInHourSlot(selectedDay, time).map((cls) => (
                <View
                  key={`${cls.subject}-${cls.startTime}`}
                  style={[
                    styles.classCard,
                    {
                      position: 'absolute',
                      top: calculateTopOffset(cls.startTime),
                      height: calculateHeight(cls.startTime, cls.endTime),
                      left: 0,
                      right: 0,
                      zIndex: 1
                    }
                  ]}
                >
                  <LinearGradient
                    colors={[
                      subjectColorMap.get(cls.subject) || '#6C757D',
                      `${subjectColorMap.get(cls.subject) || '#6C757D'}80`
                    ]}
                    style={styles.classGradient}
                  >
                    <View style={styles.classHeader}>
                      <Text style={styles.className}>{cls.subject}</Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteClass(selectedDay, cls)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.classTime}>{`${cls.startTime} - ${cls.endTime}`}</Text>
                  </LinearGradient>
                </View>
              ))}
              <View style={styles.emptySlot} />
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    marginLeft: 8,
  },
  addButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  daysRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  dayButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
  },
  selectedDayButton: {
    backgroundColor: '#007AFF',
  },
  dayText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  scheduleContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    height: 64,
  },
  timeText: {
    width: 48,
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  classSlot: {
    flex: 1,
    height: 64,
    position: 'relative',
  },
  classCard: {
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 48,
  },
  classGradient: {
    padding: 16,
    height: '100%',
    justifyContent: 'center',
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  classTime: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 2,
  },
  emptySlot: {
    flex: 1,
    height: '100%',
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
}); 