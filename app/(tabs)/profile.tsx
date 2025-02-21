import React, { StyleSheet, TouchableOpacity, View, Image, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useState, useEffect } from 'react';
import { getLearner, updateLearner, fetchGrades } from '@/services/api';
import { Picker } from '@react-native-picker/picker';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import Toast from 'react-native-toast-message';
import Modal from 'react-native-modal';
import { signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '@/components/Header';
import { trackEvent, Events } from '@/services/mixpanel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { user, signOut, } = useAuth();
  const [learnerInfo, setLearnerInfo] = useState<{
    name: string;
    grade: string;
    photoURL?: string;
    imagePath?: string;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [grades, setGrades] = useState<{ id: number; number: number }[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ title: '', message: '' });
  const insets = useSafeAreaInsets();
  const [showGradeChangeModal, setShowGradeChangeModal] = useState(false);
  const [pendingGrade, setPendingGrade] = useState('');

  useEffect(() => {
    async function fetchLearnerInfo() {
      if (!user?.uid) return;
      try {
        const learner = await getLearner(user.uid);
        const name = learner.name || '';
        const grade = learner.grade?.number?.toString() || '';

        setLearnerInfo({
          name,
          grade,
          imagePath: user.photoURL || undefined
        });
        setEditName(name);
        setEditGrade(grade || grades[0]?.number.toString() || '');
      } catch (error) {
        console.error('Failed to fetch learner info:', error);
      }
    }
    fetchLearnerInfo();
  }, [user?.uid, user?.photoURL, grades]);

  useEffect(() => {
    async function loadGrades() {
      try {
        const grades = await fetchGrades();
        // Sort grades in descending order (12, 11, 10)
        const sortedGrades = grades
          .filter(grade => grade.active === 1)
          .sort((a, b) => b.number - a.number);
        setGrades(sortedGrades);
      } catch (error) {
        console.error('Failed to fetch grades:', error);
      }
    }
    loadGrades();
  }, []);

  const handleStartEdit = () => {
    setEditName(learnerInfo?.name || '');
    setEditGrade(learnerInfo?.grade || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    setShowGradeChangeModal(true);
  };

  const saveChanges = async () => {
    setIsLoading(true);
    try {
      await updateLearner(user?.uid || '', {
        name: editName.trim(),
        grade: parseInt(editGrade)
      });
      setLearnerInfo({
        name: editName.trim(),
        grade: editGrade
      });
      setIsEditing(false);
      handleSuccess();
      trackEvent(Events.UPDATE_PROFILE, {
        "user_id": user?.uid,
        "name": editName.trim(),
        "grade": editGrade
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      await AsyncStorage.removeItem('user'); // Clear stored user data
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to logout',
        position: 'bottom'
      });
    }
  };

  const CustomAlert = () => (
    <Modal
      isVisible={showAlert}
      onBackdropPress={() => setShowAlert(false)}
      style={styles.modal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.alertContainer}>
          <ThemedText style={styles.alertTitle}>{alertConfig.title}</ThemedText>
          <ThemedText style={styles.alertMessage}>{alertConfig.message}</ThemedText>
          <View style={styles.alertButtons}>
            {alertConfig.onConfirm ? (
              <>
                <TouchableOpacity
                  style={[styles.alertButton, styles.cancelButton]}
                  onPress={() => setShowAlert(false)}
                >
                  <ThemedText style={styles.alertButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alertButton, styles.confirmButton]}
                  onPress={() => {
                    setShowAlert(false);
                    alertConfig.onConfirm?.();
                  }}
                >
                  <ThemedText style={styles.alertButtonText}>Continue</ThemedText>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.alertButton, styles.confirmButton]}
                onPress={() => setShowAlert(false)}
              >
                <ThemedText style={styles.alertButtonText}>OK</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );

  const handleSuccess = () => {
    Toast.show({
      type: 'success',
      text1: 'Profile updated successfully',
      position: 'bottom'
    });
  };

  return (
    <LinearGradient
      colors={['#1a1a1a', '#000000', '#000000']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <CustomAlert />
      <ScrollView
        style={[
          styles.container,
          { paddingTop: insets.top + 20 } // Add safe area top padding plus extra spacing
        ]}
      >
        <Header
          title="Exam Quiz"
          user={user}
          learnerInfo={learnerInfo}
        />

        <ThemedView style={styles.content}>
          <ThemedView style={styles.profileCard}>
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Name</ThemedText>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor="#666"
                />
              </View>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Grade</ThemedText>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editGrade}
                    onValueChange={(value) => {
                      setEditGrade(value);
                    }}
                    style={styles.picker}
                  >
                    {grades.map((grade) => (
                      <Picker.Item
                        key={grade.id}
                        label={`Grade ${grade.number}`}
                        value={grade.number.toString()}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={isLoading}
              >
                <ThemedText style={styles.buttonText}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.signOutContainer}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleLogout}
          >
            <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
      <Modal
        isVisible={showGradeChangeModal}
        onBackdropPress={() => setShowGradeChangeModal(false)}
        style={styles.modal}
      >
        <View style={styles.alertContainer}>
          <ThemedText style={styles.alertTitle}>Change Grade?</ThemedText>
          <ThemedText style={styles.alertMessage}>
            Changing your grade will reset all your progress. Are you sure you want to continue?
          </ThemedText>
          <View style={styles.alertButtons}>
            <TouchableOpacity
              style={[styles.alertButton, styles.cancelButton]}
              onPress={() => {
                setShowGradeChangeModal(false);
                setEditGrade(learnerInfo?.grade || '');
              }}
            >
              <ThemedText style={styles.alertButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.alertButton, styles.confirmButton]}
              onPress={() => {
                setShowGradeChangeModal(false);
                saveChanges();
              }}
            >
              <ThemedText style={styles.alertButtonText}>Continue</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20, // Keep horizontal padding
  },
  header: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  logo: {
    marginTop: 20,
    width: 180,
    height: 40,
  },
  content: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  profileCard: {
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
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
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#000000',
    marginBottom: 16,
  },
  profilePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
  editForm: {
    width: '100%',
    gap: 16,
    marginTop: 16,
  },
  inputGroup: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#444',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    width: '100%',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#000000',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: '#444',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 12,
    overflow: Platform.OS === 'ios' ? 'hidden' : 'visible',
    marginVertical: 8,
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
    width: '100%',
    backgroundColor: '#444',
    color: '#FFFFFF',
    paddingHorizontal: 16,
  },
  signOutContainer: {
    padding: 20,
    marginTop: 20,
    backgroundColor: 'transparent',
  },
  signOutButton: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 16,
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
    width: Platform.OS === 'web' ? 400 : '80%',
    maxWidth: 400,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  alertMessage: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: '#000000',
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modal: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  logoutButton: {
    backgroundColor: '#000000',
  },
  logoutButtonText: {
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666666',
  },
  infoValue: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  }
}); 