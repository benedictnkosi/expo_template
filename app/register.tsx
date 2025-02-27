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
import { Picker } from '@react-native-picker/picker';
import { fetchGrades, registerLearner } from '@/services/api';

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [grades, setGrades] = useState<{ id: number; number: number }[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [name, setName] = useState('');

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: "198572112790-07sqf0e1f0ffp6q5oe6d1g50s86r5hsm.apps.googleusercontent.com",
    iosClientId: "123456789-xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
    webClientId: "198572112790-1mqjuhlehqga7m67lkka2b3cfbj8dqjk.apps.googleusercontent.com"
  });

  useEffect(() => {
    if (request) {
      console.log('Redirect URL:', request.redirectUri);
    }
  }, [request]);

  useEffect(() => {
    loadGrades();
  }, []);


  useEffect(() => {
    handleRegisterResponse();
  }, [response]);

  async function loadGrades() {
    try {
      const gradesData = await fetchGrades();
      const sortedGrades = gradesData
        .filter(grade => grade.active === 1)
        .sort((a, b) => b.number - a.number);
      setGrades(sortedGrades);
      if (sortedGrades.length > 0) {
        setSelectedGrade(sortedGrades[0].number.toString());
      }
    } catch (error) {
      console.error('Failed to fetch grades:', error);
    }
  }

  async function handleRegisterResponse() {
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
        console.log('Google user info:', googleUser);

        // Register learner with sub as uid
        const learner = await registerLearner({
          uid: googleUser.id,
          name: googleUser.name,
          grade: parseInt(selectedGrade)
        });

        console.log('Learner response:', learner);

        if (learner.message?.includes('Learner already exists') || learner.message?.includes('Successfully created learner')) {

          // Store complete user data with correct ID fields
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
          console.log('Stored auth data:', userData);

          router.replace('/(tabs)');
        } else {
          Toast.show({
            type: 'error',
            text1: 'Learner already exists',
            text2: 'Please login to continue',
            position: 'bottom'
          });
          router.replace('/login');
        }
      } catch (error) {
        console.error('Sign in error:', error);
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
            <ThemedText style={styles.title}>Create Account</ThemedText>
            <ThemedText style={styles.subtitle}>Join us and start learning! 🚀</ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedGrade}
                onValueChange={setSelectedGrade}
                style={styles.picker}
              >
                {grades.map((grade) => (
                  <Picker.Item
                    key={grade.id}
                    label={`Grade ${grade.number}`}
                    value={grade.number.toString()}
                  />
                ))}
              </Picker>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={() => promptAsync()}
              disabled={!request || isLoading || !selectedGrade}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading ? 'Registering in...' : 'Register with Google'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push('/login')}
            >
              <ThemedText style={styles.linkText}>
                Already have an account? Login here
              </ThemedText>
            </TouchableOpacity>
          </View>
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#1E293B',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
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
}); 