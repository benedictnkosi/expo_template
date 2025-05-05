import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../components/ThemedText';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import RegisterForm from './components/RegisterForm';
import { analytics } from '../services/analytics';
import { API_BASE_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { createLearner } from '@/services/api';

const SUPERHERO_NAMES = [
  'Spider-Man',
  'Iron Man',
  'Captain America',
  'Black Panther',
  'Doctor Strange',
  'Scarlet Witch',
  'Hawkeye',
  'Wolverine',
  'Storm',
  'Ms. Marvel',
  'Moon Knight',
  'Silver Surfer',
  'She-Hulk',
  'Daredevil',
  'Shang-Chi',
  'Superman',
  'Batman',
  'Wonder Woman',
  'The Flash',
  'Aquaman',
  'Green Lantern',
  'Cyborg',
  'Martian Manhunter',
  'Zatanna',
  'Nightwing',
  'Shazam',
  'Hawkman',
  'Green Arrow',
  'Blue Beetle',
  'Batgirl'
];

function getRandomSuperheroName(): string {
  const randomIndex = Math.floor(Math.random() * SUPERHERO_NAMES.length);
  return SUPERHERO_NAMES[randomIndex];
}

// Add function before WebBrowser.maybeCompleteAuthSession()
async function getSchoolFunfacts(schoolName: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/school/fact?school_name=${encodeURIComponent(schoolName)}`);
    const data = await response.json();
    if (data.status === "OK") {
      return {
        fact: data.fact
      };
    }
    throw new Error('Failed to fetch school facts');
  } catch (error) {
    console.error('Error fetching school facts:', error);
    return {
      fact: `${schoolName} is a great place to learn!`
    };
  }
}

WebBrowser.maybeCompleteAuthSession();

const ILLUSTRATIONS = {
  welcome: require('@/assets/images/illustrations/school.png'),
  grade: require('@/assets/images/illustrations/stressed.png'),
  school: require('@/assets/images/illustrations/friends.png'),
  ready: require('@/assets/images/illustrations/exam.png'),
};

type AvatarImages = {
  [key: string]: any;
};

const AVATAR_IMAGES: AvatarImages = {
  '1': require('@/assets/images/avatars/1.png'),
  '2': require('@/assets/images/avatars/2.png'),
  '3': require('@/assets/images/avatars/3.png'),
  '4': require('@/assets/images/avatars/4.png'),
  '5': require('@/assets/images/avatars/5.png'),
  '6': require('@/assets/images/avatars/6.png'),
  '7': require('@/assets/images/avatars/7.png'),
  '8': require('@/assets/images/avatars/8.png'),
  '9': require('@/assets/images/avatars/9.png'),
};

export interface OnboardingData {
  grade: string;
  curriculum: string;
  difficultSubject: string;
  avatar: string;
  school?: string;
  school_address?: string;
  school_latitude?: string | number;
  school_longitude?: string | number;
}

// Helper function for safe analytics logging
async function logAnalyticsEvent(eventName: string, eventParams?: Record<string, any>) {
  try {
    await analytics.track(eventName, eventParams);
  } catch (error) {
    console.error('[Analytics] Error logging event:', error);
  }
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [grade, setGrade] = useState('');
  const [difficultSubject, setDifficultSubject] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('1');
  const [registrationMethod, setRegistrationMethod] = useState<'email' | 'phone'>('email');
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [errors, setErrors] = useState({
    grade: '',
    curriculum: ''
  });

  useEffect(() => {
    async function checkAuthAndOnboarding() {
      try {
        const authData = await SecureStore.getItemAsync('auth');
        const onboardingData = await AsyncStorage.getItem('onboardingData');

        if (authData && onboardingData) {
          const parsedOnboarding = JSON.parse(onboardingData);
          if (parsedOnboarding.onboardingCompleted && !router.canGoBack()) {
            router.replace('/(tabs)');
          }
        }

        logAnalyticsEvent('onboarding_step_started', {
          step_number: step + 1,
          step_name: getStepName(step)
        });
      } catch (error) {
        console.error('Error checking auth and onboarding:', error);
      }
    }

    checkAuthAndOnboarding();
  });

  const handleNextStep = () => {
    logAnalyticsEvent('onboarding_step_complete', {
      step_number: step + 1,
      step_name: getStepName(step)
    });
    if (step === 1 && !grade) {
      setErrors(prev => ({ ...prev, grade: 'Please select your grade' }));
    } else if (step === 2 && !difficultSubject) {
      setErrors(prev => ({ ...prev, difficultSubject: 'Please select your most challenging subject' }));
    } else if (step === 3 && !selectedAvatar) {
      setErrors(prev => ({ ...prev, selectedAvatar: 'Please select an avatar' }));
    } else if (step === 5) {
      handleComplete();
    } else {
      setErrors({ grade: '', curriculum: '' });
      setStep(step + 1);
    }
  };

  const getStepName = (step: number): string => {
    switch (step) {
      case 0:
        return 'welcome';
      case 1:
        return 'grade_selection';
      case 2:
        return 'difficult_subject_selection';
      case 3:
        return 'avatar_selection';
      case 4:
        return 'auth_options';
      case 5:
        return 'registration';
      default:
        return 'unknown';
    }
  };

  const handleComplete = async () => {
    try {
      // Store onboarding data
      await AsyncStorage.setItem('onboardingData', JSON.stringify({
        grade,
        curriculum: 'CAPS',
        difficultSubject,
        avatar: selectedAvatar,
        onboardingCompleted: true
      }));

      // Log onboarding completion event
      logAnalyticsEvent('onboarding_complete', {
        grade,
        curriculum: 'CAPS',
        difficult_subject: difficultSubject,
        avatar: selectedAvatar
      });

      // Navigate to registration screen
      router.push({
        pathname: '/register',
        params: {
          grade,
          curriculum: 'CAPS',
          difficultSubject,
          avatar: selectedAvatar,
        }
      });

    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to complete registration',
        position: 'bottom'
      });
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={[styles.step, { justifyContent: 'flex-start', paddingTop: 40 }]} testID="welcome-step">
            <View style={{ width: '100%', height: 200, marginBottom: 40 }}>
              <Image
                source={ILLUSTRATIONS.welcome}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
                testID="welcome-illustration"
              />
            </View>
            <View style={[styles.textContainer, { paddingHorizontal: 20 }]} testID="welcome-text-container">
              <ThemedText style={[styles.welcomeTitle, { fontSize: 28, marginBottom: 24 }]} testID="welcome-title">
                🎉 Welcome to Exam Quiz! 🚀
              </ThemedText>
              <ThemedText style={[styles.welcomeText, { fontSize: 20, lineHeight: 32, marginBottom: 24 }]} testID="welcome-description">
                📝 Get ready to boost your brainpower and ace your exams! 🏆
              </ThemedText>
              <ThemedText style={[styles.statsText, { fontSize: 18, lineHeight: 28 }]} testID="welcome-stats">
                💡 Join 4,000+ students sharpening their skills with 8,000+ brain-boosting questions every day! 🧠🔥
              </ThemedText>
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.step} testID="grade-selection-step">
            <Image
              source={ILLUSTRATIONS.grade}
              style={styles.illustration}
              resizeMode="contain"
              testID="grade-illustration"
            />
            <View style={styles.textContainer}>
              <ThemedText style={styles.stepTitle} testID="grade-step-title">What grade are you in?</ThemedText>
              <View style={styles.gradeButtons} testID="grade-buttons-container">
                {[10, 11, 12].map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[
                      styles.gradeButton,
                      grade === g.toString() && styles.gradeButtonSelected
                    ]}
                    onPress={() => {
                      setGrade(g.toString());
                      setErrors(prev => ({ ...prev, grade: '' }));
                    }}
                    testID={`grade-button-${g}`}
                  >
                    <ThemedText
                      style={[
                        styles.gradeButtonText,
                        grade === g.toString() && styles.gradeButtonTextSelected
                      ]}
                      testID={`grade-button-text-${g}`}
                    >
                      Grade {g}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.grade ? <ThemedText style={styles.errorText} testID="grade-error">{errors.grade}</ThemedText> : null}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.step}>
            <View style={styles.textContainer}>
              <ThemedText style={styles.stepTitle}>
                🤔 Which subject challenges you the most?
              </ThemedText>
              <ThemedText style={styles.stepSubtitle}>
                We'll give extra attention to this one! 💪
              </ThemedText>
            </View>
            <ScrollView
              style={styles.subjectsScrollView}
              contentContainerStyle={styles.subjectsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.subjectButtons}>
                {[
                  { id: 'mathematics', label: 'Mathematics', emoji: '1️⃣' },
                  { id: 'physics', label: 'Physical Sciences', emoji: '⚡' },
                  { id: 'life_sciences', label: 'Life Sciences', emoji: '🧬' },
                  { id: 'accounting', label: 'Accounting', emoji: '📊' },
                  { id: 'other', label: 'Other', emoji: '📚' }
                ].map((subject) => (
                  <TouchableOpacity
                    key={subject.id}
                    style={[
                      styles.subjectButton,
                      difficultSubject === subject.id && styles.subjectButtonSelected
                    ]}
                    onPress={() => setDifficultSubject(subject.id)}
                    testID={`subject-button-${subject.id}`}
                  >
                    <View style={styles.subjectContent}>
                      <ThemedText style={styles.subjectEmoji}>{subject.emoji}</ThemedText>
                      <ThemedText
                        style={[
                          styles.subjectButtonText,
                          difficultSubject === subject.id && styles.subjectButtonTextSelected
                        ]}
                      >
                        {subject.label}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        );

      case 3:
        return (
          <View style={styles.step}>
            <View style={styles.textContainer}>
              <ThemedText style={styles.stepTitle}>
                🎨 Choose Your Avatar
              </ThemedText>
              <ThemedText style={styles.stepSubtitle}>
                Pick a cool avatar to represent you! ✨
              </ThemedText>
            </View>
            <ScrollView
              style={styles.avatarsScrollView}
              contentContainerStyle={styles.avatarsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.avatarsGrid}>
                {Object.keys(AVATAR_IMAGES).map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.avatarButton,
                      selectedAvatar === num && styles.avatarButtonSelected
                    ]}
                    onPress={() => setSelectedAvatar(num)}
                    testID={`avatar-button-${num}`}
                  >
                    <Image
                      source={AVATAR_IMAGES[num]}
                      style={styles.avatarImage}
                      resizeMode="cover"
                    />
                    {selectedAvatar === num && (
                      <View style={styles.avatarCheckmark}>
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        );

      case 4:
        return (
          <View style={styles.step} testID="auth-options-step">
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setStep(3)}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.textContainer}>
              <ThemedText style={styles.stepTitle} testID="auth-options-title">
                How would you like to continue?
              </ThemedText>
              <ThemedText style={styles.stepSubtitle} testID="auth-options-subtitle">
                Choose your preferred way to sign up
              </ThemedText>
            </View>
            <View style={styles.authOptionsContainer}>
              <TouchableOpacity
                style={[styles.authButton, styles.emailButton]}
                onPress={() => {
                  logAnalyticsEvent('auth_option_selected', { option: 'email' });
                  setRegistrationMethod('email');
                  setStep(5);
                }}
                testID="email-auth-button"
              >
                <Ionicons name="mail-outline" size={24} color="#FFFFFF" />
                <ThemedText style={styles.authButtonText}>Register with Email</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.authButton, styles.phoneButton]}
                onPress={() => {
                  logAnalyticsEvent('auth_option_selected', { option: 'phone' });
                  setRegistrationMethod('phone');
                  setStep(5);
                }}
                testID="phone-auth-button"
              >
                <Ionicons name="call-outline" size={24} color="#FFFFFF" />
                <ThemedText style={styles.authButtonText}>Register with Phone</ThemedText>
              </TouchableOpacity>

              <ThemedText style={styles.guestPromptText}>
                Not ready to register? Try our quiz as a guest!
              </ThemedText>

              <TouchableOpacity
                style={[styles.authButton, styles.guestButton]}
                onPress={async () => {
                  logAnalyticsEvent('auth_option_selected', { option: 'guest' });

                  // Generate a 16-character UID
                  const guestUid = Array.from(crypto.getRandomValues(new Uint8Array(8)))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join('')
                    .slice(0, 16);

                  const guestEmail = `${guestUid}@guest.com`;
                  const defaultPassword = 'password';

                  try {
                    // Register the guest user
                    const user = await signUp(guestEmail, defaultPassword);

                    // Create learner profile for guest
                    const learnerData = {
                      name: getRandomSuperheroName(),
                      grade: parseInt(grade),
                      school: 'Not specified',
                      school_address: '',
                      school_latitude: 0,
                      school_longitude: 0,
                      curriculum: 'CAPS',
                      terms: "1,2,3,4",
                      email: guestEmail,
                      avatar: selectedAvatar,
                    };

                    const learner = await createLearner(user.uid, learnerData);
                    if (learner.status !== 'OK') {
                      Toast.show({
                        type: 'error',
                        text1: 'Warning',
                        text2: 'Account created but failed to save preferences',
                        position: 'bottom'
                      });

                      await logAnalyticsEvent('register_failed', {
                        user_id: user.uid,
                        email: guestEmail,
                        error: learner.status
                      });
                    }

                    // Store onboarding data
                    await AsyncStorage.setItem('onboardingData', JSON.stringify({
                      grade,
                      curriculum: 'CAPS',
                      difficultSubject,
                      avatar: selectedAvatar,
                      onboardingCompleted: true,
                      isGuest: true
                    }));

                    // Log onboarding completion event
                    logAnalyticsEvent('register_success', {
                      grade,
                      curriculum: 'CAPS',
                      difficult_subject: difficultSubject,
                      avatar: selectedAvatar,
                      is_guest: true
                    });

                    // Store auth token
                    await SecureStore.setItemAsync('auth', JSON.stringify({ user }));

                    // Navigate to tabs
                    router.replace('/(tabs)');
                  } catch (error) {
                    console.error('Failed to create guest account:', error);
                    Toast.show({
                      type: 'error',
                      text1: 'Error',
                      text2: 'Failed to create guest account',
                      position: 'bottom'
                    });
                  }
                }}
                testID="guest-auth-button"
              >
                <Ionicons name="person-outline" size={24} color="#FFFFFF" />
                <ThemedText style={styles.authButtonText}>Try Quiz as Guest</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.step}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setStep(4)}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <ScrollView style={styles.registrationContainer}>
              <View style={styles.registrationHeader}>
                <ThemedText style={styles.registrationTitle}>Create Your Account</ThemedText>
                <ThemedText style={styles.registrationSubtitle}>
                  🎯 Almost there! Set up your account to start your learning journey.
                </ThemedText>
              </View>

              <RegisterForm
                onboardingData={{
                  grade,
                  curriculum: 'CAPS',
                  difficultSubject,
                  avatar: selectedAvatar,
                }}
                defaultMethod={registrationMethod}
              />
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return !!grade;
      case 2:
        return !!difficultSubject;
      case 3:
        return !!selectedAvatar;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return false;
    }
  };

  return (
    <LinearGradient
      colors={['#1B1464', '#2B2F77']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.content}>
        <View style={styles.stepContainer}>
          {renderStep()}
        </View>

        {step < 4 && (
          <View style={styles.buttonContainer} testID="navigation-buttons">
            {step === 0 ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => router.replace('/login')}
                  testID="login-button"
                >
                  <ThemedText style={styles.buttonText}>Back</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={() => setStep(1)}
                  testID="start-onboarding-button"
                >
                  <ThemedText style={[styles.buttonText, styles.primaryButtonText]}>
                    Start! 🚀
                  </ThemedText>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => setStep(step - 1)}
                  testID="previous-step-button"
                >
                  <ThemedText style={styles.buttonText}>Back</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.primaryButton,
                    (!canProceed() && step !== 0) && styles.buttonDisabled
                  ]}
                  onPress={handleNextStep}
                  disabled={!canProceed() && step !== 0}
                  testID="next-step-button"
                >
                  <ThemedText style={[
                    styles.buttonText,
                    styles.primaryButtonText,
                    (!canProceed() && step !== 0) && styles.buttonTextDisabled
                  ]}>
                    Next! 🚀
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  step: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  textContainer: {
    marginTop: 64,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  illustration: {
    width: '80%',
    height: 200,
    marginBottom: 24,
  },
  bigIllustration: {
    width: '100%',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  boastingText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginTop: 24,
  },

  welcomeText: {
    fontSize: 18,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 28,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  picker: {
    width: '100%',
    backgroundColor: '#F8FAFC',
  },
  searchContainer: {
    width: '100%',
    paddingHorizontal: 16,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    fontSize: 16,
    height: 56,
    paddingHorizontal: 20,
    color: '#1E293B',
  },
  statsText: {
    fontSize: 20,
    color: '#E2E8F0',
    lineHeight: 36,
    textAlign: 'center',
    marginTop: 32,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    marginTop: 'auto',
    marginBottom: 20,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryButtonText: {
    color: '#4d5ad3',
  },
  gradeButtons: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 20,
  },
  gradeButton: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  gradeButtonSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  gradeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gradeButtonTextSelected: {
    color: '#FFFFFF',
  },
  debugText: {
    color: '#E2E8F0',
  },
  buttonDisabled: {
    backgroundColor: '#94A3B8',
  },
  buttonTextDisabled: {
    color: '#E2E8F0',
  },
  errorText: {
    color: '#FCA5A5',
  },
  selectedSchoolContainer: {
    width: '90%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    padding: 20,
    marginTop: 20,
    marginHorizontal: 16,
    backdropFilter: 'blur(10px)',
  },
  selectedSchoolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
    gap: 8,
  },
  selectedSchoolTitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  selectedSchoolName: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedSchoolAddress: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 24,
  },
  timeStepContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  timeScrollContainer: {
    height: 400,
    width: '100%',
  },
  curriculumButtons: {
    width: '100%',
    gap: 12,
    paddingHorizontal: 20,
  },
  curriculumButton: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  curriculumButtonSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  curriculumButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  curriculumButtonTextSelected: {
    color: '#FFFFFF',
  },
  testimonialContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 20,
    alignItems: 'center',
  },
  testimonialRating: {
    fontSize: 22,
    color: '#FFD700',
    marginBottom: 8,
  },
  testimonialTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  testimonialText: {
    fontSize: 16,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planContainer: {
    flex: 1,
    paddingTop: 20,
  },
  planHeaderContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 24,
    position: 'relative',
  },
  planTitleContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  planTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  unlockText: {
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  trialBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  trialText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  planOption: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  selectedPlan: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  planOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  planLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planSubLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pricePeriod: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  savingsText: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 8,
  },
  featuresContainer: {
    width: '100%',
    marginTop: 24,
    marginBottom: 24,
  },
  checkmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkmarkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  cancelText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 24,
  },
  subscribeButton: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#1B1464',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingPlansContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingPlansCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingIconContainer: {
    position: 'relative',
    marginBottom: 24,
    alignItems: 'center',
  },
  loadingSpinner: {
    marginBottom: 20,
  },
  emojiContainer: {
    position: 'relative',
    marginTop: 16,
  },
  sparkleContainer: {
    position: 'absolute',
    top: -10,
    right: -15,
    transform: [{ rotate: '15deg' }],
  },
  sparkleEmoji: {
    fontSize: 22,
  },
  loadingPlansEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  loadingTextContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  loadingPlansText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    height: 8,
    alignItems: 'center',
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4d5ad3',
    marginHorizontal: 4,
  },
  loadingDot1: {
    opacity: 0.3,
  },
  loadingDot2: {
    opacity: 0.6,
  },
  loadingDot3: {
    opacity: 0.9,
  },
  loadingStepsContainer: {
    width: '100%',
    gap: 16,
  },
  loadingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 12,
  },
  loadingStepEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  loadingStepText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    flex: 1,
  },
  stepSubtitle: {
    fontSize: 18,
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: 16,
  },
  subjectsScrollView: {
    flex: 1,
    width: '100%',
  },
  subjectsScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  subjectButtons: {
    width: '100%',
    gap: 12,
    flex: 1,
  },
  subjectButton: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  subjectButtonSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  subjectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  subjectEmoji: {
    fontSize: 24,
  },
  subjectButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subjectButtonTextSelected: {
    color: '#FFFFFF',
    opacity: 1,
  },
  registrationContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  registrationHeader: {
    marginBottom: 32,
    alignItems: 'center',
  },
  registrationTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  registrationSubtitle: {
    fontSize: 16,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 24,
  },
  funFactContainer: {
    width: '90%',
    backgroundColor: 'rgba(77, 90, 211, 0.3)',
    borderRadius: 24,
    padding: 20,
    marginTop: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  funFactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  funFactTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  funFactText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    opacity: 0.9,
  },
  avatarsScrollView: {
    flex: 1,
    marginTop: 16,
  },
  avatarsScrollContent: {
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  avatarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  avatarButton: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  avatarButtonSelected: {
    borderColor: '#4F46E5',
    borderWidth: 3,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  skipButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    position: 'absolute',
    bottom: 0,
    zIndex: 1000,
  },
  skipButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  authOptionsContainer: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 16,
    marginTop: 32,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  emailButton: {
    backgroundColor: '#4F46E5',
  },
  phoneButton: {
    backgroundColor: '#3B82F6',
  },
  guestButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  authButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  guestPromptText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
});