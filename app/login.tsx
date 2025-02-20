import { useState } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Image } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { trackEvent, Events } from '@/services/mixpanel';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all fields',
        position: 'bottom'
      });
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      trackEvent(Events.LOGIN, {
        "user_id": user?.uid,
        "email": email
      });
    } catch (error: any) {
      console.error('Login error:', error.code, error.message);

      const messages: { [key: string]: string } = {
        'auth/invalid-email': 'Invalid email address',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect email or password',
        'auth/invalid-credential': 'Incorrect email or password',
        'auth/too-many-requests': 'Too many attempts. Please try again later'
      };

      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: messages[error.code] || 'Invalid email or password',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1a1a1a', '#000000', '#000000']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <ThemedText style={styles.title}>Welcome Back!</ThemedText>
            <ThemedText style={styles.subtitle}>Let's ace this! 🎯</ThemedText>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="your.email@school.com"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Your secret password"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading ? 'Signing in...' : 'Start Learning →'}
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.forgotPasswordContainer}>
              <ThemedText style={styles.forgotPasswordText}>
                Forgot your password? Don't worry, it happens to the best of us!
              </ThemedText>
              <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                <ThemedText style={styles.resetLink}>Reset it here</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.registerContainer}>
              <ThemedText style={styles.forgotPasswordText}>
                New to Exam Quiz? Join us and start learning!
              </ThemedText>
              <TouchableOpacity onPress={() => router.replace('/register')}>
                <ThemedText style={styles.resetLink}>Create an account</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    marginTop: -40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#444',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  registerContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  resetLink: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
}); 