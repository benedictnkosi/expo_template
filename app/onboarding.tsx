import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, Platform, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
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
import { Ionicons } from '@expo/vector-icons';

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

export default function OnboardingScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('monthly');
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
  const [isLoading, setIsLoading] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "198572112790-07sqf0e1f0ffp6q5oe6d1g50s86r5hsm.apps.googleusercontent.com",
    iosClientId: "198572112790-4m348foju37agudmcrs7e5rp0n4ld9g2.apps.googleusercontent.com",
    webClientId: "198572112790-1mqjuhlehqga7m67lkka2b3cfbj8dqjk.apps.googleusercontent.com"
  });
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  // Calculate dynamic sizes with safe minimum values
  const illustrationHeight = Math.max(80, screenHeight * 0.12);
  const bigIllustrationHeight = Math.max(160, screenHeight * 0.2);
  const buttonHeight = 56;
  const contentPadding = 20;
  const fontSize = {
    small: Math.min(14, screenWidth * 0.035),
    medium: Math.min(16, screenWidth * 0.04),
    large: Math.min(18, screenWidth * 0.045),
    xlarge: Math.min(22, screenWidth * 0.055),
  };

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

  useEffect(() => {
    if (step === 5) {
      setIsLoadingPlans(true);
      const timer = setTimeout(() => {
        setIsLoadingPlans(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step]);

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
            grade: parseInt(parsedOnboarding.grade),
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

      // Check if user is already logged in
      const existingAuth = await SecureStore.getItemAsync('auth');
      if (existingAuth) {
        // User is already logged in, update their profile and redirect
        const parsed = JSON.parse(existingAuth);
        const idToken = parsed.authentication.idToken;
        const tokenParts = idToken.split('.');
        const tokenPayload = JSON.parse(atob(tokenParts[1]));
        const uid = tokenPayload.sub;

        // Update learner profile with onboarding data
        const learnerData = {
          name: parsed.userInfo.name,
          grade: parseInt(grade),
          school: schoolName,
          school_address: schoolAddress,
          school_latitude: schoolLatitude,
          school_longitude: schoolLongitude,
          curriculum: "IEB,CAPS",
          terms: "1,2,3,4",
          notification_hour: 18,
        };

        const learner = await updateLearner(uid, learnerData);
        if (learner.status !== 'OK') {
          Toast.show({
            type: 'error',
            text1: 'Failed to update learner profile',
            text2: 'Please try again',
            position: 'bottom'
          });
          return;
        }

        router.replace('/(tabs)');
        return;
      }

      // If not logged in, proceed with Google sign in
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
            {!isLoadingPlans && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleComplete}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {isLoadingPlans ? (
              <View style={styles.loadingPlansContainer}>
                <View style={styles.loadingPlansCard}>
                  <View style={styles.loadingIconContainer}>
                    <ActivityIndicator size="large" color="#4d5ad3" style={styles.loadingSpinner} />
                    <View style={styles.emojiContainer}>
                      <ThemedText style={styles.loadingPlansEmoji}>🧮</ThemedText>
                      <View style={styles.sparkleContainer}>
                        <ThemedText style={styles.sparkleEmoji}>✨</ThemedText>
                      </View>
                    </View>
                  </View>
                  <View style={styles.loadingTextContainer}>
                    <ThemedText style={styles.loadingPlansText}>Crunching the numbers</ThemedText>
                    <View style={styles.loadingDotsContainer}>
                      <View style={[styles.loadingDot, styles.loadingDot1]} />
                      <View style={[styles.loadingDot, styles.loadingDot2]} />
                      <View style={[styles.loadingDot, styles.loadingDot3]} />
                    </View>
                  </View>
                  <View style={styles.loadingStepsContainer}>

                    <View style={styles.loadingStep}>
                      <ThemedText style={styles.loadingStepEmoji}>🎯</ThemedText>
                      <ThemedText style={styles.loadingStepText}>Optimizing for your goals</ThemedText>
                    </View>
                    <View style={styles.loadingStep}>
                      <ThemedText style={styles.loadingStepEmoji}>💫</ThemedText>
                      <ThemedText style={styles.loadingStepText}>Creating your perfect match</ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.planContainer}>
                <ThemedText style={styles.planTitle}>Your plan is ready.</ThemedText>
                <ThemedText style={styles.unlockText}>Unlock Exam Quiz</ThemedText>

                <View style={styles.trialBadge}>
                  <ThemedText style={styles.trialText}>🎁 14-Day Free Trial - No Risk, Just Learning!</ThemedText>
                </View>

                <TouchableOpacity
                  style={[
                    styles.planOption,
                    selectedPlan === 'monthly' && styles.selectedPlan
                  ]}
                  onPress={() => setSelectedPlan('monthly')}
                >
                  <View style={styles.planOptionHeader}>
                    <View>
                      <ThemedText style={styles.planLabel}>🔵 Monthly Plan</ThemedText>
                      <ThemedText style={styles.planSubLabel}>Season cramming!</ThemedText>
                    </View>
                    <View style={styles.priceContainer}>
                      <ThemedText style={styles.priceAmount}>R{prices.monthly}</ThemedText>
                      <ThemedText style={styles.pricePeriod}>per month</ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.planOption,
                    selectedPlan === 'weekly' && styles.selectedPlan
                  ]}
                  onPress={() => setSelectedPlan('weekly')}
                >
                  <View style={styles.planOptionHeader}>
                    <View>
                      <ThemedText style={styles.planLabel}>🟡 Weekly Plan</ThemedText>
                      <ThemedText style={styles.planSubLabel}>Last-minute study warriors!</ThemedText>
                    </View>
                    <View style={styles.priceContainer}>
                      <ThemedText style={styles.priceAmount}>R{prices.weekly}</ThemedText>
                      <ThemedText style={styles.pricePeriod}>per week</ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.planOption,
                    selectedPlan === 'yearly' && styles.selectedPlan
                  ]}
                  onPress={() => setSelectedPlan('yearly')}
                >
                  <View style={styles.planOptionHeader}>
                    <View>
                      <ThemedText style={styles.planLabel}>🟢 Yearly Plan – R{prices.yearly}</ThemedText>
                      <ThemedText style={styles.planSubLabel}>🎯 Best Deal!</ThemedText>
                    </View>
                    <View style={styles.priceContainer}>
                      <ThemedText style={styles.priceAmount}>R{prices.yearly}</ThemedText>
                      <ThemedText style={styles.pricePeriod}>per year</ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.savingsText}>💰 Save R{(prices.monthly * 12) - prices.yearly} vs. Monthly! More savings = More Snacks! 🍕</ThemedText>
                </TouchableOpacity>

                <ThemedText style={styles.cancelText}>
                  🚫 Cancel Anytime – No Stress!
                </ThemedText>

                <TouchableOpacity
                  style={styles.subscribeButton}
                  onPress={handleComplete}
                >
                  <ThemedText style={styles.subscribeButtonText}>
                    Start Free Trial
                  </ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 6:
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
              <View style={styles.testimonialContainer}>
                <ThemedText style={styles.testimonialRating}>⭐⭐⭐⭐⭐</ThemedText>
                <ThemedText style={styles.testimonialTitle}>"Great for Exam Prep!"</ThemedText>
                <ThemedText style={styles.testimonialText}>
                  "This app is a lifesaver! The questions are well-structured, and I love how it tracks my progress. The image-based questions make studying more interactive!"
                </ThemedText>
              </View>

            </View>
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
      case 6:
        return true;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (step === 6) {
      setStep(7);
    } else if (step === 7) {
      handleComplete();
    } else if (step === 1 && !grade) {
      setErrors(prev => ({ ...prev, grade: 'Please select your grade' }));
    } else if (step === 2 && !school) {
      setErrors(prev => ({ ...prev, school: 'Please select your school' }));
    } else if (step === 3 && !curriculum) {
      setErrors(prev => ({ ...prev, curriculum: 'Please select your curriculum' }));
    } else if (step === 4 && !difficultSubject) {
      setErrors(prev => ({ ...prev, curriculum: 'Please select your most challenging subject' }));
    } else {
      setErrors({ grade: '', school: '', curriculum: '' });
      setStep(step + 1);
    }
  };

  const getPrices = () => {
    const isIOS = Platform.OS === 'ios';
    return {
      weekly: isIOS ? 29 : 19,
      monthly: isIOS ? 59 : 49,
      yearly: isIOS ? 309 : 299
    };
  };

  const prices = getPrices();

  return (
    <LinearGradient
      colors={['#1B1464', '#2B2F77']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.content}>
        <View style={styles.stepContainer}>
          {renderStep()}
        </View>

        {step !== 6 && (step !== 5 || !isLoadingPlans) && (
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
                    {step === 5 ? 'Start Trial' : 'Next! 🚀'}
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
    fontSize: 24,
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
    zIndex: 1,
  },
  planContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  unlockText: {
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 24,
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
    fontSize: 24,
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
    fontSize: 24,
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
});