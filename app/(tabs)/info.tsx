import { StyleSheet, ScrollView, Platform, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Linking } from 'react-native';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "How does ExamQuiz work?",
    answer: "ExamQuiz provides past exam questions for practice. Select your grade and subjects, then practice questions one at a time. Each question includes detailed solutions and explanations. Your progress is tracked per subject."
  },
  {
    question: "What subjects are available?",
    answer: "We currently offer Mathematics, Physical Sciences, and Life Sciences for Grades 10-12. Questions are from past exam papers and are curated by subject experts."
  },
  {
    question: "How do I track my progress?",
    answer: "Each subject shows your total questions attempted, questions answered correctly, and overall progress. You can reset your progress at any time from the subject screen."
  },
  {
    question: "Can I change my grade?",
    answer: "Yes, you can change your grade in the profile section. Note that changing your grade will reset your progress as questions are grade-specific."
  },
  {
    question: "What if I find a mistake?",
    answer: "Each question has a 'Report Issue' button. Click it to report any errors via WhatsApp, and our team will review and fix it promptly."
  },
  {
    question: "Is the app free to use?",
    answer: "Yes, ExamQuiz is completely free! We believe in making quality education accessible to all South African students."
  },
  {
    question: "Need help or have suggestions?",
    answer: "We're here to help! Click the WhatsApp button above to chat with us directly. We welcome your feedback and questions."
  }
];

export default function InfoScreen() {
  const { user } = useAuth();
  const [learnerInfo, setLearnerInfo] = useState<{ name: string; grade: string } | null>(null);

  return (
    <LinearGradient
      colors={['#DBEAFE', '#F3E8FF']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView style={styles.container}>
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

        <ThemedView style={styles.content}>
          {FAQ_ITEMS.map((item, index) => (
            <ThemedView key={index} style={styles.faqItem}>
              <ThemedText style={styles.question}>
                {item.question}
              </ThemedText>
              <ThemedText style={styles.answer}>
                {item.answer}
              </ThemedText>
            </ThemedView>
          ))}
        </ThemedView>
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
    padding: 20,
  },
  header: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 40,
  },
  content: {
    padding: 20,
    gap: 20,
  },
  faqItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 20,
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
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  answer: {
    fontSize: 16,
    color: '#666',
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