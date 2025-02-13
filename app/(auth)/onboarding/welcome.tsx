import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';

export default function Welcome() {
  console.log('Welcome screen loaded');
  return (
    <LinearGradient
      colors={['#DBEAFE', '#F3E8FF']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="school" size={80} color="#6B4EFF" />
          </View>
          
          <View style={styles.textContainer}>
            <ThemedText style={styles.title}>Welcome to Exam Quiz</ThemedText>
            <ThemedText style={styles.subtitle}>
              Your personal study companion for exam preparation
            </ThemedText>
          </View>

          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.push('/onboarding/grade')}
          >
            <ThemedText style={styles.buttonText}>Let's Get Started</ThemedText>
          </TouchableOpacity>
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
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingVertical: 60,
  },
  iconContainer: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6B4EFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#818CF8',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
}); 