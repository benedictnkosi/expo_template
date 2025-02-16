import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, TextInput, Alert, Platform, ScrollView, View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/config/firebase';
import { ThemedText } from '@/components/ThemedText';
import { router } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { doc, setDoc } from 'firebase/firestore';
import Toast from 'react-native-toast-message';
import { fetchGrades } from '@/services/api';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [grades, setGrades] = useState<{ id: number; number: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadGrades() {
      try {
        const gradesData = await fetchGrades();
        const sortedGrades = gradesData
          .filter(grade => grade.active === 1)
          .sort((a, b) => b.number - a.number);
        setGrades(sortedGrades);

        if (sortedGrades.length > 0) {
          setGrade(sortedGrades[0].number.toString());
        }
      } catch (error) {
        console.error('Failed to fetch grades:', error);
      }
    }
    loadGrades();
  }, []);

  const handleRegister = async () => {
    if (!email || !password || !name || !grade) {
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
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created:', user);
      // Call learner update API
      const response = await fetch('https://api.examquiz.co.za/public/learn/learner/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          name,
          grade: parseInt(grade),
          email,
        })
      });

      console.log('Response:', response);

      if (!response.ok) {
        throw new Error('Failed to update learner profile');
      }

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Registration error:', error.code, error.message);

      const messages: { [key: string]: string } = {
        'auth/email-already-in-use': 'An account with this email already exists',
        'auth/invalid-email': 'Invalid email address',
        'auth/weak-password': 'Password should be at least 6 characters'
      };

      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: messages[error.code] || 'Failed to create account',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#DBEAFE', '#F3E8FF']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <ThemedText style={styles.subtitle}>Create your account</ThemedText>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={grade}
                onValueChange={(value) => setGrade(value)}
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
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              <ThemedText style={styles.buttonText}>
                {isLoading ? 'Creating Account...' : 'Register'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.replace('/login')}
          >
            <ThemedText style={styles.linkText}>
              Already have an account? Sign In
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 240,
    height: 80,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  form: {
    width: '100%',
    marginVertical: 24,
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 8,
    overflow: Platform.OS === 'ios' ? 'hidden' : 'visible',
  },
  picker: {
    height: Platform.OS === 'ios' ? 150 : 50,
    width: '100%',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 0,
    elevation: 0,
  },
  button: {
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#000000',
    fontSize: 14,
  },
}); 