import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { ThemedView } from '../../components/ThemedView';
import { ThemedText } from '../../components/ThemedText';
import { useState, useEffect } from 'react';
import { getLearner, updateLearner, fetchGrades } from '../../services/api';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import Modal from 'react-native-modal';
import { Header } from '../../components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, TouchableOpacity, ScrollView, TextInput, Platform, StyleSheet } from 'react-native';
import React from 'react';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';


interface User {
  uid: string;
  id: string;
  name: string;
  email: string;
  picture?: string;
}

interface LearnerInfo {
  name: string;
  grade: string;
  school?: string;
  school_address?: string;
  school_latitude?: number;
  school_longitude?: number;
  curriculum?: string;
  terms?: string;
  photoURL?: string;
  imagePath?: string;
}

export default function ProfileScreen() {
  const { user } = useAuth();
  const { signOut } = useAuth();
  const [learnerInfo, setLearnerInfo] = useState<LearnerInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editSchoolAddress, setEditSchoolAddress] = useState('');
  const [editSchoolLatitude, setEditSchoolLatitude] = useState(0);
  const [editSchoolLongitude, setEditSchoolLongitude] = useState(0);
  const [editCurriculum, setEditCurriculum] = useState<string>('');
  const [editTerms, setEditTerms] = useState<string>('');
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
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Available options
  const TERMS = [1, 2, 3, 4];
  const CURRICULA = ['CAPS', 'IEB'];



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
          school: learner.school_name || '',
          school_address: learner.school_address || '',
          school_latitude: learner.school_latitude || 0,
          school_longitude: learner.school_longitude || 0,
          curriculum: learner.curriculum || '',
          terms: learner.terms || '',
          imagePath: user.photoURL || ""
        });

        setEditName(name);
        setEditGrade(grade || grades[0]?.number.toString() || '');
        setEditSchool(learner.school_name || '');
        setEditSchoolAddress(learner.school_address || '');
        setEditSchoolLatitude(learner.school_latitude || 0);
        setEditSchoolLongitude(learner.school_longitude || 0);
        setEditCurriculum(learner.curriculum || '');
        setEditTerms(learner.terms || '');
      } catch (error) {
        console.error('Failed to fetch learner info:', error);
      }
    }
    fetchLearnerInfo();
  }, [user?.uid, grades]);

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


  const handleSave = async () => {
    // Validate curriculum and terms selection
    const selectedCurricula = editCurriculum.split(',').map(c => c.trim()).filter(Boolean);
    const selectedTerms = editTerms.split(',').map(t => t.trim()).filter(Boolean);

    if (selectedCurricula.length === 0 || selectedTerms.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Missing Selection',
        text2: 'Please select at least one curriculum and one term',
        position: 'bottom'
      });
      return;
    }

    setShowGradeChangeModal(true);
  };

  const saveChanges = async () => {
    if (!user?.uid) return;

    setIsLoading(true);
    try {
      // Clean up and format the terms and curriculum strings
      const cleanTerms = editTerms.split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .join(', ');

      const cleanCurriculum = editCurriculum.split(',')
        .map(c => c.trim())
        .filter(Boolean)
        .join(', ');

      await updateLearner(user.uid, {
        name: editName.trim(),
        grade: parseInt(editGrade),
        school: editSchool,
        school_address: editSchoolAddress,
        school_latitude: editSchoolLatitude,
        school_longitude: editSchoolLongitude,
        terms: cleanTerms,
        curriculum: cleanCurriculum
      });

      setLearnerInfo({
        name: editName.trim(),
        grade: editGrade,
        school: editSchool,
        school_address: editSchoolAddress,
        school_latitude: editSchoolLatitude,
        school_longitude: editSchoolLongitude,
        curriculum: cleanCurriculum,
        terms: cleanTerms
      });

      handleSuccess();

    } catch (error) {
      console.error('Failed to update profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update profile',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
      setShowGradeChangeModal(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await signOut();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to logout',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
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

  const handleConfirm = async () => {
    setShowGradeChangeModal(false);
    await saveChanges();
  };

  const handleGoHome = () => {
    router.push('/(tabs)');
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F8FAFC', '#F1F5F9']}
      style={[styles.gradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView
        style={[
          styles.container,
          { paddingTop: insets.top }
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
                <ThemedText style={styles.label}>🔹 What do we call our quiz champion?</ThemedText>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor="#666"
                  testID='profile-name-input'
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>🏆 Grade</ThemedText>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={editGrade}
                    onValueChange={setEditGrade}
                    style={[styles.picker, Platform.OS === 'ios' && styles.pickerIOS]}
                    itemStyle={Platform.OS === 'ios' ? styles.pickerItemIOS : undefined}
                  >
                    {grades.map((grade) => (
                      <Picker.Item
                        key={grade.id}
                        label={`Grade ${grade.number}`}
                        value={grade.number.toString()}
                        color="#1E293B"
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>🏫 School</ThemedText>
                {editSchool && (
                  <View style={styles.selectedSchoolContainer}>
                    <ThemedText style={styles.selectedSchoolName}>{editSchool}</ThemedText>
                    <ThemedText style={styles.selectedSchoolAddress}>{editSchoolAddress}</ThemedText>
                  </View>
                )}
                <View style={styles.searchWrapper}>
                  <GooglePlacesAutocomplete
                    placeholder="🔍 Search for your school..."
                    onPress={(data, details = null) => {
                      setEditSchool(data.structured_formatting.main_text);
                      setEditSchoolAddress(data.description);
                      if (details) {
                        setEditSchoolLatitude(details.geometry.location.lat);
                        setEditSchoolLongitude(details.geometry.location.lng);
                      }
                    }}
                    fetchDetails={true}
                    query={{
                      key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || "",
                      components: 'country:za',
                      types: 'school',
                      language: 'en',
                    }}
                    styles={{
                      container: styles.searchContainer,
                      textInput: styles.searchInput,
                      listView: styles.searchListView,
                    }}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>📖 Choose Your Curriculums</ThemedText>
                <ThemedText style={styles.smallLabel}>Only questions from the selected curriculum\s will appear in the quiz.</ThemedText>

                <View style={styles.optionsContainer}>
                  {CURRICULA.map((curr) => (
                    <TouchableOpacity
                      key={curr}
                      style={[
                        styles.optionButton,
                        editCurriculum.split(',').map(c => c.trim()).includes(curr) && styles.optionButtonSelected
                      ]}
                      onPress={() => {
                        const currArray = editCurriculum.split(',').map(c => c.trim()).filter(Boolean);
                        if (currArray.includes(curr)) {
                          setEditCurriculum(currArray.filter(c => c !== curr).join(','));
                        } else {
                          setEditCurriculum(currArray.concat(curr).join(','));
                        }
                      }}
                    >
                      <ThemedText style={[
                        styles.optionButtonText,
                        editCurriculum.split(',').map(c => c.trim()).includes(curr) && styles.optionButtonTextSelected
                      ]}>
                        {curr}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>🔹 Which terms are you mastering today? Choose wisely! 💡</ThemedText>
                <ThemedText style={styles.smallLabel}>Only questions from the selected terms will appear in the quiz.</ThemedText>

                <View style={styles.optionsContainer}>
                  {TERMS.map((term) => (
                    <TouchableOpacity
                      key={term}
                      style={[
                        styles.optionButton,
                        editTerms.split(',').map(t => t.trim()).includes(term.toString()) && styles.optionButtonSelected
                      ]}
                      onPress={() => {
                        const termsArray = editTerms.split(',').map(t => t.trim()).filter(Boolean);
                        if (termsArray.includes(term.toString())) {
                          setEditTerms(termsArray.filter(t => t !== term.toString()).join(','));
                        } else {
                          setEditTerms(termsArray.concat(term.toString()).join(','));
                        }
                      }}
                    >
                      <ThemedText style={[
                        styles.optionButtonText,
                        editTerms.split(',').map(t => t.trim()).includes(term.toString()) && styles.optionButtonTextSelected
                      ]}>
                        Term {term}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  (!editCurriculum.split(',').filter(Boolean).length || !editTerms.split(',').filter(Boolean).length) && styles.buttonDisabled
                ]}
                onPress={handleSave}
                disabled={isLoading || !editCurriculum.split(',').filter(Boolean).length || !editTerms.split(',').filter(Boolean).length}
                testID='profile-save-button'
              >
                <ThemedText style={styles.buttonText}>
                  {isLoading ? 'Saving...' : 'Lock in your settings! 🔒'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.signOutContainer}>
          <TouchableOpacity
            style={[styles.signOutButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogout}
            disabled={isLoading}
          >
            <ThemedText style={styles.signOutText}>
              {isLoading ? 'Signing out...' : 'Sign Out'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
      <Modal
        isVisible={showGradeChangeModal}
        onBackdropPress={() => setShowGradeChangeModal(false)}
        style={styles.modal}
      >
        <View style={styles.confirmationModal}>
          <View style={styles.confirmationHeader}>
            <ThemedText style={styles.confirmationTitle}>🎓 Change Grade?</ThemedText>
          </View>
          <ThemedText style={styles.confirmationText}>
            ⚠️ Heads up! Switching grades will wipe out your progress like a clean slate! 🧹✨

            Are you super sure you want to start fresh? 🚀
          </ThemedText>
          <View style={styles.confirmationButtons}>
            <TouchableOpacity
              style={[styles.paperButton, { backgroundColor: '#64748B' }]}
              onPress={() => setShowGradeChangeModal(false)}
            >
              <LinearGradient
                colors={['#64748B', '#475569']}
                style={styles.paperButtonGradient}
              >
                <ThemedText style={styles.paperButtonText}>❌ Nope, Go Back!</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paperButton, { backgroundColor: '#9333EA' }]}
              onPress={handleConfirm}
            >
              <LinearGradient
                colors={['#9333EA', '#4F46E5']}
                style={styles.paperButtonGradient}
              >
                <ThemedText style={styles.paperButtonText}>✅ Yes, Let's Do It!</ThemedText>
              </LinearGradient>
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
    paddingHorizontal: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  homeButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 40,
  },
  content: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  profileCard: {
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
    marginBottom: 12,
    marginVertical: 12,
  },
  smallLabel: {
    fontSize: 10,
    fontWeight: '400',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000000',
    width: '100%',
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    borderColor: '#7C3AED',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 16,
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  pickerIOS: {
    height: 150,
    backgroundColor: '#FFFFFF',
  },
  pickerItemIOS: {
    height: 150,
    color: '#1E293B',
    fontSize: 16,
  },
  signOutContainer: {
    padding: 20,
    marginTop: 20,
    backgroundColor: 'transparent',
  },
  signOutButton: {
    backgroundColor: '#F43F5E',
    borderColor: '#E11D48',
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  confirmationHeader: {
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 8,
  },
  paperButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flex: 1,
    maxWidth: 160,
  },
  paperButtonGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  paperButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 12,
  },
  email: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
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
    color: '#1E293B',
    marginBottom: 12,
  },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
  },
  logoutText: {
    color: '#DC2626',
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
  },
  buttonDisabled: {
    backgroundColor: '#555',
  },
  searchWrapper: {
    marginTop: 8,
  },
  searchContainer: {
    flex: 0,
    width: '100%',
  },
  searchInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
  },
  searchListView: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    zIndex: 1000,
    elevation: 3,
    marginTop: 4,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(226, 232, 240, 0.3)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionButtonSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#7C3AED',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#1E293B',
  },
  optionButtonTextSelected: {
    color: '#FFFFFF',
  },
  timeContainer: {
    height: 300,
    marginTop: 8,
    backgroundColor: 'rgba(226, 232, 240, 0.3)',
    borderRadius: 12,
    overflow: Platform.OS === 'android' ? 'visible' : 'hidden',
    ...(Platform.OS === 'android' && {
      elevation: 0,
      zIndex: 1
    })
  },
  selectedSchoolContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(226, 232, 240, 0.3)',
    borderRadius: 12,
  },
  selectedSchoolName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  selectedSchoolAddress: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
}); 