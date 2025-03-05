import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, ScrollView, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../components/ThemedText';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import RegisterForm from './components/RegisterForm';
import { Analytics, logEvent } from 'firebase/analytics';
import { analytics } from '../config/firebase';

WebBrowser.maybeCompleteAuthSession();

const ILLUSTRATIONS = {
  welcome: require('@/assets/images/illustrations/school.png'),
  grade: require('@/assets/images/illustrations/stressed.png'),
  school: require('@/assets/images/illustrations/friends.png'),
  ready: require('@/assets/images/illustrations/exam.png'),
};

// Add checkmark component for plan features
const CheckmarkItem = ({ text }: { text: string }) => (
  <View style={styles.checkmarkItem}>
    <View style={styles.checkmarkCircle}>
      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
    </View>
    <ThemedText style={styles.checkmarkText}>{text}</ThemedText>
  </View>
);

// Helper function for safe analytics logging
function logAnalyticsEvent(eventName: string, eventParams?: Record<string, any>) {
  if (analytics) {
    const analyticsInstance = analytics as Analytics;
    logEvent(analyticsInstance, eventName, eventParams);
  }
}

export default function OnboardingScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [schoolLatitude, setSchoolLatitude] = useState(0);
  const [schoolLongitude, setSchoolLongitude] = useState(0);
  const [schoolName, setSchoolName] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const [difficultSubject, setDifficultSubject] = useState('');
  const insets = useSafeAreaInsets();
  const [errors, setErrors] = useState({
    grade: '',
    school: '',
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
  }, []);

  const handleNextStep = () => {
    logAnalyticsEvent('onboarding_step_complete', {
      step_number: step + 1,
      step_name: getStepName(step)
    });
    if (step === 1 && !grade) {
      setErrors(prev => ({ ...prev, grade: 'Please select your grade' }));
    } else if (step === 2 && !school) {
      setErrors(prev => ({ ...prev, school: 'Please select your school' }));
    } else if (step === 3 && !curriculum) {
      setErrors(prev => ({ ...prev, curriculum: 'Please select your curriculum' }));
    } else if (step === 4 && !difficultSubject) {
      setErrors(prev => ({ ...prev, difficultSubject: 'Please select your most challenging subject' }));
    } else if (step === 5) {
      handleComplete();
    } else {
      setErrors({ grade: '', school: '', curriculum: '' });
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
        return 'school_selection';
      case 3:
        return 'curriculum_selection';
      case 4:
        return 'difficult_subject_selection';
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
        school: schoolName,
        school_address: schoolAddress,
        school_latitude: schoolLatitude,
        school_longitude: schoolLongitude,
        curriculum,
        difficultSubject,
        onboardingCompleted: true
      }));

      // Log onboarding completion event
      logAnalyticsEvent('onboarding_complete', {
        grade,
        school_name: schoolName,
        school_address: schoolAddress,
        school_latitude: schoolLatitude,
        school_longitude: schoolLongitude,
        curriculum,
        difficult_subject: difficultSubject
      });

      // Navigate to registration screen
      router.push({
        pathname: '/register',
        params: {
          grade,
          school: schoolName,
          school_address: schoolAddress,
          school_latitude: schoolLatitude.toString(),
          school_longitude: schoolLongitude.toString(),
          curriculum,
          difficultSubject,
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
          <View style={[styles.step, { justifyContent: 'flex-start', paddingTop: 40 }]}>
            <View style={{ width: '100%', height: 200, marginBottom: 40 }}>
              <Image
                source={ILLUSTRATIONS.welcome}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </View>
            <View style={[styles.textContainer, { paddingHorizontal: 20 }]}>
              <ThemedText style={[styles.welcomeTitle, { fontSize: 28, marginBottom: 24 }]}>
                🎉 Welcome to Exam Quiz! 🚀
              </ThemedText>
              <ThemedText style={[styles.welcomeText, { fontSize: 20, lineHeight: 32, marginBottom: 24 }]}>
                📝 Get ready to boost your brainpower and ace your exams! 🏆
              </ThemedText>
              <ThemedText style={[styles.statsText, { fontSize: 18, lineHeight: 28 }]}>
                💡 Join 4,000+ students sharpening their skills with 8,000+ brain-boosting questions every day! 🧠🔥
              </ThemedText>
            </View>
          </View>
        );

      case 1:
        return (
          <View style={styles.step}>
            <Image
              source={ILLUSTRATIONS.grade}
              style={styles.illustration}
              resizeMode="contain"
            />
            <View style={styles.textContainer}>
              <ThemedText style={styles.stepTitle}>What grade are you in?</ThemedText>
              <View style={styles.gradeButtons}>
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
                  >
                    <ThemedText
                      style={[
                        styles.gradeButtonText,
                        grade === g.toString() && styles.gradeButtonTextSelected
                      ]}
                    >
                      Grade {g}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.grade ? <ThemedText style={styles.errorText}>{errors.grade}</ThemedText> : null}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.step}>
            <View style={styles.textContainer}>
              <ThemedText style={styles.stepTitle}>🎓 Which school do you rep?</ThemedText>
              <ThemedText style={styles.stepTitle}>Find your school and get ready to join the learning squad! 🚀📚</ThemedText>
              <GooglePlacesAutocomplete
                placeholder="🔍 Search for your school..."
                onPress={(data, details = null) => {
                  setSchool(data.description);
                  setSchoolName(data.structured_formatting.main_text);
                  setSchoolAddress(data.description);
                  setErrors(prev => ({ ...prev, school: '' }));
                  if (details) {
                    setSchoolLatitude(details.geometry.location.lat);
                    setSchoolLongitude(details.geometry.location.lng);
                  }
                }}
                fetchDetails={true}
                onFail={error => console.error('GooglePlaces error:', error)}
                styles={{
                  container: styles.searchContainer,
                  textInput: styles.searchInput,
                  listView: {
                    position: 'absolute',
                    top: 60,
                    left: 16,
                    right: 16,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    elevation: 3,
                    zIndex: 1000,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                  },
                  row: {
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
                  },
                  description: {
                    fontSize: 16,
                    color: '#1E293B',
                  },
                }}
                textInputProps={{
                  placeholderTextColor: 'rgba(0, 0, 0, 0.5)',
                  selectionColor: '#4338CA',
                }}
                query={{
                  key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || "",
                  components: 'country:za',
                  types: 'school',
                  language: 'en',
                }}
              />
              {school && (
                <View style={styles.selectedSchoolContainer}>
                  <View style={styles.selectedSchoolHeader}>
                    <ThemedText style={styles.selectedSchoolTitle}>🏫 Selected</ThemedText>
                  </View>
                  <ThemedText style={styles.selectedSchoolName}>{school}</ThemedText>
                </View>
              )}
              {errors.school ? <ThemedText style={styles.errorText}>{errors.school}</ThemedText> : null}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.step}>
            <Image
              source={ILLUSTRATIONS.school}
              style={styles.illustration}
              resizeMode="contain"
            />
            <View style={styles.textContainer}>
              <ThemedText style={styles.stepTitle}>📚 Which curriculum are you following?</ThemedText>
              <View style={styles.curriculumButtons}>
                {[
                  { id: 'CAPS', label: 'CAPS', emoji: '📘' },
                  { id: 'IEB', label: 'IEB', emoji: '📗' }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.curriculumButton,
                      curriculum === item.id && styles.curriculumButtonSelected
                    ]}
                    onPress={() => {
                      setCurriculum(item.id);
                      setErrors(prev => ({ ...prev, curriculum: '' }));
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.curriculumButtonText,
                        curriculum === item.id && styles.curriculumButtonTextSelected
                      ]}
                    >
                      {item.emoji} {item.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.curriculum ? <ThemedText style={styles.errorText}>{errors.curriculum}</ThemedText> : null}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.step}>
            <Image
              source={ILLUSTRATIONS.school}
              style={styles.illustration}
              resizeMode="contain"
            />
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
                  { id: 'geography', label: 'Geography', emoji: '🌍' },
                  { id: 'english', label: 'English', emoji: '📚' }
                ].map((subject) => (
                  <TouchableOpacity
                    key={subject.id}
                    style={[
                      styles.subjectButton,
                      difficultSubject === subject.id && styles.subjectButtonSelected
                    ]}
                    onPress={() => setDifficultSubject(subject.id)}
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
                  school: schoolName,
                  school_address: schoolAddress,
                  school_latitude: schoolLatitude.toString(),
                  school_longitude: schoolLongitude.toString(),
                  curriculum,
                  difficultSubject,
                }}
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
        return !!school;
      case 3:
        return !!curriculum;
      case 4:
        return !!difficultSubject;
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

        {step < 5 && (
          <View style={styles.buttonContainer}>
            {step === 0 ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => router.replace('/login')}
                >
                  <ThemedText style={styles.buttonText}>Back</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={() => setStep(1)}
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
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  illustration: {
    width: '100%',
    height: 200,
    marginBottom: 24,
  },
  bigIllustration: {
    width: '100%',
    marginBottom: 40,
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
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
    marginTop: 16,
  },
  subjectsScrollContent: {
    paddingBottom: 32,
  },
  subjectButtons: {
    width: '100%',
    gap: 12,
  },
  subjectButton: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
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
});