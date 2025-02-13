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

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
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
    if (!user?.uid) return;
    if (!editName.trim()) {
      if (Platform.OS === 'web') {
        setAlertConfig({
          title: 'Error',
          message: 'Name is required'
        });
        setShowAlert(true);
      } else {
        Alert.alert('Error', 'Name is required');
      }
      return;
    }

    if (editGrade !== learnerInfo?.grade) {
      if (Platform.OS === 'web') {
        setAlertConfig({
          title: 'Warning',
          message: 'Changing your grade will reset all your progress. Are you sure you want to continue?',
          onConfirm: saveProfile
        });
        setShowAlert(true);
      } else {
        Alert.alert(
          'Warning',
          'Changing your grade will reset all your progress. Are you sure you want to continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', style: 'destructive', onPress: saveProfile }
          ]
        );
      }
    } else {
      saveProfile();
    }
  };

  const saveProfile = async () => {
    if (!user?.uid) return;
    try {
      setIsLoading(true);
      await updateLearner(user.uid, {
        name: editName.trim(),
        grade: parseInt(editGrade),
      });
      setLearnerInfo({
        name: editName.trim(),
        grade: editGrade,
        imagePath: user.photoURL || undefined
      });
      setIsEditing(false);
      handleSuccess();
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
      Alert.alert('Error', 'Failed to sign out');
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
      colors={['#DBEAFE', '#F3E8FF']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <CustomAlert />
      <ScrollView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)')}
            activeOpacity={0.7}
          >
            <ThemedText type="title" style={styles.appTitle}>
              Exam Quiz
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.content}>
          <ThemedView style={styles.profileCard}>
            <View style={styles.profileImageContainer}>
              {learnerInfo?.imagePath ? (
                <Image
                  source={{ uri: learnerInfo.imagePath }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={[styles.profileImage, styles.profilePlaceholder]}>
                  <ThemedText style={styles.profileInitial}>
                    {learnerInfo?.name?.[0]?.toUpperCase() || '?'}
                  </ThemedText>
                </View>
              )}
            </View>
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
                    onValueChange={(value) => setEditGrade(value)}
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
            onPress={handleSignOut}
          >
            <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6B4EFF',
  },
  content: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6B4EFF',
  },
  profilePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 32,
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
    color: '#666',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    width: '100%',
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#6B4EFF',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#6B4EFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
    width: '100%',
  },
  signOutContainer: {
    padding: 20,
    marginTop: 20,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
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
    backgroundColor: '#6B4EFF',
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
}); 