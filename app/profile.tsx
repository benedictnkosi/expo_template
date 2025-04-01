import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useState, useEffect } from 'react';
import { getLearner, createLearner, fetchGrades } from '@/services/api';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import Modal from 'react-native-modal';
import { Header } from '@/components/Header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, TouchableOpacity, ScrollView, TextInput, Platform, StyleSheet, Switch } from 'react-native';
import React from 'react';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { analytics } from '@/services/analytics';
import { API_BASE_URL } from '@/config/api';
import { deleteUser } from 'firebase/auth';
import { auth } from '@/config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

// Helper function for safe analytics logging
async function logAnalyticsEvent(eventName: string, eventParams?: Record<string, any>) {
  try {
    await analytics.track(eventName, eventParams);
  } catch (error) {
    console.error('[Analytics] Error logging event:', error);
  }
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
  avatar?: string;
}

interface Grade {
  id: number;
  number: number;
  active: number;
}


export default function ProfileScreen() {
  const { user } = useAuth();
  const { signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const [learnerInfo, setLearnerInfo] = useState<LearnerInfo | null>(null);
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [editSchoolAddress, setEditSchoolAddress] = useState('');
  const [editSchoolLatitude, setEditSchoolLatitude] = useState(0);
  const [editSchoolLongitude, setEditSchoolLongitude] = useState(0);
  const [editCurriculum, setEditCurriculum] = useState<string>('');
  const [editTerms, setEditTerms] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ title: '', message: '' });
  const insets = useSafeAreaInsets();
  const [showGradeChangeModal, setShowGradeChangeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const googlePlacesRef = React.useRef<any>(null);

  // Available options
  const TERMS = [1, 2, 3, 4];
  const CURRICULA = ['CAPS', 'IEB'];

  useEffect(() => {
    console.log('user', user);
    async function fetchLearnerInfo() {
      if (!user?.uid) return;
      try {
        const learner = await getLearner(user.uid);
        const name = learner.name || '';
        // Extract grade number from the nested grade object
        const gradeNumber = learner.grade?.number?.toString() || '';

        setLearnerInfo({
          name,
          grade: gradeNumber,
          school: learner.school_name || '',
          school_address: learner.school_address || '',
          school_latitude: learner.school_latitude || 0,
          school_longitude: learner.school_longitude || 0,
          curriculum: learner.curriculum || '',
          terms: learner.terms || '',
          imagePath: user.photoURL || "",
          avatar: learner.avatar || ""
        });

        setEditName(name);
        setEditGrade(gradeNumber);
        setEditSchool(learner.school_name || '');
        setEditSchoolAddress(learner.school_address || '');
        setEditSchoolLatitude(learner.school_latitude || 0);
        setEditSchoolLongitude(learner.school_longitude || 0);
        setEditCurriculum(learner.curriculum || '');
        setEditTerms(learner.terms || '');
      } catch (error) {
        console.log('Failed to fetch learner info:', error);
      }
    }
    fetchLearnerInfo();
  }, [user?.uid]);

  useEffect(() => {
    async function loadGrades() {
      try {
        const response = await fetchGrades();

        // Sort grades in descending order (12, 11, 10)
        const sortedGrades = response
          .filter((grade: Grade) => grade.active === 1)
          .sort((a: Grade, b: Grade) => b.number - a.number);

        setGrades(sortedGrades);
      } catch (error) {
        console.error('Failed to fetch grades:', error);
      }
    }
    loadGrades();
  }, []);

  useEffect(() => {
    // Check if sound is enabled
    AsyncStorage.getItem('soundEnabled').then(value => {
      // Default to true if not set
      setSoundEnabled(value === null ? true : value === 'true');
    });
  }, []);

  const handleSave = async () => {
    // Track profile completion status
    await logAnalyticsEvent('profile_completion_status', {
      user_id: user?.uid,
      has_name: Boolean(editName),
      has_grade: Boolean(editGrade),
      has_school: Boolean(editSchool),
      has_curriculum: editCurriculum.split(',').filter(Boolean).length > 0,
      has_terms: editTerms.split(',').filter(Boolean).length > 0
    });

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

    setIsSaving(true);
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

      // Log profile update event
      await logAnalyticsEvent('profile_update', {
        user_id: user.uid,
        updated_fields: {
          name: editName.trim() !== learnerInfo?.name,
          grade: parseInt(editGrade) !== parseInt(learnerInfo?.grade || '0'),
          school: editSchool !== learnerInfo?.school,
          curriculum: cleanCurriculum !== learnerInfo?.curriculum,
          terms: cleanTerms !== learnerInfo?.terms
        }
      });

      await createLearner(user.uid, {
        name: editName.trim(),
        grade: parseInt(editGrade),
        school: editSchool,
        school_address: editSchoolAddress,
        school_latitude: editSchoolLatitude,
        school_longitude: editSchoolLongitude,
        terms: cleanTerms,
        curriculum: cleanCurriculum,
        email: user.email || '',
        avatar: learnerInfo?.avatar || ''
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
      setIsSaving(false);
      setShowGradeChangeModal(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      // Track user sign out
      await logAnalyticsEvent('user_signed_out', {
        user_id: user?.uid
      });
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
      setIsLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.uid) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/learner/delete?uid=${user.uid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      if (data.message === 'Learner and associated data deleted successfully') {
        // Delete Firebase user account
        try {
          await deleteUser(auth.currentUser!);

          // Log account deletion event
          await logAnalyticsEvent('account_deleted', {
            user_id: user.uid
          });

          // Sign out after successful deletion
          //show toast the wait 3 seconds and then sign out
          Toast.show({
            type: 'info',
            text1: 'Account deleted successfully',
            position: 'bottom'
          });

          setTimeout(async () => {
            await signOut();
          }, 3000);
        } catch (firebaseError) {
          console.error('Error deleting Firebase account:', firebaseError);
          // Continue with sign out even if Firebase deletion fails
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: data.message,
          position: 'bottom'
        });
      }


    } catch (error) {
      console.error('Error deleting account:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete account',
        position: 'bottom'
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const CustomAlert = () => (
    <Modal
      isVisible={showAlert}
      onBackdropPress={() => setShowAlert(false)}
      style={styles.modal}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.alertContainer, {
          backgroundColor: isDark ? colors.card : '#FFFFFF'
        }]}>
          <ThemedText style={[styles.alertTitle, { color: colors.text }]}>{alertConfig.title}</ThemedText>
          <ThemedText style={[styles.alertMessage, { color: colors.textSecondary }]}>{alertConfig.message}</ThemedText>
          <View style={styles.alertButtons}>
            {alertConfig.onConfirm ? (
              <>
                <TouchableOpacity
                  style={[styles.alertButton, styles.cancelButton, {
                    backgroundColor: isDark ? colors.surface : '#E0E0E0'
                  }]}
                  onPress={() => setShowAlert(false)}
                >
                  <ThemedText style={[styles.alertButtonText, { color: colors.text }]}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.alertButton, styles.confirmButton, {
                    backgroundColor: isDark ? colors.primary : '#000000'
                  }]}
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
                style={[styles.alertButton, styles.confirmButton, {
                  backgroundColor: isDark ? colors.primary : '#000000'
                }]}
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
    // Track grade change confirmation
    await logAnalyticsEvent('grade_change_confirmed', {
      user_id: user?.uid,
      old_grade: learnerInfo?.grade,
      new_grade: editGrade
    });
    await saveChanges();
  };

  const toggleSound = async () => {
    try {
      const newSoundState = !soundEnabled;
      await AsyncStorage.setItem('soundEnabled', newSoundState.toString());
      setSoundEnabled(newSoundState);

      // Track sound preference change
      await logAnalyticsEvent('sound_preference_changed', {
        user_id: user?.uid,
        enabled: newSoundState
      });

      Toast.show({
        type: 'success',
        text1: newSoundState ? 'Sounds enabled' : 'Sounds disabled',
        position: 'bottom'
      });
    } catch (error) {
      console.error('Error toggling sound settings:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update sound settings',
        position: 'bottom'
      });
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
      style={[styles.gradient, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView
        style={styles.container}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >


        <Header
          learnerInfo={learnerInfo}
        />

        <ThemedView style={styles.content}>
          <ThemedView style={[styles.profileCard, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.text }]}>🔹 What do we call our quiz champion?</ThemedText>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                    borderColor: colors.border,
                    color: colors.text
                  }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor={isDark ? colors.textSecondary : '#94A3B8'}
                  testID='profile-name-input'
                  maxLength={50}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.text }]}>🏆 Grade</ThemedText>
                <View style={[styles.pickerContainer, {
                  backgroundColor: isDark ? colors.surface : '#FFFFFF',
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  ...(Platform.OS === 'android' && {
                    elevation: 0,
                    overflow: 'hidden'
                  })
                }]}>
                  <Picker
                    selectedValue={editGrade}
                    onValueChange={setEditGrade}
                    style={[
                      styles.picker,
                      Platform.OS === 'android' ? {
                        backgroundColor: 'transparent',
                        color: colors.text,
                        height: 50
                      } : {
                        color: colors.text
                      }
                    ]}
                    dropdownIconColor={colors.text}
                    mode="dropdown"
                  >
                    <Picker.Item
                      label="Select Grade"
                      value=""
                      color={isDark ? colors.textSecondary : '#94A3B8'}
                      style={{
                        backgroundColor: isDark ? colors.surface : '#FFFFFF',
                      }}
                    />
                    {grades.map((grade) => (
                      <Picker.Item
                        key={grade.id}
                        label={`Grade ${grade.number}`}
                        value={grade.number.toString()}
                        color={isDark ? colors.text : '#1E293B'}
                        style={{
                          backgroundColor: isDark ? colors.surface : '#FFFFFF',
                        }}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.text }]}>🏫 School</ThemedText>
                {editSchool && (
                  <View style={[styles.selectedSchoolContainer, {
                    backgroundColor: isDark ? colors.surface : 'rgba(226, 232, 240, 0.3)'
                  }]}>
                    <ThemedText style={[styles.selectedSchoolName, { color: colors.text }]}>{editSchool}</ThemedText>
                    <ThemedText style={[styles.selectedSchoolAddress, { color: colors.textSecondary }]}>{editSchoolAddress}</ThemedText>
                  </View>
                )}
                <View style={styles.searchWrapper}>
                  <GooglePlacesAutocomplete
                    placeholder="🔍 Search for your school..."
                    onPress={async (data, details = null) => {
                      // Log school change event
                      await logAnalyticsEvent('school_change', {
                        user_id: user?.uid,
                        old_school: editSchool,
                        new_school: data.structured_formatting.main_text,
                        school_address: data.description
                      });

                      setEditSchool(data.structured_formatting.main_text);
                      setEditSchoolAddress(data.description);
                      if (details) {
                        setEditSchoolLatitude(details.geometry.location.lat);
                        setEditSchoolLongitude(details.geometry.location.lng);
                      }

                      // Force a re-render by triggering a state update
                      setTimeout(() => {
                        // This empty setState forces a re-render
                        setEditName(prev => prev);

                        // Clear the search input
                        if (googlePlacesRef.current) {
                          googlePlacesRef.current.clear();
                          googlePlacesRef.current.blur();
                        }
                      }, 100);
                    }}
                    fetchDetails={true}
                    query={{
                      key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || "",
                      components: 'country:za',
                      types: 'school',
                      language: 'en',
                    }}
                    enablePoweredByContainer={false}
                    textInputProps={{
                      clearButtonMode: 'while-editing',
                      autoCorrect: false,
                      autoCapitalize: 'none',
                      placeholderTextColor: isDark ? colors.textSecondary : '#94A3B8',
                      selectionColor: colors.primary,
                    }}
                    styles={{
                      container: [
                        styles.searchContainer,
                        Platform.OS === 'android' && { elevation: 0 }
                      ],
                      textInput: [
                        styles.searchInput,
                        {
                          backgroundColor: isDark ? colors.surface : '#FFFFFF',
                          color: colors.text,
                          borderColor: colors.border
                        }
                      ],
                      listView: [
                        styles.searchListView,
                        {
                          backgroundColor: isDark ? colors.surface : '#FFFFFF',
                          borderColor: colors.border,
                          borderWidth: Platform.OS === 'android' ? 1 : 0,
                        }
                      ],
                      row: {
                        backgroundColor: isDark ? colors.surface : '#FFFFFF'
                      },
                      separator: {
                        backgroundColor: colors.border,
                        height: StyleSheet.hairlineWidth
                      },
                      description: {
                        color: colors.text
                      },
                      powered: {
                        display: 'none'
                      }
                    }}
                    ref={googlePlacesRef}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.text }]}>📖 Choose Your Curriculums</ThemedText>
                <ThemedText style={[styles.smallLabel, { color: colors.textSecondary }]}>Only questions from the selected curriculum\s will appear in the quiz.</ThemedText>

                <View style={styles.optionsContainer}>
                  {CURRICULA.map((curr) => (
                    <TouchableOpacity
                      key={curr}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: isDark ? colors.surface : 'rgba(226, 232, 240, 0.3)',
                          borderColor: colors.border
                        },
                        editCurriculum.split(',').map(c => c.trim()).includes(curr) && [
                          styles.optionButtonSelected,
                          { backgroundColor: colors.primary }
                        ]
                      ]}
                      onPress={() => {
                        const currArray = editCurriculum.split(',').map(c => c.trim()).filter(Boolean);
                        if (currArray.includes(curr)) {
                          setEditCurriculum(currArray.filter(c => c !== curr).join(','));
                        } else {
                          setEditCurriculum(currArray.concat(curr).join(','));
                        }

                        // Log curriculum change event
                        logAnalyticsEvent('curriculum_change', {
                          user_id: user?.uid,
                          curriculum: currArray.includes(curr) ?
                            currArray.filter(c => c !== curr).join(',') :
                            currArray.concat(curr).join(',')
                        });
                      }}
                    >
                      <ThemedText style={[
                        styles.optionButtonText,
                        { color: colors.text },
                        editCurriculum.split(',').map(c => c.trim()).includes(curr) &&
                        styles.optionButtonTextSelected
                      ]}>
                        {curr}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.text }]}>🔹 Which terms are you mastering today? Choose wisely! 💡</ThemedText>
                <ThemedText style={[styles.smallLabel, { color: colors.textSecondary }]}>Only questions from the selected terms will appear in the quiz.</ThemedText>

                <View style={styles.optionsContainer}>
                  {TERMS.map((term) => (
                    <TouchableOpacity
                      key={term}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: isDark ? colors.surface : 'rgba(226, 232, 240, 0.3)',
                          borderColor: colors.border
                        },
                        editTerms.split(',').map(t => t.trim()).includes(term.toString()) && [
                          styles.optionButtonSelected,
                          { backgroundColor: colors.primary }
                        ]
                      ]}
                      onPress={() => {
                        const termsArray = editTerms.split(',').map(t => t.trim()).filter(Boolean);
                        if (termsArray.includes(term.toString())) {
                          setEditTerms(termsArray.filter(t => t !== term.toString()).join(','));
                        } else {
                          setEditTerms(termsArray.concat(term.toString()).join(','));
                        }

                        // Log terms change event
                        logAnalyticsEvent('terms_change', {
                          user_id: user?.uid,
                          terms: termsArray.includes(term.toString()) ?
                            termsArray.filter(t => t !== term.toString()).join(',') :
                            termsArray.concat(term.toString()).join(',')
                        });
                      }}
                    >
                      <ThemedText style={[
                        styles.optionButtonText,
                        { color: colors.text },
                        editTerms.split(',').map(t => t.trim()).includes(term.toString()) &&
                        styles.optionButtonTextSelected
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
                  { backgroundColor: colors.primary },
                  (!editCurriculum.split(',').filter(Boolean).length || !editTerms.split(',').filter(Boolean).length) &&
                  styles.buttonDisabled
                ]}
                onPress={handleSave}
                disabled={isSaving || !editCurriculum.split(',').filter(Boolean).length || !editTerms.split(',').filter(Boolean).length}
                testID='profile-save-button'
              >
                <ThemedText style={styles.buttonText}>
                  {isSaving ? 'Saving...' : 'Save your settings! 🔒'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </ThemedView>

        <ThemedView style={[styles.sectionCard, {
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderColor: colors.border
        }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Notifications</ThemedText>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingTitle, { color: colors.text }]}>Question Sounds</ThemedText>
              <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Play sounds for correct and incorrect answers
              </ThemedText>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={toggleSound}
              trackColor={{ false: isDark ? colors.border : '#E2E8F0', true: colors.primary }}
              thumbColor={soundEnabled ? '#FFFFFF' : '#FFFFFF'}
              testID="sound-toggle-switch"
            />
          </View>
        </ThemedView>

        <ThemedView style={[styles.sectionCard, {
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderColor: colors.border
        }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Help & Support</ThemedText>
          <TouchableOpacity
            style={[styles.infoButton, { backgroundColor: isDark ? colors.surface : '#F8FAFC' }]}
            onPress={() => router.push('/info')}
          >
            <View style={styles.infoButtonContent}>
              <View style={styles.infoButtonLeft}>
                <Ionicons name="information-circle-outline" size={24} color={colors.primary} />
                <ThemedText style={[styles.infoButtonText, { color: colors.text }]}>App Information & FAQs</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </ThemedView>

        <ThemedView style={styles.signOutContainer}>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? colors.surface : '#F8FAFC', borderColor: colors.border },
              ]}
              onPress={() => router.back()}
              disabled={isLoggingOut}
            >
              <ThemedText style={[styles.actionButtonText, { color: colors.text }]}>
                Close
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? '#DC2626' : '#F43F5E' },
                isLoggingOut && styles.buttonDisabled
              ]}
              onPress={handleLogout}
              disabled={isLoggingOut}
              testID='sign-out-button'
            >
              <ThemedText style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                {isLoggingOut ? 'Signing out...' : 'Sign Out'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.deleteAccountButton,
              {
                backgroundColor: isDark ? colors.surface : '#FEE2E2',
                borderColor: '#DC2626'
              },
              isLoggingOut && styles.buttonDisabled
            ]}
            onPress={() => setShowDeleteModal(true)}
            disabled={isLoggingOut}
          >
            <ThemedText style={[styles.deleteAccountText, { color: '#DC2626' }]}>
              Delete Account
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
      <Modal
        isVisible={showGradeChangeModal}
        onBackdropPress={() => setShowGradeChangeModal(false)}
        style={styles.modal}
        testID="grade-change-modal"
      >
        <View style={[styles.confirmationModal, {
          backgroundColor: isDark ? colors.card : '#FFFFFF'
        }]}>
          <View style={styles.confirmationHeader}>
            <ThemedText style={[styles.confirmationTitle, { color: colors.text }]}>🎓 Change Grade?</ThemedText>
          </View>
          <ThemedText style={[styles.confirmationText, { color: colors.textSecondary }]}>
            ⚠️ Heads up! Switching grades will wipe out your progress like a clean slate! 🧹✨

            Are you super sure you want to start fresh? 🚀
          </ThemedText>
          <View style={styles.confirmationButtons}>
            <TouchableOpacity
              style={[styles.paperButton]}
              onPress={() => setShowGradeChangeModal(false)}
            >
              <LinearGradient
                colors={isDark ? ['#475569', '#334155'] : ['#64748B', '#475569']}
                style={styles.paperButtonGradient}
              >
                <ThemedText style={styles.paperButtonText}>❌ Nope, Go Back!</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paperButton]}
              onPress={handleConfirm}
              testID="grade-change-confirm-button"
            >
              <LinearGradient
                colors={isDark ? ['#7C3AED', '#4F46E5'] : ['#9333EA', '#4F46E5']}
                style={styles.paperButtonGradient}
              >
                <ThemedText style={styles.paperButtonText}>✅ Yes, Let's Do It!</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        isVisible={showDeleteModal}
        onBackdropPress={() => setShowDeleteModal(false)}
        style={styles.modal}
      >
        <View style={[styles.confirmationModal, {
          backgroundColor: isDark ? colors.card : '#FFFFFF'
        }]}>
          <View style={styles.confirmationHeader}>
            <ThemedText style={[styles.confirmationTitle, { color: colors.text }]}>⚠️ Delete Account?</ThemedText>
          </View>
          <ThemedText style={[styles.confirmationText, { color: colors.textSecondary }]}>
            This action cannot be undone. All your data, including progress, settings, and history will be permanently deleted.
          </ThemedText>

          <View style={styles.deleteConfirmationContainer}>
            <ThemedText style={[styles.deleteConfirmationText, { color: colors.textSecondary }]}>
              Type <ThemedText style={[styles.deleteConfirmationHighlight, { color: '#DC2626' }]}>delete</ThemedText> to confirm
            </ThemedText>
            <TextInput
              style={[styles.deleteConfirmationInput, {
                backgroundColor: isDark ? colors.surface : '#F8FAFC',
                borderColor: colors.border,
                color: colors.text
              }]}
              value={deleteConfirmation}
              onChangeText={setDeleteConfirmation}
              placeholder="Type 'delete'"
              placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={50}
            />
          </View>

          <View style={styles.confirmationButtons}>
            <TouchableOpacity
              style={[styles.paperButton]}
              onPress={() => {
                setShowDeleteModal(false);
                setDeleteConfirmation('');
              }}
            >
              <LinearGradient
                colors={isDark ? ['#475569', '#334155'] : ['#64748B', '#475569']}
                style={styles.paperButtonGradient}
              >
                <ThemedText style={styles.paperButtonText}>Cancel</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paperButton,
                deleteConfirmation !== 'delete' && styles.paperButtonDisabled
              ]}
              onPress={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmation !== 'delete'}
            >
              <LinearGradient
                colors={['#DC2626', '#B91C1C']}
                style={styles.paperButtonGradient}
              >
                <ThemedText style={styles.paperButtonText}>
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <CustomAlert />
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
    paddingBottom: 16,
  },
  closeIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    width: '100%',
  },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveButton: {
    borderRadius: 8,
    padding: 16,
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
    marginBottom: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'ios' && {
      overflow: 'visible'
    })
  },
  picker: {
    width: '100%',
    ...(Platform.OS === 'ios' && {
      height: 150
    }),
    ...(Platform.OS === 'android' && {
      height: 50
    })
  },
  pickerIOS: {
    height: 150,
  },
  pickerItemIOS: {
    height: 150,
    fontSize: 16,
  },
  signOutContainer: {
    padding: 20,
    marginTop: 20,
    backgroundColor: 'transparent',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
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
    borderRadius: 12,
    padding: 24,
    width: Platform.OS === 'web' ? 400 : '80%',
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
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: 16,
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
    marginTop: 12,
  },
  email: {
    fontSize: 16,
    marginTop: 4,
  },
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  logoutButton: {
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
  },
  infoLabel: {
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  searchWrapper: {
    marginTop: 8,
    zIndex: 1,
    position: 'relative',
    height: 50,
    marginBottom: 60,
  },
  searchContainer: {
    flex: 0,
    width: '100%',
    position: 'absolute',
    zIndex: 2,
  },
  searchInput: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  searchListView: {
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
    borderWidth: 1,
  },
  optionButtonSelected: {
    borderColor: '#7C3AED',
  },
  optionButtonText: {
    fontSize: 14,
  },
  optionButtonTextSelected: {
    color: '#FFFFFF',
  },
  timeContainer: {
    height: 300,
    marginTop: 8,
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
    borderRadius: 12,
  },
  selectedSchoolName: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectedSchoolAddress: {
    fontSize: 14,
    marginTop: 4,
  },
  deleteAccountButton: {
    borderWidth: 1,
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteAccountText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteConfirmationContainer: {
    marginVertical: 16,
    width: '100%',
  },
  deleteConfirmationText: {
    fontSize: 14,
    marginBottom: 8,
  },
  deleteConfirmationHighlight: {
    fontWeight: '600',
  },
  deleteConfirmationInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    width: '100%',
  },
  paperButtonDisabled: {
    opacity: 0.5,
  },
  clearSchoolButton: {
    marginTop: 8,
    padding: 6,
    alignSelf: 'flex-start',
    borderRadius: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoButton: {
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
}); 