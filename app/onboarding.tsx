import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '../components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { analytics } from '../services/analytics';
import { useAuth } from '@/contexts/AuthContext';
import RegisterForm from './components/RegisterForm';

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
  'Batgirl',
  // Additional superheroes
  'Thor',
  'Black Widow',
  'Hulk',
  'Ant-Man',
  'Wasp',
  'Vision',
  'Falcon',
  'Winter Soldier',
  'Black Canary',
  'Supergirl',
  // South African Celebrities
  'Trevor Noah',
  'Black Mambazo',
  'Die Heuwels Fantasties',
  'Die Antwoord',
  'Goldfish',
  'Black Coffee',
  'DJ Fresh',
  'Cassper Nyovest',
  'Aka',
  'Nasty C',
  'Sho Madjozi',
  'Mafikizolo',
  'Mi Casa',
  'Freshlyground',
  'Loyiso Bala',
  'Lira',
  'Yvonne Chaka Chaka',
  'Brenda Fassie',
  'Lucky Dube',
  'Johnny Clegg',
  // American Pop Stars
  'Taylor Swift',
  'Beyoncé',
  'Lady Gaga',
  'Ariana Grande',
  'Billie Eilish',
  'Dua Lipa',
  'Harry Styles',
  'Justin Bieber',
  'Rihanna',
  'Katy Perry',
  'Bruno Mars',
  'The Weeknd',
  'Post Malone',
  'Drake',
  'Ed Sheeran',
  'Adele',
  'Miley Cyrus',
  'Selena Gomez',
  'Shawn Mendes',
  'Olivia Rodrigo',
  // Famous Geniuses and Inventors
  'Albert Einstein',
  'Nikola Tesla',
  'Marie Curie',
  'Leonardo da Vinci',
  'Isaac Newton',
  'Thomas Edison',
  'Stephen Hawking',
  'Alan Turing',
  'Ada Lovelace',
  'Galileo Galilei',
  'Archimedes',
  'Charles Darwin',
  'James Watt',
  'Alexander Graham Bell',
  'Wright Brothers',
  'Tim Berners-Lee',
  'Grace Hopper',
  'Steve Jobs',
  'Bill Gates',
  'Elon Musk',
  // Famous Athletes
  'Usain Bolt',
  'Serena Williams',
  'Michael Jordan',
  'Muhammad Ali',
  'Lionel Messi',
  'Cristiano Ronaldo',
  'Roger Federer',
  'Simone Biles',
  'Michael Phelps',
  'LeBron James',
  // Nobel Laureates
  'Nelson Mandela',
  'Malala Yousafzai',
  'Martin Luther King Jr',
  'Mother Teresa',
  'Albert Schweitzer',
  'Wangari Maathai',
  'Kofi Annan',
  'Desmond Tutu',
  'Jimmy Carter',
  'Barack Obama',
  // Inspirational Leaders
  'Mahatma Gandhi',
  'Winston Churchill',
  'Abraham Lincoln',
  'Queen Elizabeth II',
  'Walt Disney',
  'Oprah Winfrey',
  'J.K. Rowling',
  'Maya Angelou',
  'Rosa Parks',
  'Helen Keller'
];

function getRandomSuperheroName(): string {
  const randomIndex = Math.floor(Math.random() * SUPERHERO_NAMES.length);
  return SUPERHERO_NAMES[randomIndex];
}

WebBrowser.maybeCompleteAuthSession();

