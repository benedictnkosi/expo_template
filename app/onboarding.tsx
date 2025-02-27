import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLearner, updateLearner } from '@/services/api';
import { trackEvent, Events } from '@/services/mixpanel';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const TOTAL_QUESTIONS = 18000; // Update with actual number
const DAILY_USERS = 6000; // Update with actual number

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
  const insets = useSafeAreaInsets();
  const [errors, setErrors] = useState({
    grade: '',
    school: ''
  });

  useEffect(() => {
    const fetchUserInfo = async () => {
      const authData = await SecureStore.getItemAsync('auth');
      if (!authData) return;

      const parsed = JSON.parse(authData);

      // Extract sub from idToken as uid
      const idToken = parsed.authentication.idToken;
      const tokenParts = idToken.split('.');
      const tokenPayload = JSON.parse(atob(tokenParts[1]));
      const uid = tokenPayload.sub;

      const learner = await getLearner(uid);
      if (learner.name && learner.grade) {

        router.replace('/(tabs)');
      }
    };

    fetchUserInfo();
  }, []);

  const handleComplete = async () => {
    try {
      const authData = await SecureStore.getItemAsync('auth');
      if (!authData) return;

      const parsed = JSON.parse(authData);

      // Extract sub from idToken as uid
      const idToken = parsed.authentication.idToken;
      const tokenParts = idToken.split('.');
      const tokenPayload = JSON.parse(atob(tokenParts[1]));
      const uid = tokenPayload.sub;

      console.log('User ID from token:', uid);

      const learner = await updateLearner(uid, {
        name: parsed.userInfo.name,
        grade: parseInt(grade),
        school,
        school_address: schoolAddress,
        school_latitude: schoolLatitude,
        school_longitude: schoolLongitude
      });

      if (learner.error) {
        console.error('Failed to complete onboarding:', learner.error);
        return;
      }

      trackEvent(Events.COMPLETE_ONBOARDING, {
        grade,
        school,
      });

      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.step}>
            <Image
              source={ILLUSTRATIONS.welcome}
              style={styles.illustration}
              resizeMode="contain"
            />
            <View style={styles.textContainer}>
              <ThemedText style={styles.welcomeTitle}>Welcome to Exam Quiz! 🎉</ThemedText>
              <ThemedText style={styles.welcomeText}>
                We're excited to help you prepare for your exams.
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
                      grade === g.toString() && styles.gradeButtonSelected,
                      { backgroundColor: getGradeColor(g) }
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
            <Image
              source={ILLUSTRATIONS.school}
              style={styles.illustration}
              resizeMode="contain"
            />
            <View style={styles.textContainer}>
              <ThemedText style={styles.stepTitle}>Which school do you attend?</ThemedText>
              <GooglePlacesAutocomplete
                placeholder="Search for your school"
                onPress={(data, details = null) => {
                  console.log('Selected place:', data);
                  console.log('Place details:', details);
                  setSchool(data.description);
                  setSchoolAddress(data.description);
                  setErrors(prev => ({ ...prev, school: '' }));
                  if (details) {
                    setSchoolLatitude(details.geometry.location.lat);
                    setSchoolLongitude(details.geometry.location.lng);
                  }
                }}
                fetchDetails={true}
                onFail={error => console.error('GooglePlaces error:', error)}
                onNotFound={() => console.log('No results found')}
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
                  key: "AIzaSyBAQMtnKRlJ1oZKYhiP6arYVmxyEPCfbsI",
                  components: 'country:za',
                  types: 'school',
                  language: 'en',
                }}
              />
              {school && (
                <View style={styles.selectedSchoolContainer}>
                  <View style={styles.selectedSchoolHeader}>
                    <Ionicons name="school-outline" size={20} color="#3B82F6" />
                    <ThemedText style={styles.selectedSchoolTitle}>Selected School</ThemedText>
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
              source={ILLUSTRATIONS.ready}
              style={styles.illustration}
              resizeMode="contain"
            />
            <View style={styles.textContainer}>
              <ThemedText style={styles.stepTitle}>You're all set! 🎉</ThemedText>
              <ThemedText style={styles.statsText}>
                Join {DAILY_USERS.toLocaleString()}+ students{'\n'}
                practicing with {TOTAL_QUESTIONS.toLocaleString()}+ questions{'\n'}
                every day to ace their exams! 🚀
              </ThemedText>
            </View>
          </View>
        );
    }
  };

  function canProceed() {
    if (step === 1) return !!grade;
    if (step === 2) return !!school;
    return true;
  }

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
          {step > 0 && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setStep(step - 1)}
            >
              <ThemedText style={styles.buttonText}>Back</ThemedText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              (!canProceed() && step !== 0) && styles.buttonDisabled
            ]}
            onPress={() => {
              if (step === 3) {
                handleComplete();
              } else if (step === 1 && !grade) {
                setErrors(prev => ({ ...prev, grade: 'Please select your grade' }));
              } else if (step === 2 && !school) {
                setErrors(prev => ({ ...prev, school: 'Please select your school' }));
              } else {
                setErrors({ grade: '', school: '' });
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
              {step === 3 ? 'Get Started' : 'Next'}
            </ThemedText>
          </TouchableOpacity>
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingTop: 20,
  },
  illustration: {
    width: '100%',
    height: 280,
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
  welcomeText: {
    fontSize: 18,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 28,
  },
  stepTitle: {
    fontSize: 28,
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
    gap: 12,
    marginTop: 'auto',
    paddingVertical: 14,
    paddingHorizontal: 16,
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  primaryButtonText: {
    color: '#4338CA',
  },
  gradeButtons: {
    width: '100%',
    gap: 16,
    paddingHorizontal: 16,
  },
  gradeButton: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gradeButtonSelected: {
    borderColor: '#000',
    backgroundColor: 'rgba(211, 204, 204, 0.2)',
  },
  gradeButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  gradeButtonTextSelected: {
    color: '#3B82F6',
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
});

function getGradeColor(grade: number): string {
  switch (grade) {
    case 10:
      return '#E0F2FE'; // Light blue
    case 11:
      return '#F0FDF4'; // Light green
    case 12:
      return '#FEF3C7'; // Light yellow
    default:
      return '#F1F5F9'; // Light gray
  }
}