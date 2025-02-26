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
            <ThemedText style={styles.title}>Register to ExamQuiz</ThemedText>
            <ThemedText style={styles.subtitle}>Let's ace this! 🎯</ThemedText>
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
              style={[styles.googleButton, isLoading && styles.buttonDisabled]}
              onPress={() => promptAsync()}
              disabled={!request || isLoading || !selectedGrade}
            >
              <AntDesign
                name="google"
                size={24}
                color="#DB4437"
                style={styles.googleIcon}
              />
              <ThemedText style={styles.googleButtonText}>
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
    fontSize: 20,
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
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
    color: '#FFFFFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  }
}); 