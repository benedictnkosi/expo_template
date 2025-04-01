import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView, Image, Platform, Modal, Linking, Share } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { analytics } from '../../services/analytics';
import { useTheme } from '@/contexts/ThemeContext';
import { registerForPushNotificationsAsync } from '@/services/notifications';
import { updatePushToken } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '../../components/ThemedText';
import { fetchMySubjects, getLearner, getRandomAIQuestion, RandomAIQuestion } from '../../services/api';
import { Subject } from '../../types/api';
import { useAuth } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';

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

  // Update the initializeData function to include random lesson fetch
  const initializeData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setIsLoading(true);
      const learner = await getLearner(user.uid);

      //save learner name in AsyncStorage
      await AsyncStorage.setItem('learnerName', learner.name);
      //save learner grade number in AsyncStorage
      await AsyncStorage.setItem('learnerGrade', learner.grade.number.toString());
      await AsyncStorage.setItem('learnerAvatar', learner.avatar + ".png");

      if (learner.name && learner.grade) {
        setLearnerInfo(learner as LearnerInfo);
        const enrolledResponse = await fetchMySubjects(user.uid);

        if (enrolledResponse?.subjects && Array.isArray(enrolledResponse.subjects)) {
          const subjectGroups = enrolledResponse.subjects.reduce((acc: Record<string, Subject>, curr) => {
            if (!curr?.name) return acc;

            // Extract base subject name without P1/P2
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

      // Fetch random lesson
      await fetchRandomLesson();
    } catch (error) {
      signOut();
    } finally {
      setIsLoading(false);
    }
  }, [user?.uid, handleError]);

  // Use useFocusEffect for data initialization
  useFocusEffect(
    useCallback(() => {
      initializeData();
    }, [initializeData])
  );

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

  if (isLoading) {
    return (
      <View style={[styles.imagePlaceholderContainer, {
        backgroundColor: isDark ? colors.surface : '#F8FAFC'
      }]}>
        <View style={styles.imagePlaceholderContent}>
          <Image
            source={require('@/assets/images/book-loading.gif')}
            style={styles.loadingGif}
          />
          <ThemedText style={[styles.loadingText, { color: isDark ? colors.textSecondary : '#6B7280' }]}>Loading...</ThemedText>
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
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
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
            </View>
            <ThemedText style={[styles.randomLessonContent, { color: colors.textSecondary }]}>
              {randomLesson.question.ai_explanation.split('***Key Lesson:')[1]?.trim().replace('***', '').trim()}
            </ThemedText>
          </View>
        )}

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
                          { color: colors.text },
                          isDisabled && { color: isDark ? colors.textSecondary : '#9CA3AF' }
                        ]}
                        testID={`subject-name-${subject.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {subject.name}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.questionCount,
                          { color: colors.textSecondary },
                          isDisabled && { color: isDark ? colors.textSecondary : '#9CA3AF' }
                        ]}
                        testID={`question-count-${subject.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {isDisabled ? 'No questions available' : `${subject.total_questions} questions`}
                      </ThemedText>

                      <View style={isDisabled && styles.disabledProgress} testID={`progress-container-${subject.name.toLowerCase().replace(/\s+/g, '-')}`}>
                        <View style={[styles.progressBarContainer, { backgroundColor: isDark ? colors.border : '#E2E8F0' }]} testID={`progress-bar-container-${subject.name.toLowerCase().replace(/\s+/g, '-')}`}>
                          <View
                            style={[
                              styles.progressBar,
                              {
                                width: `${subject.answered_questions === 0 ? 0 :
                                  Math.round((subject.correct_answers / subject.answered_questions) * 100)}%`,
                                backgroundColor: isDisabled ? (isDark ? colors.textSecondary : '#D1D5DB') :
                                  getProgressBarColor(subject.answered_questions === 0 ? 0 :
                                    Math.round((subject.correct_answers / subject.answered_questions) * 100))
                              }
                            ]}
                            testID={`progress-bar-${subject.name.toLowerCase().replace(/\s+/g, '-')}`}
                          />
                        </View>
                        <ThemedText
                          style={[
                            styles.masteryText,
                            { color: colors.textSecondary },
                            isDisabled && { color: isDark ? colors.textSecondary : '#9CA3AF' }
                          ]}
                          testID={`mastery-text-${subject.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {subject.answered_questions === 0 ? 0 :
                            Math.round((subject.correct_answers / subject.answered_questions) * 100)}% GOAT 🐐
                        </ThemedText>
                      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 40,
    marginTop: 20,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 4,
  },
  subjectCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'flex-start',
    position: 'relative',
    marginBottom: 16,
    height: 180,
    justifyContent: 'space-between',
  },
  iconContainer: {
    position: 'absolute',
    top: -16,
    left: 16,
    width: 72,
    height: 72,
    zIndex: 1,
  },
  subjectIcon: {
    width: '100%',
    height: '100%',
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 32,
  },
  questionCount: {
    fontSize: 12,
    color: '#64748B',
  },
  loadingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
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
  cardContent: {
    width: '100%',
    marginTop: 'auto',
    paddingBottom: 8,
  },
  progressBarContainer: {
    width: '100%',
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: 12,
    height: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
  masteryText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'right',
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
  visibilityToggle: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
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
});


