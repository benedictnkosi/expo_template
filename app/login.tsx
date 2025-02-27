import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, Image, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { AntDesign } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "198572112790-07sqf0e1f0ffp6q5oe6d1g50s86r5hsm.apps.googleusercontent.com",
    iosClientId: "123456789-xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
    webClientId: "198572112790-1mqjuhlehqga7m67lkka2b3cfbj8dqjk.apps.googleusercontent.com"
  });


  useEffect(() => {
    handleSignInResponse();
  }, [response]);


  async function handleSignInResponse() {
    if (response?.type === 'success' && response.authentication) {
      console.log('Sign in response:', response);
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

        console.log('Google user:', googleUser);
        // Verify we have required fields
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

        console.log('Google user info:', {
          sub: googleUser.sub,
          email: googleUser.email,
          name: googleUser.name
        });

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
        console.log('Auth data stored, user ID:', googleUser.id);
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
        colors={['#FFFFFF', '#F8FAFC', '#F1F5F9']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <ThemedText style={styles.title}>Login to ExamQuiz</ThemedText>
            <ThemedText style={styles.subtitle}>Let's ace this! 🎯</ThemedText>
          </View>

          <TouchableOpacity
            style={[styles.googleButton, isLoading && styles.buttonDisabled]}
            onPress={() => promptAsync()}
            disabled={!request || isLoading}
          >
            <AntDesign
              name="google"
              size={24}
              color="#DB4437"
              style={styles.googleIcon}
            />
            <ThemedText style={styles.googleButtonText}>
              {isLoading ? 'Signing in...' : 'Continue with Google'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  gradient: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: '#1E293B',
    fontSize: 16,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    color: '#64748B',
    marginHorizontal: 16,
  },
}); 