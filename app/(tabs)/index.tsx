import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView, Image, Platform, Modal, Linking, Share, ActivityIndicator, Switch, AppState } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { analytics } from '../../services/analytics';
import { useTheme } from '@/contexts/ThemeContext';
import { registerForPushNotificationsAsync } from '@/services/notifications';
import { updatePushToken, updateVersion } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Toast from 'react-native-toast-message';
import * as Updates from 'expo-updates';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { ThemedText } from '../../components/ThemedText';
import { fetchMySubjects, getLearner, getRandomAIQuestion, getTodos } from '../../services/api';
import { Subject, RandomAIQuestion } from '../../types/api';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';
import { getMessages, Message } from '@/services/api';
import { MessageModal } from '@/components/MessageModal';

// Temporary mock data


// Add a helper function to get progress bar color
function getProgressBarColor(progress: number): string {
  if (progress >= 70) return '#22C55E'; // Green for high scores
  if (progress >= 40) return '#F59E0B'; // Amber for medium scores
  return '#FF3B30'; // Red for low scores
}

// Move RatingModal outside of HomeScreen
interface RatingModalProps {
  visible: boolean;
  rating: number;
  onRate: (rating: number) => void;
  onSubmit: () => void;
  onDismiss: () => void;
  testID?: string;
}

const RatingModal = ({ visible, rating, onRate, onSubmit, onDismiss, testID }: RatingModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      testID={testID}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.ratingContainer}>
          <ThemedText style={styles.ratingTitle}>
            How Would You Rate Our App Experience?
          </ThemedText>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => onRate(star)}
                activeOpacity={0.7}
              >
                <ThemedText style={[styles.star]}>
                  {star <= rating ? '★' : '☆'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[
              styles.submitButton,
              rating === 0 && styles.submitButtonDisabled
            ]}
            onPress={onSubmit}
            disabled={rating === 0}
          >
            <ThemedText style={styles.submitButtonText}>Submit Rating</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
          >
            <ThemedText style={styles.dismissButtonText}>Maybe Later</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

interface LearnerGrade {
  id: number;
  active: number;
  number: number;
}

interface LearnerInfo {
  id: number;
  uid: string;
  grade: LearnerGrade;
  score: number;
  name: string;
  notification_hour: number;
  role: string;
  created: string;
  lastSeen: string;
  school_address: string;
  school_name: string;
  school_latitude: number;
  school_longitude: number;
  terms: string;
  curriculum: string;
  private_school: boolean;
  email: string;
  rating: number;
  rating_cancelled?: string;
  points: number;
  streak: number;
  avatar: string;
}

interface RandomAIQuestionResponse {
  status: string;
  question: {
    id: number;
    question: string;
    ai_explanation: string;
    subject: {
      id: number;
      name: string;
    };
  };
}

interface Todo {
  id: number;
  title: string;
  due_date: string;
  status: string;
  subject_name?: string;
}

// Add SettingsModal component before HomeScreen
interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

