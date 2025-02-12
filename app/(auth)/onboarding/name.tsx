import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { updateLearner } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function NameScreen() {
  const { grade } = useLocalSearchParams<{ grade: string }>();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleNext = async () => {
    if (!name.trim() || !user?.uid || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await updateLearner(user.uid, {
        name: name.trim(),
        grade: parseInt(grade),
      });
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to update learner:', error);
      setIsSubmitting(false);
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
        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={styles.title}>What's your name?</ThemedText>
            <ThemedText style={styles.subtitle}>
              This is how you'll appear in the app
            </ThemedText>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={50}
          />

          <TouchableOpacity
            style={[
              styles.nextButton,
              (!name.trim() || isSubmitting) && styles.disabledButton
            ]}
            onPress={handleNext}
            disabled={!name.trim() || isSubmitting}
          >
            <ThemedText style={styles.nextButtonText}>
              {isSubmitting ? 'Saving...' : 'Complete'}
            </ThemedText>
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
    padding: 24,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6B4EFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    fontSize: 18,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  nextButton: {
    backgroundColor: '#6B4EFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
}); 