const EMOJIS = {
  welcome: '🚀',
  school: '👥',
  ready: '✍️',
  podcast: '🎧',
  maths: '🧮',
  questions: '❓',
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
  curriculum: string;
  difficultSubject?: string;
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

const EARLY_GRADE_INFO_STEP = 4.5;

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

interface GuestAccountParams {
  selectedAvatar: string;
  signUp: (email: string, password: string) => Promise<any>;
}

interface FirebaseError extends Error {
  code?: string;
  name: string;
  message: string;
  stack?: string;
}

async function createGuestAccount({ selectedAvatar, signUp }: GuestAccountParams, retryCount = 0): Promise<any> {
  try {
    console.log(`[Guest Account] Attempt ${retryCount + 1}/${MAX_RETRIES} - Starting guest account creation`);

    // Generate a 16-character UID
    const guestUid = Array.from(crypto.getRandomValues(new Uint8Array(8)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 16);

    const guestEmail = `${guestUid}@guest.com`;
    const defaultPassword = 'password';

    console.log('[Guest Account] Generated credentials:', { guestEmail });

    // Register the guest user
    console.log('[Guest Account] Attempting to sign up with Firebase...');
    const user = await signUp(guestEmail, defaultPassword);
    console.log('[Guest Account] Firebase signup successful:', { uid: user?.uid });

    // Create learner profile for guest
    const learnerData = {
      name: getRandomSuperheroName(),
      school: 'Not specified',
      school_address: '',
      school_latitude: 0,
      school_longitude: 0,
      curriculum: 'CAPS',
      terms: "1,2,3,4",
      email: guestEmail,
      avatar: selectedAvatar,
    };

    console.log('[Guest Account] Created learner data:', learnerData);

    // Store onboarding data
    console.log('[Guest Account] Storing onboarding data...');
    await AsyncStorage.setItem('onboardingData', JSON.stringify({
      curriculum: 'CAPS',
      avatar: selectedAvatar,
      onboardingCompleted: true,
      isGuest: true
    }));

    // Log onboarding completion event
    console.log('[Guest Account] Logging analytics event...');
    logAnalyticsEvent('register_success', {
      curriculum: 'CAPS',
      avatar: selectedAvatar,
      is_guest: true
    });

    // Store auth token
    console.log('[Guest Account] Storing auth token...');
    await SecureStore.setItemAsync('auth', JSON.stringify({ user }));

    console.log('[Guest Account] Guest account creation completed successfully');
    return user;
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    console.error('[Guest Account] Error details:', {
      error: firebaseError,
      errorName: firebaseError.name,
      errorMessage: firebaseError.message,
      errorCode: firebaseError.code,
      errorStack: firebaseError.stack,
      retryCount,
      timestamp: new Date().toISOString()
    });

    if (retryCount < MAX_RETRIES) {
      console.log(`[Guest Account] Retrying in ${RETRY_DELAY}ms... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return createGuestAccount({ selectedAvatar, signUp }, retryCount + 1);
    }
    throw error;
  }
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [selectedAvatar, setSelectedAvatar] = useState<string>('1');
  const [registrationMethod, setRegistrationMethod] = useState<'email' | 'phone'>('email');
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [errors, setErrors] = useState({
    curriculum: ''
  });

  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

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
    setErrors({ curriculum: '' });
    setStep(step + 1);
  };

  const getStepName = (step: number): string => {
    switch (step) {
      case 0:
        return 'welcome';
      case 1:
        return 'audio_lesson';
      case 2:
        return 'maths_practice';
      case 3:
        return 'questions';
      case 4:
        return 'avatar_selection';
      case 5:
        return 'ratings';
      case 6:
        return 'auth_options';
      case 7:
        return 'registration';
      default:
        return 'unknown';
    }
  };

  const handleComplete = async () => {
    try {
      // Store onboarding data
      await AsyncStorage.setItem('onboardingData', JSON.stringify({
        curriculum: 'CAPS',
        avatar: selectedAvatar,
        onboardingCompleted: true
      }));

      // Log onboarding completion event
      logAnalyticsEvent('onboarding_complete', {
        curriculum: 'CAPS',
        avatar: selectedAvatar
      });

      // Navigate to registration screen
      router.push({
        pathname: '/register',
        params: {
          curriculum: 'CAPS',
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
            <View style={{ width: '100%', height: 300, marginBottom: 40, justifyContent: 'center', alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 120 }} testID="welcome-emoji">
                {EMOJIS.welcome}
              </ThemedText>
            </View>
            <View style={[styles.textContainer, { paddingHorizontal: 20 }]} testID="welcome-text-container">
              <ThemedText style={[styles.welcomeTitle, { fontSize: 24, marginBottom: 24 }]} testID="welcome-title">
                Dimpo Learning App
              </ThemedText>
              <ThemedText style={[styles.welcomeText, { fontSize: 20, lineHeight: 32, marginBottom: 24 }]} testID="welcome-description">
                📝 Get ready to boost your brainpower and ace your exams! 🏆
              </ThemedText>
            </View>
          </View>
        );
      case 1:
        return (
          <View style={[styles.step, { justifyContent: 'flex-start', paddingTop: 40 }]} testID="audio-lesson-step">
            <View style={{ width: '100%', height: 300, marginBottom: 40, justifyContent: 'center', alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 120 }} testID="podcast-emoji">
                {EMOJIS.podcast}
              </ThemedText>
            </View>
            <View style={[styles.textContainer, { paddingHorizontal: 20 }]} testID="audio-lesson-text-container">
              <ThemedText style={[styles.welcomeTitle, { fontSize: 26, marginBottom: 20 }]} testID="audio-lesson-title">
                Learn with our Audio Lessons 🎧
              </ThemedText>
              <ThemedText style={[styles.welcomeText, { fontSize: 18, lineHeight: 28, marginBottom: 20 }]} testID="audio-lesson-description">
                📚 Listen to engaging lessons and boost your learning anywhere, anytime. Tap next to get started!
              </ThemedText>
            </View>
          </View>
        );
      case 2:
        return (
          <View style={[styles.step, { justifyContent: 'flex-start', paddingTop: 40 }]} testID="maths-practice-step">
            <View style={{ width: '100%', height: 300, marginBottom: 40, justifyContent: 'center', alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 120 }} testID="maths-emoji">
                {EMOJIS.maths}
              </ThemedText>
            </View>
            <View style={[styles.textContainer, { paddingHorizontal: 20 }]} testID="maths-practice-text-container">
              <ThemedText style={[styles.welcomeTitle, { fontSize: 26, marginBottom: 20 }]} testID="maths-practice-title">
                Practice Mathematics 🧮
              </ThemedText>
              <ThemedText style={[styles.welcomeText, { fontSize: 18, lineHeight: 28, marginBottom: 20 }]} testID="maths-practice-description">
                Sharpen your math skills with fun and interactive practice questions. Ready to solve some problems?
              </ThemedText>
            </View>
          </View>
        );
      case 3:
        return (
          <View style={[styles.step, { justifyContent: 'flex-start', paddingTop: 40 }]} testID="questions-step">
            <View style={{ width: '100%', height: 300, marginBottom: 40, justifyContent: 'center', alignItems: 'center' }}>
              <ThemedText style={{ fontSize: 120 }} testID="questions-emoji">
                {EMOJIS.questions}
              </ThemedText>
            </View>
            <View style={[styles.textContainer, { paddingHorizontal: 20 }]} testID="questions-text-container">
              <ThemedText style={[styles.welcomeTitle, { fontSize: 26, marginBottom: 20 }]} testID="questions-title">
                ✨ Thousands of Questions ✨
              </ThemedText>
              <ThemedText style={[styles.welcomeText, { fontSize: 18, lineHeight: 28, marginBottom: 20 }]} testID="questions-description">
                ⭐️ Access thousands of practice questions to master every topic! 💡
              </ThemedText>
            </View>
          </View>
        );
      case 4:
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
      case 5:
        return (
          <View style={styles.step} testID="ratings-step">
            <View style={styles.textContainer}>
              <ThemedText style={styles.stepTitle}>
                ⭐️ Quick Rating Guide
              </ThemedText>
              <ThemedText style={styles.stepSubtitle}>
                Help other students find Dimpo!
              </ThemedText>
            </View>

            <View style={styles.ratingsContainer}>
              <View style={styles.ratingInfoCard}>
                <ThemedText style={styles.ratingInfoText}>
                  • 5 stars = I love it and would recommend it!{'\n'}
                  • 1 star = I don't like it and would not recommend it
                </ThemedText>
              </View>
            </View>
          </View>
        );
      case 6:
        return (
          <View style={styles.step} testID="auth-options-step">
            <TouchableOpacity
              style={[styles.closeButton, { left: insets.left + 8 }]}
              onPress={() => setStep(5)}
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
                  setStep(7);
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
                  setStep(7);
                }}
                testID="phone-auth-button"
              >
                <Ionicons name="call-outline" size={24} color="#FFFFFF" />
                <ThemedText style={styles.authButtonText}>Register with Phone</ThemedText>
              </TouchableOpacity>

              <ThemedText style={styles.guestPromptText}>
                Not ready to register? Try Dimpo as a guest!
              </ThemedText>

              <TouchableOpacity
                style={[styles.authButton, styles.guestButton]}
                onPress={async () => {
                  try {
                    console.log('[Guest Button] Starting guest account creation process');
                    logAnalyticsEvent('auth_option_selected', { option: 'guest' });

                    // Show loading state
                    Toast.show({
                      type: 'info',
                      text1: 'Creating guest account...',
                      position: 'bottom',
                      visibilityTime: 2000,
                    });

                    const user = await createGuestAccount({
                      selectedAvatar,
                      signUp
                    });

                    console.log('[Guest Button] Guest account created successfully, navigating to tabs');
                    // Navigate to tabs
                    router.replace('/(tabs)');
                  } catch (error: unknown) {
                    const firebaseError = error as FirebaseError;
                    console.error('[Guest Button] Fatal error in guest account creation:', {
                      error: firebaseError,
                      errorName: firebaseError.name,
                      errorMessage: firebaseError.message,
                      errorCode: firebaseError.code,
                      errorStack: firebaseError.stack,
                      timestamp: new Date().toISOString()
                    });

                    // Show user-friendly error message
                    Toast.show({
                      type: 'error',
                      text1: 'Connection Error',
                      text2: 'Please check your internet connection and try again',
                      position: 'bottom',
                      visibilityTime: 4000,
                    });
                  }
                }}
                testID="guest-auth-button"
              >
                <Ionicons name="person-outline" size={24} color="#FFFFFF" />
                <ThemedText style={styles.authButtonText}>Try Dimpo as Guest</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 7:
        return (
          <View style={styles.step}>
            <TouchableOpacity
              style={[styles.closeButton, { left: insets.left + 8 }]}
              onPress={() => setStep(6)}
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
                  curriculum: 'CAPS',
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
        return true;
      case 2:
        return !!selectedAvatar;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return true;
      case 6:
        return true;
      case 7:
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

        {(step < 8 && step !== 7) && (
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
                  onPress={() => {
                    setStep(step - 1);
                  }}
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
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 20,
  },
  illustration: {
    width: '60%',
    height: 150,
    marginBottom: 24,
  },
  bigIllustration: {
    width: '80%',
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
    top: 0,
    left: 0,
    zIndex: 100,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
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
  disclaimerContainer: {
    width: '90%',
    paddingHorizontal: 20,
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disclaimerInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    gap: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  checkboxChecked: {
    backgroundColor: '#E0E7FF',
    borderColor: '#4F46E5',
  },
  disclaimerTextWrapper: {
    flex: 1,
    flexDirection: 'column',
    gap: 2,
  },
  disclaimerIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  disclaimerIcon: {
    fontSize: 18,
    marginRight: 2,
  },
  disclaimerTitle: {
    fontWeight: '700',
    color: '#FBBF24',
    fontSize: 15,
  },
  disclaimerText: {
    fontSize: 15,
    color: '#F3F4F6',
    lineHeight: 22,
    opacity: 0.85,
  },
  authButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  checkboxText: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  ratingsContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  ratingsContent: {
    alignItems: 'center',
    marginTop: 40,
  },
  ratingsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 28,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  starButton: {
    padding: 8,
  },
  starIcon: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },
  ratingsSubtitle: {
    fontSize: 16,
    color: '#E2E8F0',
    textAlign: 'center',
    marginTop: 16,
  },
  ratingsFooter: {
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  ratingsFooterText: {
    fontSize: 14,
    color: '#E2E8F0',
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 20,
  },
  ratingInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  ratingInfoText: {
    fontSize: 15,
    color: '#E2E8F0',
    lineHeight: 24,
  }
});