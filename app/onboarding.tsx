import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../components/ThemedText';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trackEvent, Events } from '../services/mixpanel';
import { updateLearner } from '../services/api';
import SelectTime from './onboarding/select-time';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Toast from 'react-native-toast-message';

WebBrowser.maybeCompleteAuthSession();

const ILLUSTRATIONS = {
  welcome: require('@/assets/images/illustrations/school.png'),
  grade: require('@/assets/images/illustrations/stressed.png'),
  school: require('@/assets/images/illustrations/friends.png'),
  ready: require('@/assets/images/illustrations/exam.png'),
};

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [schoolLatitude, setSchoolLatitude] = useState(0);
  const [schoolLongitude, setSchoolLongitude] = useState(0);
  const [schoolName, setSchoolName] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const insets = useSafeAreaInsets();
  const [errors, setErrors] = useState({
    grade: '',
    school: '',
    curriculum: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "198572112790-07sqf0e1f0ffp6q5oe6d1g50s86r5hsm.apps.googleusercontent.com",
    iosClientId: "198572112790-4m348foju37agudmcrs7e5rp0n4ld9g2.apps.googleusercontent.com",
    webClientId: "198572112790-1mqjuhlehqga7m67lkka2b3cfbj8dqjk.apps.googleusercontent.com"
  });

  useEffect(() => {
    async function checkAuthAndOnboarding() {
      try {
        const forcedOnboarding = await AsyncStorage.getItem('forcedOnboarding');
        if (forcedOnboarding) {
          // If we're forcing onboarding, just stay here
          return;
        }

        const authData = await SecureStore.getItemAsync('auth');
        const onboardingData = await AsyncStorage.getItem('onboardingData');

        if (authData && onboardingData) {
          const parsedOnboarding = JSON.parse(onboardingData);
          if (parsedOnboarding.onboardingCompleted) {
            router.replace('/(tabs)');
          }
        }
      } catch (error) {
        console.error('Error checking auth and onboarding:', error);
      }
    }

    checkAuthAndOnboarding();
  }, []);

  useEffect(() => {
    handleGoogleSignInResponse();
  }, [response]);

  async function handleGoogleSignInResponse() {
    if (response?.type === 'success' && response.authentication) {
      setIsLoading(true);
      try {
        const { authentication } = response;
        const userInfoResponse = await fetch(
          'https://www.googleapis.com/userinfo/v2/me',
          {
            headers: { Authorization: `Bearer ${authentication.accessToken}` },
          }
        );

        const googleUser = await userInfoResponse.json();
        console.log('Full Google User Response:', googleUser);

        const userId = googleUser.sub || googleUser.id;
        console.log('User ID (sub/id):', userId);

        if (!userId) {
          throw new Error('No user ID received from Google');
        }

        // Store auth data
        const userData = {
          authentication,
          userInfo: {
            id: userId,
            uid: userId,
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture
          }
        };

        await SecureStore.setItemAsync('auth', JSON.stringify(userData));

        console.log('User data:', userData);
        // Create learner with onboarding data
        const onboardingData = await AsyncStorage.getItem('onboardingData');
        if (onboardingData) {
          const parsedOnboarding = JSON.parse(onboardingData);
          console.log('Onboarding data:', parsedOnboarding);

          // Format the data to match the expected API structure
          const learnerData = {
            name: googleUser.name,
            grade: parsedOnboarding.grade.toString(),
            school: parsedOnboarding.school,
            school_address: parsedOnboarding.school_address,
            school_latitude: parsedOnboarding.school_latitude,
            school_longitude: parsedOnboarding.school_longitude,
            curriculum: "IEB,CAPS",
            terms: "1,2,3,4",
            notification_hour: 18,
          };

          console.log('Sending learner data to API:', learnerData);
          const learner = await updateLearner(userId, learnerData);

          console.log('Learner update response:', learner);

          if (learner.status !== 'OK') {
            //show user message
            Toast.show({
              type: 'error',
              text1: 'Failed to create learner profile',
              text2: 'Please try again',
              position: 'bottom'
            });
          } else {
            router.replace('/(tabs)');
          }
        } else {
          console.log('No onboarding data found');
        }
      } catch (error: any) {
        console.error('Sign in error:', error);
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: error.message || 'Please try again',
          position: 'bottom'
        });
      } finally {
        setIsLoading(false);
      }
    }
  }

  const handleComplete = async () => {
    try {
      const onboardingData = {
        grade: parseInt(grade),
        school: schoolName,
        school_address: schoolAddress,
        school_latitude: schoolLatitude,
        school_longitude: schoolLongitude,
        curriculum: [curriculum],
        onboardingCompleted: true
      };

      await AsyncStorage.setItem('onboardingData', JSON.stringify(onboardingData));
      await AsyncStorage.removeItem('forcedOnboarding');

      trackEvent(Events.COMPLETE_ONBOARDING, {
        grade,
        school: schoolName,
        curriculum: [curriculum]
      });

      if (!request) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Cannot start Google sign in',
          position: 'bottom'
        });
        return;
      }

      setIsLoading(true);
      await promptAsync();

    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to complete registration',
        position: 'bottom'
      });
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.step}>
            <Image
              source={ILLUSTRATIONS.welcome}
              style={styles.bigIllustration}
              resizeMode="contain"
            />
            <View style={styles.textContainer}>
              <ThemedText style={styles.welcomeTitle}>🎉 Welcome to Exam Quiz! 🚀</ThemedText>
              <ThemedText style={styles.welcomeText}>
                📝 Get ready to boost your brainpower and ace your exams! 🏆
              </ThemedText>
              <ThemedText style={styles.statsText}>
                💡 Join 6,000+ students sharpening their skills with 18,000+ brain-boosting questions every day! 🧠🔥
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
              source={ILLUSTRATIONS.ready}
              style={styles.illustration}
              resizeMode="contain"
            />
            <View style={styles.textContainer}>
              <ThemedText style={styles.stepTitle}>🎉 You're all set! 🚀</ThemedText>
              <ThemedText style={styles.stepTitle}>Welcome to the Ultimate Exam Challenge! 🏆</ThemedText>
              <ThemedText style={styles.statsText}>
                💡 Join 6,000+ students sharpening their skills with 18,000+ brain-boosting questions every day! 🧠🔥
              </ThemedText>
            </View>
          </View>
        );
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
        return true;
      default:
        return false;
    }
  };

  return (
    <LinearGradient
      colors={['#4d5ad3', '#7983e6']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.content}>
        <View style={styles.stepContainer}>
          {renderStep()}
        </View>

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
                onPress={() => {
                  if (step === 4) {
                    handleComplete();
                  } else if (step === 1 && !grade) {
                    setErrors(prev => ({ ...prev, grade: 'Please select your grade' }));
                  } else if (step === 2 && !school) {
                    setErrors(prev => ({ ...prev, school: 'Please select your school' }));
                  } else if (step === 3 && !curriculum) {
                    setErrors(prev => ({ ...prev, curriculum: 'Please select your curriculum' }));
                  } else {
                    setErrors({ grade: '', school: '', curriculum: '' });
                    setStep(step + 1);
                  }
                }}
                disabled={!canProceed() && step !== 0}
              >
                <ThemedText style={[
                  styles.buttonText,
                  styles.primaryButtonText,
                  (!canProceed() && step !== 0) && styles.buttonTextDisabled
                ]}>
                  {step === 4 ? '👉 Sign-in' : 'Next! 🚀'}
                </ThemedText>
              </TouchableOpacity>
            </>
          )}
        </View>
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
    padding: 20,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  step: {
    flex: 1,
  },
  illustration: {
    width: '100%',
    height: 100,
    marginBottom: 40,
  },
  bigIllustration: {
    width: '100%',
    height: 250,
    marginBottom: 40,
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  boastingText: {
    fontSize: 24,
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
    marginBottom: 40,
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
});