import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Image, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '../components/ThemedText';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { AntDesign } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateLearner } from '../services/api';
import Toast from 'react-native-toast-message';

WebBrowser.maybeCompleteAuthSession();

const LOGIN_ILLUSTRATION = require('../assets/images/illustrations/stressed.png');

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [isForcingOnboarding, setIsForcingOnboarding] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "198572112790-07sqf0e1f0ffp6q5oe6d1g50s86r5hsm.apps.googleusercontent.com",
    iosClientId: "198572112790-4m348foju37agudmcrs7e5rp0n4ld9g2.apps.googleusercontent.com",
    webClientId: "198572112790-1mqjuhlehqga7m67lkka2b3cfbj8dqjk.apps.googleusercontent.com"
  });

  useEffect(() => {
    handleSignInResponse();
  }, [response]);

  useEffect(() => {
    async function checkSession() {
      if (isForcingOnboarding) return; // Skip the check if we're forcing onboarding

      const authData = await SecureStore.getItemAsync('auth');
      if (authData) {
        const onboardingData = await AsyncStorage.getItem('onboardingData');
        if (onboardingData && JSON.parse(onboardingData).onboardingCompleted) {
          router.replace('/(tabs)');
        }
      }
    }
    checkSession();
  }, [isForcingOnboarding]);

  const startRegistration = async () => {
    try {
      // Clear any existing data
      await AsyncStorage.removeItem('onboardingData');
      await SecureStore.deleteItemAsync('auth');
      // Navigate to onboarding
      router.replace('/onboarding');
    } catch (error) {
      console.error('Error starting registration:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not start registration',
        position: 'bottom'
      });
    }
  };

  async function handleSignInResponse() {
    if (response?.type === 'success' && response.authentication) {
      setIsLoading(true);
      try {
        const { authentication } = response;

        // Get and verify Google user info
        const userInfoResponse = await fetch(
          'https://www.googleapis.com/userinfo/v2/me',
          {
            headers: { Authorization: `Bearer ${authentication.accessToken}` },
          }
        );

        const googleUser = await userInfoResponse.json();

        if (!googleUser.id) {
          console.error('No user ID received from Google');
          Toast.show({
            type: 'error',
            text1: 'Login Failed',
            text2: 'Could not get user information',
            position: 'bottom'
          });
          setIsLoading(false);
          return;
        }

        // Store auth data
        const userData = {
          authentication,
          userInfo: {
            id: googleUser.sub,
            uid: googleUser.sub,
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture
          }
        };

        await SecureStore.setItemAsync('auth', JSON.stringify(userData));
        router.replace('/(tabs)');
      } catch (error) {
        console.error('Sign in error:', error);
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: 'Please try again',
          position: 'bottom'
        });
      } finally {
        setIsLoading(false);
      }
    }
  }


  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient
        colors={['#1B1464', '#2B2F77']}
        style={styles.gradient}
      >
        <View style={styles.container}>
          <Image
            source={LOGIN_ILLUSTRATION}
            style={styles.illustration}
            resizeMode="contain"
          />

          <View style={styles.header}>
            <ThemedText style={styles.appname}>Exam Quiz</ThemedText>
            <ThemedText style={styles.title}>Ready to Excel? 🎯</ThemedText>
            <ThemedText style={styles.subtitle}>Join thousands of students acing their exams! 📚</ThemedText>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.registerButton]}
              onPress={startRegistration}
            >
              <AntDesign name="google" size={24} color="#DB4437" />
              <ThemedText style={styles.registerButtonText}>
                Register Now 🚀
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <ThemedText style={styles.dividerText}>or</ThemedText>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.googleButton, isLoading && styles.buttonDisabled]}
              onPress={() => promptAsync()}
              disabled={!request || isLoading}
            >
              <AntDesign name="google" size={24} color="#DB4437" />
              <ThemedText style={styles.googleButtonText}>
                {isLoading ? 'Signing in...' : 'Login with Google'}
              </ThemedText>
            </TouchableOpacity>
          </View>

        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  illustration: {
    width: '100%',
    height: 280,
    marginBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  appname: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 28,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  registerButton: {
    backgroundColor: '#4338CA',
    marginBottom: 16,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    color: '#FFFFFF',
    marginHorizontal: 16,
    fontSize: 16,
  },
  googleButtonText: {
    color: '#1E293B',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  pickerContainer: {
    backgroundColor: '#444',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden'
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#FFFFFF',
    backgroundColor: 'transparent'
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#3B82F6',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  debugButton: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 12,
    borderRadius: 8,
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
}); 