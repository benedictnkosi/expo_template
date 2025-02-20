import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, Alert, ActivityIndicator, ScrollView, Image, Platform, Modal, Linking } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { mixpanel, Events } from '@/services/mixpanel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { fetchMySubjects, getLearner, getStreak, getTopLearners } from '@/services/api';
import { Subject } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';

// Temporary mock data


// Add a helper function to get progress bar color
function getProgressBarColor(progress: number): string {
  if (progress >= 70) return '#22C55E'; // Green for high scores
  if (progress >= 40) return '#F59E0B'; // Amber for medium scores
  return '#FF3B30'; // Red for low scores
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [learnerInfo, setLearnerInfo] = useState<{ name: string; grade: string } | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const insets = useSafeAreaInsets();
  const [streak, setStreak] = useState(0);
  const [ranking, setRanking] = useState(0);

  // Add useEffect for initial load
  useEffect(() => {
    mixpanel.track(Events.VIEW_HOME, {
      "user_id": user?.uid
    });

    loadData();

    // Show review prompt after a short delay
    // const timer = setTimeout(() => {
    //   promptForReview();
    // }, 1000);

    // return () => clearTimeout(timer);
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) {
      getStreak(user.uid).then((streak) => {
        console.log(streak);
        setStreak(streak.data.currentStreak);
      });
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) {
      getTopLearners(user.uid).then((ranking) => {
        setRanking(ranking.rankings.find(r => r.isCurrentLearner)?.position || 0);
      });
    }
  }, [user?.uid]);

  // Keep useFocusEffect for tab focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.uid])
  );

  // Move loadData function outside the hooks
  async function loadData() {
    if (!user?.uid) return;
    try {
      const learner = await getLearner(user.uid);
      setLearnerInfo({
        name: learner.name,
        grade: learner.grade?.number?.toString() || ''
      });

      if (learner.grade?.number) {
        setIsLoading(true);
        try {
          const enrolledResponse = await fetchMySubjects(user.uid);

          // Group subjects by base name (removing P1/P2)
          const subjectGroups = enrolledResponse.subjects.reduce((acc, curr) => {
            const baseName = curr.subject.subject.name.replace(/ P[12]$/, '');

            if (!acc[baseName]) {
              acc[baseName] = {
                id: curr.subject.subject.id.toString(),
                name: baseName,
                totalQuestions: curr.total_questions,
                answeredQuestions: curr.answered_questions,
                correctAnswers: curr.correct_answers
              };
            } else {
              // Sum up the stats from both papers
              acc[baseName].totalQuestions += curr.total_questions;
              acc[baseName].answeredQuestions += curr.answered_questions;
              acc[baseName].correctAnswers += curr.correct_answers;
            }

            return acc;
          }, {} as Record<string, Subject>);

          setMySubjects(Object.values(subjectGroups));
        } catch (error) {
          setMySubjects([]);
          console.error('Failed to fetch subjects:', error);
        }
      }
    } catch (error) {
      console.error('Failed to fetch learner info:', error);
    } finally {
      setIsLoading(false);
    }
  }


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

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </ThemedView>
    );
  }

  return (
    <LinearGradient
      colors={['#1a1a1a', '#000000', '#000000']}
      style={[styles.gradient, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView style={styles.container}>
        <Header
          title="Exam Quiz"
          user={user}
          learnerInfo={learnerInfo}
        />

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={styles.statContent}>
              <Image source={require('@/assets/images/trophy.png')} style={styles.statIcon} />
              <View style={styles.statTextContainer}>
                <ThemedText style={styles.statLabel}>Ranking</ThemedText>
                <ThemedText style={styles.statValue}>{ranking}</ThemedText>
              </View>

            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.statItem}>
            <View style={styles.statContent}>
              <Image source={require('@/assets/images/streak.png')} style={styles.statIcon} />
              <View style={styles.statTextContainer}>
                <ThemedText style={styles.statLabel}>Streak Days</ThemedText>
                <ThemedText style={styles.statValue}>{streak}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        <ThemedText style={styles.sectionTitle}>Let's play</ThemedText>

        <View style={styles.subjectsGrid}>
          {mySubjects.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              style={styles.subjectCard}
              activeOpacity={0.7}
              onPress={() => router.push({
                pathname: '/quiz',
                params: {
                  subjectName: subject.name
                }
              })}
            >
              <View style={styles.iconContainer}>
                <Image
                  source={getSubjectIcon(subject.name)}
                  style={styles.subjectIcon}
                />
              </View>
              <View style={styles.cardContent}>
                <ThemedText style={styles.subjectName}>{subject.name}</ThemedText>
                <ThemedText style={styles.questionCount}>
                  {subject.totalQuestions} questions
                </ThemedText>
                <View style={styles.progressBarContainer}>
                  {/* Calculate progress */}
                  {(() => {
                    const progress = subject.answeredQuestions === 0 ? 0 :
                      Math.round((subject.answeredQuestions / subject.totalQuestions) * 100);

                    return (
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${progress}%`,
                            backgroundColor: getProgressBarColor(progress)
                          }
                        ]}
                      />
                    );
                  })()}
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
    padding: 20,
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
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  statItem: {
    flex: 1,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statTextContainer: {
    marginLeft: 16,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 36,
    height: 36,
  },
  statLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  divider: {
    width: 1,
    backgroundColor: '#444',
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 40,
    marginTop: 20,
  },
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  subjectCard: {
    width: '47%',
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
    paddingTop: 48,
    position: 'relative',
    marginBottom: 16,
    height: 160,
  },
  iconContainer: {
    position: 'absolute',
    top: -16,
    left: 16,
    width: 72,
    height: 72,
    zIndex: 1, // Ensure icon is clickable
  },
  subjectIcon: {
    width: '100%',
    height: '100%',
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    marginTop: 24,
  },
  questionCount: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    color: '#FFFFFF',
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
    backgroundColor: '#007AFF',
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
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
    color: '#000000',
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
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
});
