import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL, HOST_URL } from '@/config/api';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Header } from '@/components/Header';
import { format, addDays, startOfWeek } from 'date-fns';

interface BaseEvent {
  startTime: string;
  endTime: string;
}

interface Class extends BaseEvent {
  subject: string;
}

interface Event extends BaseEvent {
  title: string;
  subject: string;
  reminder?: boolean;
}

interface Events {
  [date: string]: Event[];
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
  events?: Events;
}

interface Grade {
  number: number;
  name: string;
}

interface Plan {
  id: number;
  title: string;
  description: string;
  created_at: string;
  status: 'pending' | 'completed';
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const CLASS_TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'
];

const STUDY_TIME_SLOTS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

const COLORS = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Sky Blue
  '#96CEB4', // Sage Green
  '#D4A5A5', // Dusty Rose
  '#9B5DE5', // Purple
  '#F15BB5', // Pink
  '#00BBF9', // Bright Blue
  '#00F5D4', // Mint
  '#8338EC', // Deep Purple
  '#3A86FF', // Royal Blue
  '#FB5607', // Orange
  '#FF006E', // Hot Pink
  '#38B000', // Green
  '#7209B7', // Deep Purple
  '#F72585', // Magenta
  '#4CC9F0', // Light Blue
  '#FF4D6D', // Bright Pink
  '#4361EE', // Electric Blue
];

const HEIGHT_PER_HOUR = 110; // Time slot height in pixels

// Color palette for light and dark modes
const COLORS_LIGHT = {
  background: '#FFFFFF',
  surface: '#F1F3F5',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E1E3E5',
  cardBackground: '#FFFFFF',
};

const COLORS_DARK = {
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  border: '#2D2D2D',
  cardBackground: '#1E1E1E',
};

// Function to get current day name in lowercase
function getCurrentDay(): string {
  const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
  // Convert Sunday (0) to 6 to match our DAYS array (where Monday is 0)
  const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
  // If it's weekend, default to Monday (0)
  return DAYS[adjustedIndex > 4 ? 0 : adjustedIndex];
}

type ViewMode = 'timetable' | 'planning';


const getEventColor = (subject: string | undefined) => {
  if (!subject) {
    return COLORS[0];
  }
  // Generate a consistent random color based on the subject name
  const hash = subject.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
};