const SettingsModal = ({ visible, onClose, onOpenSettings }: SettingsModalProps) => {
  const { colors, isDark } = useTheme();
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.settingsModalContainer, { 
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderColor: colors.border
        }]}>
          <ThemedText style={[styles.settingsModalTitle, { color: colors.text }]}>
            🔔 Enable Notifications
          </ThemedText>
          <ThemedText style={[styles.settingsModalText, { color: colors.textSecondary }]}>
            To receive notifications about new questions and updates, please enable notifications in your device settings.
          </ThemedText>
          <View style={styles.settingsModalButtons}>
            <TouchableOpacity
              style={[styles.settingsModalButton, { backgroundColor: colors.primary }]}
              onPress={onOpenSettings}
            >
              <ThemedText style={styles.settingsModalButtonText}>Open Settings</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingsModalButton, { backgroundColor: isDark ? colors.surface : '#F3F4F6' }]}
              onPress={onClose}
            >
              <ThemedText style={[styles.settingsModalButtonText, { color: colors.text }]}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [learnerInfo, setLearnerInfo] = useState<LearnerInfo | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hiddenSubjects, setHiddenSubjects] = useState<string[]>([]);
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const [randomLesson, setRandomLesson] = useState<RandomAIQuestion | null>(null);
  const insets = useSafeAreaInsets();
  const [streak] = useState(0);
  const [ranking] = useState(0);
  const { colors, isDark } = useTheme();
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoadingTodos, setIsLoadingTodos] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Add version check function
  const checkVersion = useCallback(async () => {
    try {
      if (!user?.uid) return;

      // Get last check time from storage
      const lastCheck = await AsyncStorage.getItem('lastVersionCheck');
      const now = new Date().getTime();
      
      // Check if we need to check version (once per day)
      if (lastCheck) {
        const lastCheckTime = parseInt(lastCheck);
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        if (now - lastCheckTime < oneDay) {
          return; // Skip if less than 24 hours since last check
        }
      }

      // Get current version and OS info
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      console.log('Current version:', currentVersion);
      const currentOS = Platform.OS === 'ios' ? 'iOS' : 'Android';
      console.log('Current OS:', currentOS);
      // Get stored version and OS
      const storedVersion = await AsyncStorage.getItem('appVersion');
      console.log('Stored version:', storedVersion);
      const storedOS = await AsyncStorage.getItem('appOS');
      console.log('Stored OS:', storedOS);

      // Check if version or OS has changed
      if (storedVersion !== currentVersion || storedOS !== currentOS) {
        try {
          // Call update API
          const response = await updateVersion(user.uid, currentVersion, currentOS);
          
          if (response.success) {
            // Update stored version and OS
            await AsyncStorage.setItem('appVersion', currentVersion);
            await AsyncStorage.setItem('appOS', currentOS);
            
            // Track the event
            await analytics.track('app_version_updated', {
              user_id: user.uid,
              version: currentVersion,
              os: currentOS
            });
          }
        } catch (error) {
          console.error('Error updating version:', error);
        }
      }

      // Update last check time
      await AsyncStorage.setItem('lastVersionCheck', now.toString());
    } catch (error) {
      console.error('Error in version check:', error);
    }
  }, [user?.uid]);

  // Add version check on mount
  useEffect(() => {
    checkVersion();
  }, [checkVersion]);

  // Load hidden subjects from storage
  useEffect(() => {
    async function loadHiddenSubjects() {
      try {
        const stored = await AsyncStorage.getItem('hiddenSubjects');
        if (stored) {
          setHiddenSubjects(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading hidden subjects:', error);
      }
    }
    loadHiddenSubjects();
  }, []);

  // Extract learner fetching logic into a separate function
  const fetchLearnerData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      const learner = await getLearner(user.uid);

      //save learner name in AsyncStorage
      await AsyncStorage.setItem('learnerName', learner.name);
      await AsyncStorage.setItem('learnerGrade', learner.grade.number.toString());
      await AsyncStorage.setItem('learnerAvatar', learner.avatar + ".png");
      await AsyncStorage.setItem('userUID', user.uid);

      if (learner.name && learner.grade) {
        setLearnerInfo({
          ...learner,
          score: 0,
          notification_hour: 0,
          role: learner.role || 'learner',
          created: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          private_school: false,
          rating: 0,
          points: learner.points || 0,
          streak: learner.streak || 0
        });

        // Always fetch subjects on load
        console.log('Fetching subjects');
        const enrolledResponse = await fetchMySubjects(user.uid);
        if (enrolledResponse?.subjects && Array.isArray(enrolledResponse.subjects)) {
          const subjectGroups = enrolledResponse.subjects.reduce((acc: Record<string, Subject>, curr) => {
            if (!curr?.name) return acc;

            const baseName = curr.name.split(' P')[0];

            if (!acc[baseName]) {
              acc[baseName] = {
                id: curr.id.toString(),
                name: baseName,
                total_questions: curr.totalSubjectQuestions || 0,
                answered_questions: curr.totalResults || 0,
                correct_answers: curr.correctAnswers || 0
              };
            } else {
              acc[baseName].total_questions += curr.totalSubjectQuestions || 0;
              acc[baseName].answered_questions += curr.totalResults || 0;
              acc[baseName].correct_answers += curr.correctAnswers || 0;
            }

            return acc;
          }, {});

          const groupedSubjects = Object.values(subjectGroups);
          setMySubjects(groupedSubjects);
        } else {
          setMySubjects([]);
        }
      } else {
        signOut();
      }
    } catch (error) {
      signOut();
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, signOut]);

  // Initial data load
  useEffect(() => {
    fetchLearnerData();
  }, [fetchLearnerData]);

  // Fetch learner data when tab is focused
  useFocusEffect(
    useCallback(() => {
      fetchLearnerData();
    }, [fetchLearnerData])
  );

  // Check for new answers on focus
  useFocusEffect(
    useCallback(() => {
      async function checkForNewAnswers() {
        if (!user?.uid) return;

        const hasNewAnswers = await AsyncStorage.getItem('hasNewAnswers');
        if (hasNewAnswers === 'true') {
          try {
            const enrolledResponse = await fetchMySubjects(user.uid);
            if (enrolledResponse?.subjects && Array.isArray(enrolledResponse.subjects)) {
              const subjectGroups = enrolledResponse.subjects.reduce((acc: Record<string, Subject>, curr) => {
                if (!curr?.name) return acc;

                const baseName = curr.name.split(' P')[0];

                if (!acc[baseName]) {
                  acc[baseName] = {
                    id: curr.id.toString(),
                    name: baseName,
                    total_questions: curr.totalSubjectQuestions || 0,
                    answered_questions: curr.totalResults || 0,
                    correct_answers: curr.correctAnswers || 0
                  };
                } else {
                  acc[baseName].total_questions += curr.totalSubjectQuestions || 0;
                  acc[baseName].answered_questions += curr.totalResults || 0;
                  acc[baseName].correct_answers += curr.correctAnswers || 0;
                }

                return acc;
              }, {});

              const groupedSubjects = Object.values(subjectGroups);
              setMySubjects(groupedSubjects);
              
              // Clear the flag after refreshing
              await AsyncStorage.removeItem('hasNewAnswers');
            }
          } catch (error) {
            console.error('Error refreshing subjects:', error);
          }
        }
      }

      checkForNewAnswers();
    }, [user?.uid])
  );

  // Function to toggle subject visibility
  const toggleSubjectVisibility = useCallback(async (subjectId: string) => {
    try {
      const newHiddenSubjects = hiddenSubjects.includes(subjectId)
        ? hiddenSubjects.filter(id => id !== subjectId)
        : [...hiddenSubjects, subjectId];

      setHiddenSubjects(newHiddenSubjects);
      await AsyncStorage.setItem('hiddenSubjects', JSON.stringify(newHiddenSubjects));

      // Track the event
      if (user?.uid) {
        await analytics.track('toggle_subject_visibility', {
          user_id: user.uid,
          subject_id: subjectId,
          is_hidden: !hiddenSubjects.includes(subjectId)
        });
      }
    } catch (error) {
      console.error('Error toggling subject visibility:', error);
    }
  }, [hiddenSubjects, user?.uid]);

  // Function to toggle showing all subjects
  const toggleShowAllSubjects = useCallback(() => {
    setShowAllSubjects(prev => !prev);
    if (user?.uid) {
      analytics.track('toggle_show_all_subjects', {
        user_id: user.uid,
        show_all: !showAllSubjects
      });
    }
  }, [showAllSubjects, user?.uid]);

  // Single useEffect for all analytics logging
  useEffect(() => {
    async function logEvents() {
      try {
        if (!user?.uid) return;

        // Identify user in Mixpanel
        await analytics.track('identify', {
          distinct_id: user.uid,
          name: learnerInfo?.name,
          grade: learnerInfo?.grade,
          school: learnerInfo?.school_name,
          role: learnerInfo?.role
        });

        // Log screen view
        await analytics.track('screen_view', {
          screen_name: 'home',
          user_id: user.uid
        });

        // Log stats
        await analytics.track('view_stats', {
          user_id: user.uid,
          ranking,
          streak
        });
      } catch (error) {
        console.log('Error in analytics useEffect:', error);
      }
    }
    logEvents();
  }, [user?.uid, ranking, streak, learnerInfo]);

  // Handle error and signout
  const handleError = useCallback(async () => {
    setShowErrorModal(true);
    const timer = setTimeout(() => {
      setShowErrorModal(false);

    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Add this function to fetch random lesson
  const fetchRandomLesson = async () => {
    if (!user?.uid) return;
    try {
      const response = await getRandomAIQuestion(user.uid);
      if (response.status === "OK" && response.question) {
        setRandomLesson(response);
        //console.log('Random lesson:', response.question.ai_explanation);
      } else {
        console.log('No random lesson available');
        setRandomLesson(null);
      }
    } catch (error) {
      console.error('Error fetching random lesson:', error);
      setRandomLesson(null);
    }
  };

  // Handle share with analytics
  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: 'Check out Exam Quiz - Your ultimate study companion! https://examquiz.co.za',
        title: 'Share Exam Quiz'
      });

      if (user?.uid) {
        await analytics.track('share_app', {
          user_id: user.uid,
          platform: Platform.OS
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }, [user?.uid]);

  // Rating handlers with analytics
  const handleSubmitRating = useCallback(async () => {
    try {
      if (rating >= 4) {
        await Linking.openURL('https://play.google.com/store/apps/details?id=com.examquiz.app');
        if (user?.uid) {
          await analytics.track('submit_rating', {
            user_id: user.uid,
            rating
          });
        }
      }
      setShowRatingModal(false);
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  }, [rating, user?.uid]);

  const handleDismissRating = useCallback(async () => {
    try {
      if (user?.uid) {
        await analytics.track('dismiss_rating', {
          user_id: user.uid
        });
      }
      setShowRatingModal(false);
    } catch (error) {
      console.error('Error dismissing rating:', error);
    }
  }, [user?.uid]);

  // Update the router.push call in the subject card
  const handleSubjectPress = useCallback((subject: Subject) => {
    if (user?.uid && learnerInfo) {
      analytics.track('select_subject', {
        user_id: user.uid,
        subject_name: subject.name,
        subject_id: subject.id,
        total_questions: subject.total_questions,
        answered_questions: subject.answered_questions,
        mastery_percentage: subject.answered_questions === 0 ? 0 :
          Math.round((subject.correct_answers / subject.answered_questions) * 100)
      });

      router.push({
        pathname: '/quiz',
        params: {
          subjectName: subject.name,
          learnerName: learnerInfo.name,
          learnerGrade: learnerInfo.grade.number.toString(),
          learnerSchool: learnerInfo.school_name,
          learnerRole: learnerInfo.role
        }
      });
    }
  }, [user?.uid, learnerInfo]);

  useEffect(() => {
    // Request notification permissions when the home screen loads
    registerForPushNotificationsAsync().then(token => {
      if (token && user?.uid) {
        console.log('Push notification token:', token);
        updatePushToken(user.uid, token).catch(error => {
          console.error('Failed to update push token:', error);
        });
      } else {
        console.log("Push notification token not found or user not logged in");
      }
    });
  }, [user?.uid]);

  // Add this useEffect to fetch todos
  useEffect(() => {
    async function fetchTodos() {
      if (!user?.uid) return;
      try {
        setIsLoadingTodos(true);
        const fetchedTodos = await getTodos(user.uid);
        console.log('Fetched todos:', fetchedTodos);
        // Filter todos due in the next 3 days
        const now = new Date();
        const threeDaysFromNow = new Date(now);
        threeDaysFromNow.setDate(now.getDate() + 3);
        
        const upcomingTodos = fetchedTodos.filter(todo => {
          const dueDate = new Date(todo.due_date);
          return dueDate <= threeDaysFromNow && todo.status === 'pending';
        });
        
        setTodos(upcomingTodos);
      } catch (error) {
        console.error('Error fetching todos:', error);
      } finally {
        setIsLoadingTodos(false);
      }
    }
    fetchTodos();
  }, [user?.uid]);

  // Function to check and show messages
  const checkMessages = useCallback(async () => {
    try {
      // Get last check time from storage
      
      const lastCheck = await AsyncStorage.getItem('lastMessageCheck');
      const now = new Date().getTime();
      
      // Check if we need to check messages (once per day)
      if (lastCheck) {
        const lastCheckTime = parseInt(lastCheck);
        const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        if (now - lastCheckTime < oneDay) {
          console.log('Less than 24 hours since last check');
          return; // Skip if less than 24 hours since last check
        }
      }

      // Get shown message IDs from storage
      const shownMessageIds = await AsyncStorage.getItem('shownMessageIds');
      const shownIds = shownMessageIds ? JSON.parse(shownMessageIds) : [];

      // Fetch messages
      const response = await getMessages();
      console.log('Messages:', response);
      if (response.success && response.data.length > 0) {
        // Find first unshown message
        const unshownMessage = response.data.find(msg => !shownIds.includes(msg.id));
        
        if (unshownMessage) {
          setCurrentMessage(unshownMessage);
          setShowMessageModal(true);
          
          // Update shown message IDs
          const newShownIds = [...shownIds, unshownMessage.id];
          await AsyncStorage.setItem('shownMessageIds', JSON.stringify(newShownIds));
        }
      }

      // Update last check time
      await AsyncStorage.setItem('lastMessageCheck', now.toString());
    } catch (error) {
      console.error('Error checking messages:', error);
    }
  }, []);

  // Check messages on mount
  useEffect(() => {
    checkMessages();
  }, [checkMessages]);

  // Add AppState listener for checking permissions when app becomes active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        const { status } = await Notifications.getPermissionsAsync();
        setNotificationsEnabled(status === 'granted');
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Add notification toggle handler
  const toggleNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        if (existingStatus === 'denied') {
          setShowSettingsModal(true);
          return;
        }
        
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus === 'granted') {
        const token = await registerForPushNotificationsAsync();
        
        if (token && user?.uid) {
          await updatePushToken(user.uid, token);
          setNotificationsEnabled(true);
          Toast.show({
            type: 'success',
            text1: 'Notifications enabled',
            text2: 'You will now receive updates about new questions and reminders',
            position: 'bottom'
          });
        }
      } else {
        setShowSettingsModal(true);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to enable notifications. Please try again.',
        position: 'bottom'
      });
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? colors.background : '#F3F4F6' }]}>
          <Header learnerInfo={null} />
          <View style={[styles.loadingContainer, { backgroundColor: isDark ? colors.background : '#FFFFFF' }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText style={styles.loadingText}>Loading...</ThemedText>
          </View>
      </View>
  );
  }

  return (
    <LinearGradient
      colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
      style={[styles.gradient, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      testID="home-screen-gradient"
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        testID="home-screen-scroll-view"
      >
        <Header
          learnerInfo={learnerInfo ? {
            name: learnerInfo.name,
            grade: learnerInfo.grade.number.toString(),
            school: learnerInfo.school_name,
            avatar: learnerInfo.avatar
          } : null}
        />

        {/* Add Notification Settings Card - Only show when notifications are disabled */}
        {!notificationsEnabled && (
          <View style={[styles.sectionCard, {
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: colors.border
          }]}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>🔔 Enable Notifications</ThemedText>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  📚 Get notified about new questions, ⏰ daily reminders, and 📢 important updates
                </ThemedText>
              </View>
              <TouchableOpacity
                style={[styles.enableButton, { backgroundColor: colors.primary }]}
                onPress={toggleNotifications}
                testID="enable-notifications-button"
              >
                <ThemedText style={styles.enableButtonText}>Enable</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={[styles.statsContainer, {
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderColor: colors.border
        }]} testID="stats-container">
          <View style={styles.statsRow} testID="stats-row">
            <View style={styles.statItem} testID="ranking-stat">
              <View style={styles.statContent}>
                <Image source={require('@/assets/images/points.png')} style={styles.statIcon} testID="ranking-icon" />
                <View style={styles.statTextContainer}>
                  <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]} testID="ranking-label">points</ThemedText>
                  <ThemedText style={[styles.statValue, { color: colors.primary }]} testID="ranking-value">{learnerInfo?.points}</ThemedText>
                </View>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.statItem} testID="streak-stat">
              <View style={styles.statContent}>
                <Image source={require('@/assets/images/streak.png')} style={styles.statIcon} testID="streak-icon" />
                <View style={styles.statTextContainer}>
                  <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]} testID="streak-label">Streak</ThemedText>
                  <ThemedText style={[styles.statValue, { color: colors.primary }]} testID="streak-value">{learnerInfo?.streak}</ThemedText>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.reportButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (user?.uid && learnerInfo?.name) {
                router.push({
                  pathname: '/report/[uid]',
                  params: { uid: user.uid, name: learnerInfo.name }
                });
              }
            }}
            testID="view-report-button"
          >
            <Ionicons name="analytics" size={20} color="#FFFFFF" />
            <ThemedText style={styles.reportButtonText}>View My Report</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.shareContainer} testID="share-container">
          <TouchableOpacity
            style={[styles.shareButton, { backgroundColor: colors.primary }]}
            onPress={handleShare}
            testID="share-button"
          >
            <Ionicons name="share-social" size={24} color="#FFFFFF" />
            <ThemedText style={styles.shareButtonText} testID="share-button-text">
              Spread the fun, tell your friends!  📢
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Add Random Lesson Preview */}
        {randomLesson?.question && randomLesson.question.ai_explanation.includes('***Key Lesson') && (
          <View style={[styles.randomLessonContainer, {
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            marginHorizontal: 16
          }]}>
            <View style={styles.randomLessonHeader}>
              <View style={styles.subjectIconContainer}>
                <Image
                  source={getSubjectIcon(randomLesson.question.subject.name.split(' P')[0])}
                  style={styles.randomLessonIcon}
                />
              </View>
              <ThemedText style={[styles.randomLessonTitle, { color: colors.text }]}>
                Quick Bite: {randomLesson.question.subject.name}
              </ThemedText>
              <TouchableOpacity
                onPress={fetchRandomLesson}
                style={[{
                  marginLeft: 'auto',
                  padding: 10,
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  shadowColor: colors.text,
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }]}
                testID="refresh-quick-bite-button"
              >
                <Ionicons name="refresh" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ThemedText style={[styles.randomLessonContent, { color: colors.textSecondary }]}>
              {randomLesson.question.ai_explanation.split('***Key Lesson:')[1]?.trim().replace('***', '').trim()}
            </ThemedText>
          </View>
        )}

        {/* Add Tasks Section */}
        <View style={[styles.tasksContainer, {
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderColor: colors.border
        }]}>
          <View style={styles.tasksHeader}>
            <ThemedText style={[styles.tasksTitle, { color: colors.text }]}>
              📝 Tasks Due Soon
            </ThemedText>
           
          </View>
          {isLoadingTodos ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : todos.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <ThemedText style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No tasks due in the next 3 days
              </ThemedText>
            </View>
          ) : (
            <View style={styles.tasksList}>
              {todos.map((todo) => (
                <TouchableOpacity
                  key={todo.id}
                  style={[styles.taskItem, {
                    backgroundColor: isDark ? colors.surface : '#F8FAFC',
                    borderColor: colors.border
                  }]}
                  onPress={() => {
                    if (todo.subject_name) {
                      router.push({
                        pathname: '/quiz',
                        params: {
                          subjectName: todo.subject_name,
                          learnerName: learnerInfo?.name,
                          learnerGrade: learnerInfo?.grade.number.toString(),
                          learnerSchool: learnerInfo?.school_name,
                          learnerRole: learnerInfo?.role,
                          defaultTab: 'todo'
                        }
                      });
                    }
                  }}
                >
                  <View style={styles.taskContent}>
                    <ThemedText style={[styles.taskTitle, { color: colors.text }]}>
                      {todo.title}
                    </ThemedText>
                    {todo.subject_name && (
                      <ThemedText style={[styles.taskSubject, { color: colors.textSecondary }]}>
                        {todo.subject_name}
                      </ThemedText>
                    )}
                    <ThemedText style={[styles.taskDueDate, { color: colors.textSecondary }]}>
                      {(() => {
                        const today = new Date();
                        const dueDate = new Date(todo.due_date);
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        
                        if (dueDate.toDateString() === today.toDateString()) {
                          return 'Due today';
                        } else if (dueDate.toDateString() === tomorrow.toDateString()) {
                          return 'Due tomorrow';
                        } else {
                          return `Due ${dueDate.toLocaleDateString('en-US', { weekday: 'long' })}`;
                        }
                      })()}
                    </ThemedText>
                  </View>
                  {todo.subject_name && (
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <ThemedText style={[styles.sectionTitle, { color: colors.text }]} testID="subjects-section-title">🤸‍♂️ Learn, Play, and Grow!</ThemedText>

        <View style={styles.subjectsGrid} testID="subjects-grid">
          {(() => {
            return mySubjects
              .filter(subject => showAllSubjects || !hiddenSubjects.includes(subject.id))
              .map((subject) => {
                const isDisabled = subject.total_questions === 0;
                const isHidden = hiddenSubjects.includes(subject.id);
                return (
                  <TouchableOpacity
                    key={subject.id}
                    style={[
                      styles.subjectCard,
                      {
                        backgroundColor: isDark ? colors.card : '#FFFFFF',
                        borderColor: colors.border
                      },
                      isDisabled && [styles.disabledSubjectCard, {
                        backgroundColor: isDark ? colors.surface : '#F3F4F6',
                        borderColor: isDark ? colors.border : '#E5E7EB'
                      }],
                      isHidden && styles.hiddenSubjectCard
                    ]}
                    activeOpacity={0.7}
                    onPress={() => !isDisabled && handleSubjectPress(subject)}
                    disabled={isDisabled}
                    testID={`subject-card-${subject.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <TouchableOpacity
                      style={styles.visibilityToggle}
                      onPress={() => toggleSubjectVisibility(subject.id)}
                      testID={`visibility-toggle-${subject.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Ionicons
                        name={isHidden ? "eye-off" : "eye"}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    <View style={[styles.iconContainer, isDisabled && styles.disabledIconContainer]} testID={`subject-icon-container-${subject.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      <Image
                        source={getSubjectIcon(subject.name)}
                        style={[styles.subjectIcon, isDisabled && styles.disabledIcon]}
                        testID={`subject-icon-${subject.name.toLowerCase().replace(/\s+/g, '-')}`}
                      />
                    </View>
                    <View style={styles.cardContent} testID={`subject-content-${subject.name.toLowerCase().replace(/\s+/g, '-')}`}>
                      <ThemedText
                        style={[
                          styles.subjectName,
                          { color: isDark ? '#FFFFFF' : colors.text },
                          isDisabled && { color: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)' }
                        ]}
                        testID={`subject-name-${subject.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {subject.name}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.totalQuestionsText,
                          { color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)' }
                        ]}
                      >
                        {subject.total_questions} questions
                      </ThemedText>

                      <View style={styles.statsRow}>
                        <View style={[styles.statItem, {
                          backgroundColor: isDark ? colors.surface : '#FFFFFF',
                          borderColor: colors.border,
                          borderWidth: 1,
                          shadowColor: isDark ? '#000000' : '#000000',
                          shadowOpacity: isDark ? 0.3 : 0.1,
                          borderRadius: 12,
                          padding: 12,
                          flex: 1,
                        }]}>
                          <View style={styles.statContent}>
                            <ThemedText style={styles.statIcon}>🎯</ThemedText>
                            <View style={styles.statTextContainer}>
                              <ThemedText style={[styles.statCount, { color: colors.text }]}>
                                {subject.correct_answers}
                              </ThemedText>
                              <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
                                Bullseyes
                              </ThemedText>
                            </View>
                          </View>
                        </View>

                        <View style={[styles.statItem, {
                          backgroundColor: isDark ? colors.surface : '#FFFFFF',
                          borderColor: colors.border,
                          borderWidth: 1,
                          shadowColor: isDark ? '#000000' : '#000000',
                          shadowOpacity: isDark ? 0.3 : 0.1,
                          borderRadius: 12,
                          padding: 12,
                          flex: 1,
                          marginLeft: 12,
                        }]}>
                          <View style={styles.statContent}>
                            <ThemedText style={styles.statIcon}>💥</ThemedText>
                            <View style={styles.statTextContainer}>
                              <ThemedText style={[styles.statCount, { color: colors.text }]}>
                                {subject.answered_questions - subject.correct_answers}
                              </ThemedText>
                              <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
                                Oopsies
                              </ThemedText>
                            </View>
                          </View>
                        </View>
                      </View>

                      <View style={[styles.progressBarContainer, {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                      }]}>
                        <View
                          style={[
                            styles.progressBar,
                            {
                              width: `${subject.answered_questions === 0 ? 0 :
                                Math.round((subject.correct_answers / subject.answered_questions) * 100)}%`,
                              backgroundColor: '#22C55E'
                            }
                          ]}
                        />
                      </View>
                      <ThemedText
                        style={[
                          styles.masteryText,
                          { color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)' }
                        ]}
                      >
                        {subject.answered_questions === 0 ? 0 :
                          Math.round((subject.correct_answers / subject.answered_questions) * 100)}% GOAT 🐐
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                );
              });
          })()}
        </View>

        {hiddenSubjects.length > 0 && (
          <TouchableOpacity
            style={[styles.showAllButton, { backgroundColor: colors.primary }]}
            onPress={toggleShowAllSubjects}
            testID="show-all-subjects-button"
          >
            <Ionicons
              name={showAllSubjects ? "eye-off" : "eye"}
              size={20}
              color="#FFFFFF"
            />
            <ThemedText style={styles.showAllButtonText} testID="show-all-subjects-text">
              {showAllSubjects ? 'Hide Hidden Subjects' : `Show ${hiddenSubjects.length} Hidden Subject${hiddenSubjects.length > 1 ? 's' : ''}`}
            </ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>

      <RatingModal
        visible={showRatingModal}
        rating={rating}
        onRate={(selectedRating) => setRating(selectedRating)}
        onSubmit={handleSubmitRating}
        onDismiss={handleDismissRating}
        testID="rating-modal"
      />

      <MessageModal
        visible={showMessageModal}
        message={currentMessage}
        onDismiss={() => setShowMessageModal(false)}
      />

      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        testID="error-modal"
      >
        <View style={styles.modalOverlay} testID="error-modal-overlay">
          <View style={[styles.errorModalContainer, {
            backgroundColor: isDark ? colors.card : '#FFFFFF'
          }]} testID="error-modal-content">
            <ThemedText style={[styles.errorModalTitle, { color: colors.text }]} testID="error-modal-title">
              ⚠️ Connection Error
            </ThemedText>
            <ThemedText style={[styles.errorModalMessage, { color: colors.textSecondary }]} testID="error-modal-message">
              Oops! We can't find you in our system! please try to login again or register again🚀
            </ThemedText>
          </View>
        </View>
      </Modal>

      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onOpenSettings={() => {
          if (Platform.OS === 'ios') {
            Linking.openURL('app-settings:');
          } else {
            Linking.openSettings();
          }
          setShowSettingsModal(false);
        }}
      />
    </LinearGradient>
  );
}

// Add helper function to get subject icons
function getSubjectIcon(subjectName: string) {
  const icons = {
    'Agricultural Sciences': require('@/assets/images/subjects/agriculture.png'),
    'Economics': require('@/assets/images/subjects/economics.png'),
    'Business Studies': require('@/assets/images/subjects/business-studies.png'),
    'Geography': require('@/assets/images/subjects/geography.png'),
    'Life Sciences': require('@/assets/images/subjects/life-science.png'),
    'mathematics': require('@/assets/images/subjects/mathematics.png'),
    'Physical Sciences': require('@/assets/images/subjects/physics.png'),
    'Mathematical Literacy': require('@/assets/images/subjects/maths.png'),
    'History': require('@/assets/images/subjects/history.png'),
    'Life orientation': require('@/assets/images/subjects/life-orientation.png'),
    'Tourism': require('@/assets/images/subjects/tourism.png'),
    'default': require('@/assets/images/subjects/mathematics.png')
  };
  return icons[subjectName as keyof typeof icons] || icons.default;
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  welcomeSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
  },
  statsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  statIcon: {
    width: 36,
    height: 36,
  },
  statTextContainer: {
    marginLeft: 16,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  subjectsGrid: {
    flexDirection: 'column',
    gap: 16,
    paddingHorizontal: 4,
  },
  subjectCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    position: 'relative',
    marginBottom: 24,
    marginTop: 24,
  },
  iconContainer: {
    position: 'absolute',
    top: -52,
    left: 16,
    width: 85,
    height: 85,
    zIndex: 1,
    borderRadius: 16,
    padding: 12,
  },
  subjectIcon: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  cardContent: {
    marginTop: 8,
  },
  subjectName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  totalQuestionsText: {
    fontSize: 14,
    marginBottom: 16,
  },
  statColumn: {
    alignItems: 'flex-start',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    width: 'auto',
    height: 4,
    overflow: 'hidden',
    marginTop: 8,
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  masteryText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  visibilityToggle: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 2,
    padding: 4,
  },
  loadingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  yourSubjectsCard: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.2)',
      },
    }),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
  },
  profilePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userInfo: {
    alignItems: 'flex-end',
    gap: 2,
  },
  userName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    lineHeight: 14,
  },
  userGrade: {
    fontSize: 10,
    color: '#666',
    opacity: 0.8,
    lineHeight: 12,
  },
  profileNoticeCard: {
    alignItems: 'center',
    padding: 32,
  },
  profileNoticeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 12,
  },
  profileNoticeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  completeProfileButton: {
    backgroundColor: '#000000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  completeProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButtonText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  alertMessage: {
    fontSize: 16,
    marginBottom: 24,
  },
  alertButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  alertButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#FF3B30',
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  mySubjectText: {
    color: '#000000',
  },
  ratingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    width: '80%',
    maxWidth: 400,
  },
  ratingHeader: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerEmoji: {
    fontSize: 36,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  star: {
    fontSize: 32,
    color: '#FFD700',
    marginHorizontal: 4,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 12,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  notNowText: {
    color: '#666666',
    fontSize: 14,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    color: '#000000',
  },
  loadingBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    minWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  imagePlaceholderContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'absolute',
    zIndex: 4,
    justifyContent: 'center',
    alignItems: 'center'
  },
  imagePlaceholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingGif: {
    width: 80,
    height: 80,
    marginBottom: 8
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  shareContainer: {
    padding: 20,
    alignItems: 'center',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 16,
  },
  disabledSubjectCard: {
    opacity: 8,
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  disabledIconContainer: {
    opacity: 0.5,
  },
  disabledIcon: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#9CA3AF',
  },
  disabledProgress: {
    opacity: 0.5,
  },
  dismissButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dismissButtonText: {
    color: '#666666',
    fontSize: 14,
  },
  errorModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  errorModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorModalMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  hiddenSubjectCard: {
    opacity: 0.7,
    borderStyle: 'dashed',
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    marginHorizontal: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  showAllButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  randomLessonContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    marginHorizontal: 16,
  },
  randomLessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  subjectIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomLessonIcon: {
    width: 32,
    height: 32,
  },
  randomLessonTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  randomLessonContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  statCount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  reportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tasksContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tasksTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAllButton: {
    padding: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tasksList: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  taskSubject: {
    fontSize: 14,
    marginBottom: 4,
  },
  taskDueDate: {
    fontSize: 12,
  },
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  enableButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsModalContainer: {
    margin: 20,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  settingsModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  settingsModalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  settingsModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  settingsModalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  settingsModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});


