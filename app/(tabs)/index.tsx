import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View, ActivityIndicator, ScrollView, Image, Platform, Modal, Linking, Share } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import { ThemedText } from '../../components/ThemedText';
import { fetchMySubjects, getLearner } from '../../services/api';
import { Subject } from '../../types/api';
import { GoogleUser } from '../../contexts/AuthContext';
import { Header } from '../../components/Header';

// Temporary mock data


// Add a helper function to get progress bar color
function getProgressBarColor(progress: number): string {
  if (progress >= 70) return '#22C55E'; // Green for high scores
  if (progress >= 40) return '#F59E0B'; // Amber for medium scores
  return '#FF3B30'; // Red for low scores
}

export default function HomeScreen() {
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [learnerInfo, setLearnerInfo] = useState<{ name: string; grade: string; school_name: string; school: string; role: string } | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const insets = useSafeAreaInsets();
  const [streak] = useState(0);
  const [ranking] = useState(0);
  const [user, setUser] = useState<GoogleUser | null>(null);

  // Single useEffect for initial load
  useEffect(() => {
    async function initializeData() {
      try {
        const authData = await SecureStore.getItemAsync('auth');
        if (!authData) {
          router.replace('/login');
          return;
        }

        const parsed = JSON.parse(authData);

        // Extract sub from idToken as uid
        const idToken = parsed.authentication.idToken;
        const tokenParts = idToken.split('.');
        const tokenPayload = JSON.parse(atob(tokenParts[1]));
        const uid = tokenPayload.sub;

        const userData = {
          id: uid,
          uid: uid,
          email: parsed.userInfo.email,
          name: parsed.userInfo.name,
          picture: parsed.userInfo.picture
        };

        setUser(userData);

        // Load data immediately after setting user
        if (userData.uid) {
          const learner = await getLearner(userData.uid);
          if (learner.name && learner.grade && learner.school_name) {
            setLearnerInfo({
              name: learner.name,
              grade: learner.grade?.number?.toString() || '',
              school_name: learner.school_name || '',
              school: learner.school_name || '',
              role: learner.role || ''
            });

            const enrolledResponse = await fetchMySubjects(userData.uid);

            // Group subjects by base name (removing P1/P2)
            const subjectGroups = enrolledResponse.reduce((acc, curr) => {
              const baseName = curr.subject.name.replace(/ P[12]$/, '');

              if (!acc[baseName]) {
                acc[baseName] = {
                  id: curr.subject.id.toString(),
                  name: baseName,
                  total_questions: curr.total_questions,
                  answered_questions: curr.answered_questions,
                  correct_answers: curr.correct_answers
                };
              } else {
                // Sum up the stats from both papers
                acc[baseName].total_questions += curr.total_questions;
                acc[baseName].answered_questions += curr.answered_questions;
                acc[baseName].correct_answers += curr.correct_answers;
              }

              return acc;
            }, {} as Record<string, Subject>);

            setMySubjects(Object.values(subjectGroups));
          } else {
            router.replace('/onboarding');
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    }

    initializeData();
  }, []);

  // Add dependency tracking for loadData
  const loadData = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const learner = await getLearner(user.uid);
      if (learner.name && learner.grade && learner.school_name) {
        setLearnerInfo({
          name: learner.name,
          grade: learner.grade?.number?.toString() || '',
          school_name: learner.school_name || '',
          school: learner.school_name || '',
          role: learner.role || ''
        });


        setIsLoading(true);
        const enrolledResponse = await fetchMySubjects(user.uid);
        // Group subjects by base name (removing P1/P2)
        const subjectGroups = enrolledResponse.reduce((acc, curr) => {
          const baseName = curr.subject.name.replace(/ P[12]$/, '');

          if (!acc[baseName]) {
            acc[baseName] = {
              id: curr.subject.id.toString(),
              name: baseName,
              total_questions: curr.total_questions,
              answered_questions: curr.answered_questions,
              correct_answers: curr.correct_answers
            };
          } else {
            // Sum up the stats from both papers
            acc[baseName].total_questions += curr.total_questions;
            acc[baseName].answered_questions += curr.answered_questions;
            acc[baseName].correct_answers += curr.correct_answers;
          }

          return acc;
        }, {} as Record<string, Subject>);

        setMySubjects(Object.values(subjectGroups));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Update useFocusEffect to properly track dependencies
  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        loadData();
      }
    }, [user, loadData])
  );

  // Replace promptForReview function
  function promptForReview() {
    setShowRatingModal(true);
  }

  // Add RatingModal component
  const RatingModal = () => {
    const handleRating = (selectedRating: number) => {
      setRating(selectedRating);
    };

    return (
      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
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
                  onPress={() => handleRating(star)}
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
              onPress={() => {
                if (rating >= 4) {
                  Linking.openURL('https://play.google.com/store/apps/details?id=com.examquiz.app');
                }
                setShowRatingModal(false);
              }}
              disabled={rating === 0}
            >
              <ThemedText style={styles.submitText}>Submit</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowRatingModal(false)}
            >
              <ThemedText style={styles.notNowText}>No, Thanks</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Add share function
  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out Exam Quiz - Your ultimate study companion! https://play.google.com/store/apps/details?id=za.co.examquizafrica',
        title: 'Share Exam Quiz'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <ThemedText style={styles.loadingText}>Loading...</ThemedText>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F8FAFC', '#F1F5F9']}
      style={[styles.gradient, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Header
          title="Exam Quiz"
          user={user}
          learnerInfo={learnerInfo}
        />

        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statContent}>
                <Image source={require('@/assets/images/trophy.png')} style={styles.statIcon} />
                <View style={styles.statTextContainer}>
                  <ThemedText style={styles.statLabel}>Your Scoreboard</ThemedText>
                  <ThemedText style={styles.statValue} testID="ranking-value">{ranking}</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statItem}>
              <View style={styles.statContent}>
                <Image source={require('@/assets/images/streak.png')} style={styles.statIcon} />
                <View style={styles.statTextContainer}>
                  <ThemedText style={styles.statLabel}>Quiz Streak</ThemedText>
                  <ThemedText style={styles.statValue} testID="streak-value">{streak}</ThemedText>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.shareContainer}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Ionicons name="share-social" size={24} color="#FFFFFF" />
            <ThemedText style={styles.shareButtonText}>
              Spread the fun, tell your friends!  📢
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText style={styles.sectionTitle}>📚 Let's Dive into Fun Learning!</ThemedText>

        <View style={styles.subjectsGrid}>
          {mySubjects.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              style={styles.subjectCard}
              activeOpacity={0.7}
              onPress={() => router.push({
                pathname: '/quiz',
                params: {
                  subjectName: subject.name,
                  learnerRole: learnerInfo?.role || '',
                  learnerName: learnerInfo?.name || '',
                  learnerGrade: learnerInfo?.grade || '',
                  learnerSchool: learnerInfo?.school || ''
                }
              })}
              testID={`subject-card-${subject.name}`}
            >
              <View style={styles.iconContainer}>
                <Image
                  source={getSubjectIcon(subject.name)}
                  style={styles.subjectIcon}
                />
              </View>
              <View style={styles.cardContent}>
                <ThemedText style={styles.subjectName} testID={`subject-name-${subject.name}`}>
                  {subject.name}
                </ThemedText>
                <ThemedText style={styles.questionCount} testID={`question-count-${subject.name}`}>
                  {subject.total_questions} questions
                </ThemedText>

                {/* Progress section */}
                <View>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${subject.answered_questions === 0 ? 0 :
                            Math.round((subject.correct_answers / subject.answered_questions) * 100)}%`,
                          backgroundColor: getProgressBarColor(subject.answered_questions === 0 ? 0 :
                            Math.round((subject.correct_answers / subject.answered_questions) * 100))
                        }
                      ]}
                    />
                  </View>
                  <ThemedText style={styles.masteryText}>
                    {subject.answered_questions === 0 ? 0 :
                      Math.round((subject.correct_answers / subject.answered_questions) * 100)}% GOAT 🐐
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <RatingModal />
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
  submitText: {
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
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 16,
  },
});