const WEEKS_TO_LOAD = 4; // Number of weeks to load at a time

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
  const [viewMode, setViewMode] = useState<ViewMode>('timetable');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [events, setEvents] = useState<Events>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [visibleDates, setVisibleDates] = useState<Date[]>([]);
  const [weeksLoaded, setWeeksLoaded] = useState(WEEKS_TO_LOAD);
  const scrollViewRef = useRef<ScrollView>(null);
  const timeSlotsScrollViewRef = useRef<ScrollView>(null);
  const timetableScrollViewRef = useRef<ScrollView>(null);

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

  const fetchEvents = async () => {
    if (!user?.uid) return;

    try {
      const response = await fetch(`${API_BASE_URL}/learner?uid=${user.uid}`);
      const data = await response.json();
      setEvents(data.events || {});
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);


  useEffect(() => {
    if (viewMode === 'planning') {
      fetchEvents();
    }
  }, [viewMode]);

  useFocusEffect(
    useCallback(() => {
      fetchTimetable();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (viewMode === 'planning') {
        fetchEvents();
      }
    }, [viewMode])
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
    const baseHour = Math.floor(hour);
    // Calculate offset within the hour's slot
    return (minute / 60) * HEIGHT_PER_HOUR;
  };

  const calculateHeight = (startTime: string, endTime: string) => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // Calculate total minutes from start to end
    const totalStartMinutes = startHour * 60 + startMinute;
    const totalEndMinutes = endHour * 60 + endMinute;
    const durationMinutes = totalEndMinutes - totalStartMinutes;

    // Convert minutes to height (90px per hour = 1.5px per minute)
    return Math.max(60, (durationMinutes * HEIGHT_PER_HOUR) / 60);
  };

  const deleteClass = async (day: string, item: Class | Event) => {
    if (!user?.uid) return;

    try {
      if ('subject' in item) {
        // Handle class deletion
        const getResponse = await fetch(`${API_BASE_URL}/learner?uid=${user.uid}`);
        const currentData = await getResponse.json();
        const currentTimetable = currentData.timetable || {};

        const updatedClasses = currentTimetable[day].filter(
          (cls: Class) =>
            cls.subject !== item.subject ||
            cls.startTime !== item.startTime ||
            cls.endTime !== item.endTime
        );

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
        } else {
          throw new Error(data.message || 'Failed to delete class');
        }
      } else {
        // Handle event deletion using the same PUT endpoint as adding events
        const getResponse = await fetch(`${API_BASE_URL}/learner?uid=${user.uid}`);
        const currentData = await getResponse.json();
        const currentEvents = currentData.events || {};

        // Filter out the event to be deleted
        const updatedEvents = {
          ...currentEvents,
          [day]: currentEvents[day]?.filter(
            (e: Event) =>
              e.title !== (item as Event).title ||
              e.startTime !== (item as Event).startTime ||
              e.endTime !== (item as Event).endTime
          ) || []
        };

        // Update events using PUT
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
          setEvents(updatedEvents);
        } else {
          throw new Error(data.message || 'Failed to delete event');
        }
      }

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Event deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete event',
      });
    }
  };

  const handleDeleteClass = (day: string, item: Class | Event) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete ${('subject' in item && !('title' in item)) ? item.subject : (item as Event).title} event?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteClass(day, item),
        },
      ]
    );
  };

  // Function to load more weeks
  const loadMoreWeeks = useCallback(() => {
    const currentLastDate = visibleDates[visibleDates.length - 1];
    if (!currentLastDate) return;

    const newDates = Array.from({ length: 7 * WEEKS_TO_LOAD }, (_, index) => {
      return addDays(currentLastDate, index + 1);
    });

    setVisibleDates(prev => [...prev, ...newDates]);
    setWeeksLoaded(prev => prev + WEEKS_TO_LOAD);
  }, [visibleDates]);

  // Initialize visible dates
  useEffect(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const initialDates = Array.from({ length: 7 * WEEKS_TO_LOAD }, (_, i) =>
      addDays(start, i)
    );
    setVisibleDates(initialDates);
  }, []);

  // Handle scroll to end
  const handleScrollEnd = ({ nativeEvent }: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToRight = 20;
    const isCloseToRight = layoutMeasurement.width + contentOffset.x >= contentSize.width - paddingToRight;

    if (isCloseToRight) {
      loadMoreWeeks();
    }
  };

  const handleAddEvent = () => {
    if (viewMode === 'planning') {
      router.push({
        pathname: '/modals/add-event',
        params: { date: format(selectedDate, 'yyyy-MM-dd') }
      });
    } else {
      handleAddClass();
    }
  };

  const renderEventContent = (event: Event | Class) => {
    const isClass = 'subject' in event && !('title' in event);
    const title = isClass ? event.subject : (event as Event).title;
    const subject = isClass ? event.subject : (event as Event).subject;
    const color = isClass
      ? (subjectColorMap.get(event.subject) || COLORS[Math.floor(Math.random() * COLORS.length)])
      : COLORS[Math.floor(Math.random() * COLORS.length)];

    return (
      <View
        style={[
          styles.classContent,
          { backgroundColor: color }
        ]}
      >
        <View style={styles.classHeader}>
          <View>
            <View style={styles.titleContainer}>
              <Text style={styles.className}>{title}</Text>
              {!isClass && (event as Event).reminder && (
                <View style={styles.reminderIndicator}>
                  <Ionicons name="notifications" size={14} color="#fff" />
                </View>
              )}
            </View>
            {!isClass && subject && (
              <Text style={[styles.classTime, { marginTop: 4 }]}>
                {subject}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteClass(isClass ? selectedDay : format(selectedDate, 'yyyy-MM-dd'), event)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.classTime}>{`${event.startTime} - ${event.endTime}`}</Text>
      </View>
    );
  };

  // Function to scroll to current hour
  const scrollToCurrentHour = useCallback(() => {
    const now = new Date();
    const currentHour = now.getHours() - 1;
    const currentTime = `${String(currentHour).padStart(2, '0')}:00`;
    const isCurrentDate = format(selectedDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');

    if (!isCurrentDate) return;

    const scrollView = viewMode === 'planning' ? timeSlotsScrollViewRef.current : timetableScrollViewRef.current;
    const timeSlots = viewMode === 'planning' ? STUDY_TIME_SLOTS : CLASS_TIME_SLOTS;

    if (scrollView) {
      const contextHours = 1; // Show 1 hour before current time
      const scrollPosition = Math.max(0, (timeSlots.indexOf(currentTime) - contextHours)) * HEIGHT_PER_HOUR;

      setTimeout(() => {
        scrollView.scrollTo({ y: scrollPosition, animated: true });
      }, 300);
    }
  }, [selectedDate, viewMode]);

  // Handle tab focus
  useFocusEffect(
    useCallback(() => {
      scrollToCurrentHour();
    }, [scrollToCurrentHour])
  );

  // Handle day selection
  useEffect(() => {
    scrollToCurrentHour();
  }, [selectedDay, selectedDate, viewMode, scrollToCurrentHour]);

  // Initial scroll on mount
  useEffect(() => {
    const timer = setTimeout(scrollToCurrentHour, 500);
    return () => clearTimeout(timer);
  }, []);

  const renderTimetableView = () => {
    const classesForSelectedDay = getClassesForDay(selectedDay);

    return (
      <>
        <View style={styles.daysRow}>
          {DAYS.slice(0, 5).map((day) => (
            <TouchableOpacity
              key={day}
              onPress={() => setSelectedDay(day)}
              style={[
                styles.timetableDayButton,
                selectedDay === day && styles.timetableSelectedDayButton,
                { backgroundColor: colorScheme === 'dark' ? COLORS_DARK.surface : COLORS_LIGHT.surface }
              ]}
            >
              {selectedDay === day && (
                <LinearGradient
                  colors={['#007AFF', '#0051B3']}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}
              <Text
                style={[
                  styles.timetableDayText,
                  selectedDay === day && styles.timetableSelectedDayText,
                  { color: selectedDay === day ? '#FFFFFF' : (colorScheme === 'dark' ? COLORS_DARK.textSecondary : COLORS_LIGHT.textSecondary) }
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

        {classesForSelectedDay.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Text style={[
              styles.emptyStateText,
              { color: colorScheme === 'dark' ? COLORS_DARK.textSecondary : COLORS_LIGHT.textSecondary }
            ]}>
              No classes scheduled for this day
            </Text>
          </View>
        ) : (
          <ScrollView
            ref={timetableScrollViewRef}
            style={styles.scheduleContainer}
          >
            {CLASS_TIME_SLOTS.map((time) => (
              <View key={time} style={styles.timeSlot}>
                <Text style={[
                  styles.timeText,
                  { color: colorScheme === 'dark' ? COLORS_DARK.textSecondary : COLORS_LIGHT.textSecondary }
                ]}>
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
                      {renderEventContent(cls as Class)}
                    </View>
                  ))}

                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </>
    );
  };

  const renderPlanningView = () => {
    const weekDays = visibleDates;
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
    const todayEvents = events[selectedDateStr] || [];

    return (
      <View style={styles.planningContainer}>
        <View style={styles.calendarSection}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.weekContainer}
            contentContainerStyle={styles.weekContent}
            onScroll={handleScrollEnd}
            scrollEventThrottle={400}
          >
            {weekDays.map((date) => {
              const isSelected = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const dateStr = format(date, 'yyyy-MM-dd');
              const hasEvents = events[dateStr]?.length > 0;

              return (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={[
                    styles.planningDayButton,
                    isSelected && styles.planningSelectedDayButton,
                    { backgroundColor: colorScheme === 'dark' ? COLORS_DARK.surface : COLORS_LIGHT.surface }
                  ]}
                  onPress={() => setSelectedDate(date)}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={['#007AFF', '#0051B3']}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  <Text style={[
                    styles.monthName,
                    { color: isSelected ? '#FFFFFF' : (colorScheme === 'dark' ? COLORS_DARK.text : COLORS_LIGHT.text) }
                  ]}>
                    {format(date, 'MMM')}
                  </Text>
                  <Text style={[
                    styles.dayName,
                    { color: isSelected ? '#FFFFFF' : (colorScheme === 'dark' ? COLORS_DARK.text : COLORS_LIGHT.text) }
                  ]}>
                    {format(date, 'EEE')}
                  </Text>
                  <View style={styles.dayNumberContainer}>
                    <Text style={[
                      styles.dayNumber,
                      isToday && styles.todayNumber,
                      { color: isSelected ? '#FFFFFF' : (colorScheme === 'dark' ? COLORS_DARK.text : COLORS_LIGHT.text) }
                    ]}>
                      {format(date, 'd')}
                    </Text>
                    {hasEvents && (
                      <View style={[
                        styles.eventDot,
                        { backgroundColor: isSelected ? '#FFFFFF' : '#007AFF' }
                      ]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[
                styles.loadMoreButton,
                { backgroundColor: colorScheme === 'dark' ? COLORS_DARK.surface : COLORS_LIGHT.surface }
              ]}
              onPress={loadMoreWeeks}
            >
              <View style={styles.loadMoreContent}>
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color={colorScheme === 'dark' ? COLORS_DARK.text : COLORS_LIGHT.text}
                />
                <Text style={[
                  styles.loadMoreText,
                  { color: colorScheme === 'dark' ? COLORS_DARK.text : COLORS_LIGHT.text }
                ]}>
                  Load More
                </Text>
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.eventsSection}>
          {isLoadingEvents ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : todayEvents.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={[
                styles.emptyStateText,
                { color: colorScheme === 'dark' ? COLORS_DARK.textSecondary : COLORS_LIGHT.textSecondary }
              ]}>
                No study plan & exams scheduled for today
              </Text>
            </View>
          ) : (
            <ScrollView
              ref={timeSlotsScrollViewRef}
              style={styles.scheduleContainer}
            >
              {STUDY_TIME_SLOTS.map((time, index) => (
                <View
                  key={time}
                  style={styles.timeSlot}
                >
                  <Text style={[
                    styles.timeText,
                    { color: colorScheme === 'dark' ? COLORS_DARK.textSecondary : COLORS_LIGHT.textSecondary }
                  ]}>
                    {time}
                  </Text>
                  <View style={styles.classSlot}>
                    {todayEvents.filter(event => {
                      const [slotHour] = time.split(':');
                      const [startHour] = event.startTime.split(':');
                      return slotHour === startHour;
                    }).map((event) => (
                      <View
                        key={`${event.title}-${event.startTime}`}
                        style={[
                          styles.classCard,
                          {
                            position: 'absolute',
                            top: calculateTopOffset(event.startTime),
                            height: calculateHeight(event.startTime, event.endTime),
                            left: 0,
                            right: 0,
                            zIndex: 1
                          }
                        ]}
                      >
                        {renderEventContent(event)}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[
        styles.title,
        { color: colorScheme === 'dark' ? COLORS_DARK.text : COLORS_LIGHT.text }
      ]}>
        {viewMode === 'timetable' ? '📅 My Classes' : '📅 Study Plan & Exams'}
      </Text>
      <TouchableOpacity
        onPress={handleAddEvent}
        style={styles.addButton}
        activeOpacity={0.7}
      >
        <View style={styles.addButtonInner}>
          <Ionicons name="add" size={28} color="#fff" />
        </View>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[
      styles.container,
      { backgroundColor: colorScheme === 'dark' ? COLORS_DARK.background : COLORS_LIGHT.background }
    ]}>
      <Header learnerInfo={learnerInfo} />
      {renderHeader()}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            viewMode === 'timetable' && styles.selectedTabButton,
            { backgroundColor: colorScheme === 'dark' ? COLORS_DARK.surface : COLORS_LIGHT.surface }
          ]}
          onPress={() => setViewMode('timetable')}
        >
          <View style={styles.tabContent}>
            <View style={styles.tabIconContainer}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={viewMode === 'timetable' ? '#007AFF' : (colorScheme === 'dark' ? COLORS_DARK.text : COLORS_LIGHT.text)}
              />
            </View>
            <View style={styles.tabTextContainer}>
              <Text style={[
                styles.tabTitle,
                { color: colorScheme === 'dark' ? COLORS_DARK.text : COLORS_LIGHT.text }
              ]}>
                Class Timetable
              </Text>
              <Text style={[
                styles.tabDescription,
                { color: colorScheme === 'dark' ? COLORS_DARK.textSecondary : COLORS_LIGHT.textSecondary }
              ]}>
                View your class schedule
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            viewMode === 'planning' && styles.selectedTabButton,
            { backgroundColor: colorScheme === 'dark' ? COLORS_DARK.surface : COLORS_LIGHT.surface }
          ]}
          onPress={() => setViewMode('planning')}
        >
          <View style={styles.tabContent}>
            <View style={styles.tabIconContainer}>
              <Ionicons
                name="book-outline"
                size={24}
                color={viewMode === 'planning' ? '#007AFF' : (colorScheme === 'dark' ? COLORS_DARK.text : COLORS_LIGHT.text)}
              />
            </View>
            <View style={styles.tabTextContainer}>
              <Text style={[
                styles.tabTitle,
                { color: colorScheme === 'dark' ? COLORS_DARK.text : COLORS_LIGHT.text }
              ]}>
                Planning
              </Text>
              <Text style={[
                styles.tabDescription,
                { color: colorScheme === 'dark' ? COLORS_DARK.textSecondary : COLORS_LIGHT.textSecondary }
              ]}>
                Study Plans, Reminders & Exams
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {viewMode === 'timetable' ? renderTimetableView() : renderPlanningView()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
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
    gap: 8,
  },
  timetableDayButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  timetableSelectedDayButton: {
    backgroundColor: '#007AFF',
  },
  timetableDayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  timetableSelectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  scheduleContainer: {
    flex: 1,
    minHeight: 0,
  },
  scheduleContent: {
    paddingHorizontal: 16,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: 90,
    marginBottom: 16,
  },
  timeText: {
    width: 48,
    fontSize: 14,
    marginRight: 12,
    marginTop: 4,
  },
  classSlot: {
    flex: 1,
    height: 90,
    position: 'relative',
  },
  classCard: {
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 60,
    marginHorizontal: 4,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1,
  },
  classContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    height: '100%',
    justifyContent: 'center',
    borderRadius: 12,
    marginTop: 8,
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
    borderRadius: 12,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  deleteButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedTabButton: {
    borderColor: '#007AFF',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tabIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabTextContainer: {
    flex: 1,
  },
  tabTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tabDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
  planningContainer: {
    flex: 1,
    paddingTop: 8,
  },
  calendarSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  eventsSection: {
    flex: 1,
  },
  weekContainer: {
    flexGrow: 0,
  },
  weekContent: {
    paddingRight: 8,
    gap: 8,
  },
  planningDayButton: {
    width: 64,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    padding: 8,
  },
  planningSelectedDayButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  monthName: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  dayNumberContainer: {
    alignItems: 'center',
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: '600',
  },
  todayNumber: {
    color: '#007AFF',
    fontWeight: '700',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.7,
  },
  loadMoreButton: {
    width: 64,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    padding: 8,
    marginLeft: 8,
  },
  loadMoreContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reminderIndicator: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
});