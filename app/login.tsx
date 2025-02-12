import { useState } from 'react';
import { StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router, useRouter } from 'expo-router';
import { signInWithPopup, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, googleProvider } from '@/config/firebase';
import { GOOGLE_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID } from '@/config/oauth';

// Initialize WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
  });

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (Platform.OS === 'web') {
        await signInWithPopup(auth, googleProvider);
      } else {
        const result = await promptAsync();
        if (result?.type === 'success') {
          const credential = GoogleAuthProvider.credential(
            result.authentication?.idToken
          );
          await signInWithCredential(auth, credential);
        }
      }
    } catch (error) {
      console.error('Google login failed:', error);
      setError('An error occurred during sign in. Please try again.');
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
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
          <View style={styles.logoContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="school-outline" size={48} color="#4F46E5" />
            </View>
            <Text style={styles.appTitle}>
              Exam Quiz
            </Text>
            <Text style={styles.description}>
              Practice past exam papers and improve your grades. Track your progress across multiple subjects.
            </Text>
          </View>

          <View style={styles.buttonContainer}>
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            <TouchableOpacity
              style={[styles.button, styles.googleButton]}
              onPress={handleGoogleLogin}
              disabled={isLoading}
            >
              <Ionicons
                name="logo-google"
                size={24}
                color="#DB4437"
                style={styles.googleIcon}
              />
              <Text style={styles.buttonText}>
                {isLoading ? 'Signing in...' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
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
  },
  contentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    marginBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 12,
  },
  description: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 300,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  googleButton: {
    backgroundColor: '#ffffff',
  },
  googleIcon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
}); 