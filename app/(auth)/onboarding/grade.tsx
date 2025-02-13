import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';

const GRADES = ['8', '9', '10', '11', '12'];

export default function GradeSelection() {
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);

  const handleNext = () => {
    if (selectedGrade) {
      router.push({
        pathname: '/onboarding/name',
        params: { grade: selectedGrade }
      });
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
            <ThemedText style={styles.title}>What grade are you in?</ThemedText>
            <ThemedText style={styles.subtitle}>
              We'll show you relevant subjects for your grade
            </ThemedText>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.gradesContainer}
          >
            {GRADES.map((grade) => (
              <TouchableOpacity
                key={grade}
                style={[
                  styles.gradeButton,
                  selectedGrade === grade && styles.selectedGrade
                ]}
                onPress={() => setSelectedGrade(grade)}
              >
                <ThemedText style={[
                  styles.gradeText,
                  selectedGrade === grade && styles.selectedGradeText
                ]}>
                  Grade {grade}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.nextButton,
              !selectedGrade && styles.disabledButton
            ]}
            onPress={handleNext}
            disabled={!selectedGrade}
          >
            <ThemedText style={styles.nextButtonText}>Next</ThemedText>
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
  scrollView: {
    flex: 1,
  },
  gradesContainer: {
    gap: 12,
    paddingBottom: 24,
  },
  gradeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedGrade: {
    borderColor: '#818CF8',
    backgroundColor: '#818CF8',
  },
  gradeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  selectedGradeText: {
    color: '#FFFFFF',
  },
  nextButton: {
    backgroundColor: '#818CF8',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
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