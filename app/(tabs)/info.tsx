import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, Linking } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

interface User {
  uid: string;
  id: string;
  name: string;
  email: string;
  picture?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'How does ExamQuiz work?',
    answer: 'ExamQuiz provides past exam questions for practice. Select your grade and subjects, then practice questions one at a time. Each question includes detailed solutions and explanations. Your progress is tracked per subject.'
  },
  {
    question: 'How do streaks work?',
    answer: 'Streaks are a way to track your daily learning consistency. Get at least one question correct each day to maintain your streak. Miss a day and your streak resets to zero. Keep practicing daily to build up your streak! 🔥'
  },
  {
    question: 'How does the progress bar work?',
    answer: 'The progress bar shows your advancement in each subject. The green bar indicates correct answers, while the total bar length represents all attempted questions. For example, if you have answered 7 out of 10 questions correctly, the progress bar will be 70% green.This helps you track your mastery of each subject.'
  },
  {
    question: 'How do I track my progress?',
    answer: 'Each subject shows your total questions attempted, questions answered correctly, and overall progress. You can reset your progress at any time from the subject screen.'
  },
  {
    question: 'Can I change my grade?',
    answer: 'Yes, you can change your grade in the profile section. Note that changing your grade will reset your progress as questions are grade-specific.'
  },
  {
    question: 'How do I reset my progress?',
    answer: 'You can reset your progress at any time from the subject screen. This will reset your progress and start you from the beginning of the subject.'
  }
];

export default function InfoScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [learnerInfo, setLearnerInfo] = useState<{ name: string; grade: string } | null>(null);

  useEffect(() => {
    async function loadUser() {
      const authData = await SecureStore.getItemAsync('auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        const idToken = parsed.authentication.idToken;
        const tokenParts = idToken.split('.');
        const tokenPayload = JSON.parse(atob(tokenParts[1]));

        setUser({
          uid: tokenPayload.sub,
          id: tokenPayload.sub,
          name: parsed.userInfo.name || '',
          email: parsed.userInfo.email,
          picture: parsed.userInfo.picture
        });
      }
    }
    loadUser();
  }, []);

  return (
    <LinearGradient
      colors={['#FFFFFF', '#F8FAFC', '#F1F5F9']}
      style={[styles.gradient, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Header
          title="Exam Quiz"
          user={user}
          learnerInfo={learnerInfo}
        />

        <TouchableOpacity
          style={styles.whatsappButton}
          onPress={() => Linking.openURL('https://api.whatsapp.com/send/?phone=27837917430&text=Hi')}
        >
          <ThemedText style={styles.whatsappText}>
            👋 Say hi on WhatsApp
          </ThemedText>
        </TouchableOpacity>

        <ThemedText style={styles.header}>Frequently Asked Questions</ThemedText>

        {faqs.map((faq, index) => (
          <View key={index} style={styles.card}>
            <ThemedText style={styles.title}>{faq.question}</ThemedText>
            <ThemedText style={styles.text}>{faq.answer}</ThemedText>
          </View>
        ))}

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 24,
    marginTop: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
  },
  contactSection: {
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 40,
  },
  contactHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#999',
    lineHeight: 24,
  },
  whatsappButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  whatsappText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#25D366', // WhatsApp brand color
  },
}); 