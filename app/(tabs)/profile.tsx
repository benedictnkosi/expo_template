import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
import Toast from 'react-native-toast-message';
import Modal from 'react-native-modal';
import { LessonHeader } from '@/components/LessonHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, TouchableOpacity, ScrollView, TextInput, Platform, StyleSheet, Switch, Linking } from 'react-native';
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileInfo {
  name: string;
  grade: string;
  terms?: string;
  email?: string;
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
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editTerms, setEditTerms] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig] = useState<{
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
  const [newThreadNotification, setNewThreadNotification] = useState(true);

  // Available options
  const TERMS = [1, 2, 3, 4];

  useEffect(() => {
    // Initialize with mock data
    setProfileInfo({
      name: 'John Doe',
      grade: '10',
      terms: '1, 2',
      email: user?.email || ''
    });
    setEditName('John Doe');
    setEditGrade('10');
    setEditTerms('1, 2');
  }, [user?.email]);

  useEffect(() => {
    // Mock grades data
    setGrades([
      { id: 1, number: 10, active: 1 },
      { id: 2, number: 11, active: 1 },
      { id: 3, number: 12, active: 1 }
    ]);
  }, []);

  useEffect(() => {
    // Check if sound is enabled
    AsyncStorage.getItem('soundEnabled').then(value => {
      setSoundEnabled(value === null ? true : value === 'true');
    });

    // Check if new thread notifications are enabled
    AsyncStorage.getItem('newThreadNotification').then(value => {
      setNewThreadNotification(value === null ? true : value === 'true');
    });
  }, []);

  const handleSave = async () => {
    const selectedTerms = editTerms.split(',').map(t => t.trim()).filter(Boolean);

    if (selectedTerms.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'Missing Selection',
        text2: 'Please select at least one term',
        position: 'bottom'
      });
      return;
    }

    if (editGrade !== profileInfo?.grade) {
      setShowGradeChangeModal(true);
    } else {
      await saveChanges();
    }
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      const cleanTerms = editTerms.split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .join(', ');

      // Mock successful save
      setProfileInfo(prev => ({
        ...prev!,
        name: editName.trim(),
        grade: editGrade,
        terms: cleanTerms
      }));

      Toast.show({
        type: 'success',
        text1: 'Profile updated successfully',
        position: 'top',
        topOffset: 60,
        visibilityTime: 3000,
        autoHide: true
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update profile',
        position: 'top',
        topOffset: 60,
        visibilityTime: 3000,
        autoHide: true
      });
    } finally {
      setIsSaving(false);
      setShowGradeChangeModal(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
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
      // Mock successful deletion
      Toast.show({
        type: 'info',
        text1: 'Account deleted successfully',
        position: 'bottom'
      });

      setTimeout(async () => {
        await signOut();
      }, 3000);
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

  const toggleSound = async () => {
    try {
      const newSoundState = !soundEnabled;
      await AsyncStorage.setItem('soundEnabled', newSoundState.toString());
      setSoundEnabled(newSoundState);

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

  const toggleNewThreadNotification = async () => {
    try {
      const newNotificationState = !newThreadNotification;
      await AsyncStorage.setItem('newThreadNotification', newNotificationState.toString());
      setNewThreadNotification(newNotificationState);

      Toast.show({
        type: 'success',
        text1: newNotificationState ? 'New thread notifications enabled' : 'New thread notifications disabled',
        position: 'bottom'
      });
    } catch (error) {
      console.error('Error toggling notification settings:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update notification settings',
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
        <LessonHeader title="Profile" />

        <ThemedView style={styles.content}>
          <ThemedView style={[styles.profileCard, { backgroundColor: isDark ? colors.card : '#FFFFFF' }]}>
            <View style={styles.profileCardHeader}>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: isDark ? colors.surface : '#F8FAFC' }]}
                onPress={() => router.back()}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.text }]}>Name</ThemedText>
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
                  maxLength={50}
                />
                <ThemedText style={[styles.email, { color: colors.textSecondary, marginTop: 8 }]}>
                  {user?.email}
                </ThemedText>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.text }]}>Grade</ThemedText>
                <View style={[styles.pickerContainer, {
                  backgroundColor: isDark ? colors.surface : '#FFFFFF',
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
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
                    />
                    {grades.map((grade) => (
                      <Picker.Item
                        key={grade.id}
                        label={`Grade ${grade.number}`}
                        value={grade.number.toString()}
                        color={isDark ? colors.text : '#1E293B'}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.label, { color: colors.text }]}>Terms</ThemedText>
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
                  !editTerms.split(',').filter(Boolean).length &&
                  styles.buttonDisabled
                ]}
                onPress={handleSave}
                disabled={isSaving || !editTerms.split(',').filter(Boolean).length}
              >
                <ThemedText style={styles.buttonText}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </ThemedView>

        <ThemedView style={[styles.sectionCard, {
          backgroundColor: isDark ? colors.card : '#FFFFFF',
          borderColor: colors.border
        }]}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Settings</ThemedText>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingTitle, { color: colors.text }]}>Sound Effects</ThemedText>
              <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Play sounds for interactions
              </ThemedText>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={toggleSound}
              trackColor={{ false: isDark ? colors.border : '#E2E8F0', true: colors.primary }}
              thumbColor={soundEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingTitle, { color: colors.text }]}>Notifications</ThemedText>
              <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                Receive notifications for new content
              </ThemedText>
            </View>
            <Switch
              value={newThreadNotification}
              onValueChange={toggleNewThreadNotification}
              trackColor={{ false: isDark ? colors.border : '#E2E8F0', true: colors.primary }}
              thumbColor={newThreadNotification ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
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
      >
        <View style={[styles.confirmationModal, {
          backgroundColor: isDark ? colors.card : '#FFFFFF'
        }]}>
          <View style={styles.confirmationHeader}>
            <ThemedText style={[styles.confirmationTitle, { color: colors.text }]}>Change Grade?</ThemedText>
          </View>
          <ThemedText style={[styles.confirmationText, { color: colors.textSecondary }]}>
            Are you sure you want to change your grade? This will reset your progress.
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
                <ThemedText style={styles.paperButtonText}>Cancel</ThemedText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paperButton]}
              onPress={saveChanges}
            >
              <LinearGradient
                colors={isDark ? ['#7C3AED', '#4F46E5'] : ['#9333EA', '#4F46E5']}
                style={styles.paperButtonGradient}
              >
                <ThemedText style={styles.paperButtonText}>Confirm</ThemedText>
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
            <ThemedText style={[styles.confirmationTitle, { color: colors.text }]}>Delete Account?</ThemedText>
          </View>
          <ThemedText style={[styles.confirmationText, { color: colors.textSecondary }]}>
            This action cannot be undone. All your data will be permanently deleted.
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
  content: {
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
  profileCardHeader: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
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
    zIndex: 1,
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
  buttonDisabled: {
    opacity: 0.5,
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
}); 