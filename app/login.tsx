import { useState } from 'react';
import { StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { router } from 'expo-router';
import {
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { auth, googleProvider } from '@/config/firebase';
import { GOOGLE_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from '@/config/oauth';

// Initialize WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
  });

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      if (Platform.OS === 'web') {
        // Web platform uses Firebase popup
        await signInWithPopup(auth, googleProvider);
        router.replace('/(tabs)');
      } else {
        // Mobile platforms use Expo Auth Session
        const result = await promptAsync();
        if (result?.type === 'success') {
          const credential = GoogleAuthProvider.credential(
            result.authentication?.accessToken
          );
          await signInWithCredential(auth, credential);
          router.replace('/(tabs)');
        }
      }
    } catch (error) {
      console.error('Google login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement Facebook OAuth
      // For now, just navigate to home
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Facebook login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#DBEAFE', '#F3E8FF']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ThemedView style={styles.container}>
        <ThemedView style={styles.contentContainer}>
          <ThemedView style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.logo}
            />
            <ThemedText type="title" style={styles.appTitle}>
              Exam Quiz
            </ThemedText>
            <ThemedText style={styles.description}>
              Practice past exam papers and improve your grades. Track your progress across multiple subjects.
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.googleButton]}
              onPress={handleGoogleLogin}
              disabled={isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading ? 'Signing in...' : 'Login with Google'}
              </ThemedText>
            </TouchableOpacity>

          </ThemedView>
        </ThemedView>
      </ThemedView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 32,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
    backgroundColor: 'transparent',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  facebookButton: {
    backgroundColor: '#4267B2',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginTop: 16,
    maxWidth: 300,
    lineHeight: 24,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6B4EFF',
  },
}); 