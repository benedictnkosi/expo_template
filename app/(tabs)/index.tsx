import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, View, Alert, ActivityIndicator, ScrollView, Image, Platform, Modal } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { fetchAvailableSubjects, fetchMySubjects, removeSubject, assignSubject, getLearner } from '@/services/api';
import { Subject } from '@/types/api';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';

// Temporary mock data

// Add type definition at the top
interface EnrolledSubject {
  subject: {
    subject: {
      id: number;
      name: string;
    };
  };
  total_questions: number;
  answered_questions: number;
  correct_answers: number;  // Add this field
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [learnerInfo, setLearnerInfo] = useState<{ name: string; grade: string } | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [subjectToRemove, setSubjectToRemove] = useState<Subject | null>(null);

  // Add useEffect for initial load
  useEffect(() => {
    loadData();
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
          const availableResponse = await fetchAvailableSubjects(user.uid);
          const transformedAvailableSubjects = availableResponse.subjects.map(s => ({
            id: s.id.toString(),
            name: s.name,
            totalQuestions: s.totalQuestions,
            answeredQuestions: 0,
            correctAnswers: 0
          }));
          setAvailableSubjects(transformedAvailableSubjects);

          const enrolledResponse = await fetchMySubjects(user.uid);
          const transformedEnrolledSubjects = (enrolledResponse.subjects as EnrolledSubject[]).map(s => ({
            id: s.subject.subject.id.toString(),
            name: s.subject.subject.name,
            totalQuestions: s.total_questions,
            answeredQuestions: s.answered_questions,
            correctAnswers: s.correct_answers
          }));
          setMySubjects(transformedEnrolledSubjects);
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

  const handleAddSubject = async (subject: Subject) => {
    if (!mySubjects.find(s => s.id === subject.id)) {
      try {
        if (!user?.uid) return;

        // Call API to assign subject
        await assignSubject(user.uid, parseInt(subject.id));

        // Fetch updated enrolled subjects
        const enrolledResponse = await fetchMySubjects(user.uid);
        const transformedEnrolledSubjects = (enrolledResponse.subjects as EnrolledSubject[]).map(s => ({
          id: s.subject.subject.id.toString(),
          name: s.subject.subject.name,
          totalQuestions: s.total_questions,
          answeredQuestions: s.answered_questions,
          correctAnswers: 0
        }));

        // Update UI with fresh data
        setMySubjects(transformedEnrolledSubjects);
        setAvailableSubjects(availableSubjects.filter(s => s.id !== subject.id));
      } catch (error) {
        console.error('Failed to add subject:', error);
        Alert.alert('Error', 'Failed to add subject');
      }
    }
  };

  const renderSubjectCard = (item: Subject, isMySubject: boolean) => {
    const progress = item.totalQuestions === 0 ? 0 :
      (item.correctAnswers / item.totalQuestions) * 100;

    const handleCardPress = () => {
      if (isMySubject) {
        router.push({
          pathname: '/quiz',
          params: { subjectId: item.id, subjectName: item.name }
        });
      } else {
        handleAddSubject(item);
      }
    };

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.card,
          isMySubject ? styles.mySubjectCard : styles.availableSubjectCard
        ]}
        onPress={handleCardPress}
      >
        <View style={styles.cardHeader}>
          <ThemedText style={[
            styles.subjectName,
            isMySubject && styles.mySubjectText
          ]}>
            {item.name}
          </ThemedText>
          {isMySubject ? (
            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === 'web') {
                  setSubjectToRemove(item);
                  setShowAlert(true);
                } else {
                  Alert.alert(
                    "Remove Subject",
                    "Are you sure you want to remove this subject? All progress will be lost.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        style: "destructive",
                        onPress: async () => {
                          try {
                            if (!user?.uid) return;
                            await removeSubject(user.uid, parseInt(item.id));
                            setMySubjects(prev => prev.filter(s => s.id !== item.id));
                            setAvailableSubjects(prev => [...prev, item]);
                          } catch (error) {
                            console.error('Failed to remove subject:', error);
                            Alert.alert('Error', 'Failed to remove subject');
                          }
                        }
                      }
                    ]
                  );
                }
              }}
              style={styles.removeButton}
            >
              <ThemedText style={styles.removeButtonText}>✕</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.removeButton}>
              <ThemedText style={styles.removeButtonText}>+</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        <ThemedText style={[
          styles.questionsText,
          isMySubject && styles.mySubjectText
        ]}>
          {item.totalQuestions} questions available
        </ThemedText>

        {isMySubject && (
          <>
            <ThemedText style={styles.progressText}>
              Answered: {item.answeredQuestions}
              {'  '}
              Correct: {item.correctAnswers}
            </ThemedText>
            <ThemedView style={styles.progressBarContainer}>
              <ThemedView
                style={[
                  styles.progressBarFill,
                  { width: `${progress}%` }
                ]}
              />
            </ThemedView>
            <ThemedText style={styles.progressText}>
              {progress === 0 ? '0' : Math.round(progress)}% Pass
            </ThemedText>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const CustomAlert = () => (
    <Modal
      visible={showAlert}
      transparent
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.alertContainer}>
          <ThemedText style={styles.alertTitle}>Remove Subject</ThemedText>
          <ThemedText style={styles.alertMessage}>
            Are you sure you want to remove this subject? All progress will be lost.
          </ThemedText>
          <View style={styles.alertButtons}>
            <TouchableOpacity
              style={[styles.alertButton, styles.cancelButton]}
              onPress={() => setShowAlert(false)}
            >
              <ThemedText style={styles.alertButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.alertButton, styles.confirmButton]}
              onPress={async () => {
                if (!user?.uid || !subjectToRemove) return;
                try {
                  await removeSubject(user.uid, parseInt(subjectToRemove.id));
                  setMySubjects(prev => prev.filter(s => s.id !== subjectToRemove.id));
                  setAvailableSubjects(prev => [...prev, subjectToRemove]);
                } catch (error) {
                  console.error('Failed to remove subject:', error);
                }
                setShowAlert(false);
              }}
            >
              <ThemedText style={styles.alertButtonText}>Remove</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </ThemedView>
    );
  }

  return (
    <LinearGradient
      colors={['#DBEAFE', '#F3E8FF']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView style={styles.container}>
        <Header
          title="Exam Quiz"
          user={user}
          learnerInfo={learnerInfo}
        />

        <ThemedView style={styles.content}>
          {/* Your Subjects Section */}
          <ThemedView style={[styles.sectionCard, styles.yourSubjectsCard]}>
            <ThemedText style={styles.sectionTitle}>Your Subjects</ThemedText>
            {mySubjects.map(subject => renderSubjectCard(subject, true))}
          </ThemedView>

          {/* Available Subjects Section */}
          <ThemedView style={styles.sectionCard}>
            <ThemedText style={styles.sectionTitle}>Available Subjects</ThemedText>
            {availableSubjects.map(subject => renderSubjectCard(subject, false))}
          </ThemedView>
        </ThemedView>
      </ScrollView>
      <CustomAlert />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 20,
  },
  content: {
    gap: 20,
    backgroundColor: 'transparent',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
  },
  sectionCard: {
    // backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)'
      },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  card: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  mySubjectCard: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
  availableSubjectCard: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  questionsText: {
    fontSize: 12,
    marginTop: 4,
  },
  progressText: {
    fontSize: 12,
    marginTop: 4,
  },

  progressBarContainer: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginTop: 8,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 3,
    minWidth: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});
