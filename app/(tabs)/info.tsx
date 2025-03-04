import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, Linking } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { useState, useEffect } from 'react';
import { getLearner } from '../../services/api';
import { useAuth } from '@/contexts/AuthContext';

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
    question: "How does ExamQuiz work?",
    answer: "ExamQuiz helps you practice with real past exam questions. Choose your subjects, select Paper 1 or Paper 2, and start practicing! Each question comes with detailed solutions and explanations. Your progress is tracked separately for each paper and subject."
  },
  {
    question: "What is the difference between Paper 1 and Paper 2?",
    answer: "Each subject is divided into Paper 1 and Paper 2, following the official exam structure. Each paper covers different topics and sections of the curriculum. You can practice both papers separately to ensure complete preparation."
  },
  {
    question: "How does the AI help me learn?",
    answer: "Our AI assistant helps explain concepts in detail when you get a question wrong. It breaks down the solution step-by-step, identifies where you might have gone wrong, and provides additional examples to help you understand."
  },
  {
    question: "How do I select my curriculum and terms?",
    answer: "In your profile settings, you can choose between CAPS and IEB curricula or both, and select which terms (1-4) you want to see questions from. This helps customize your practice to match your school's curriculum and current term."
  },
  {
    question: "How do streaks work?",
    answer: "To maintain your daily streak, you need to get at least 3 correct answers each day. Miss a day or fail to get 3 correct answers, and your streak resets. Keep practicing daily to build your streak! 🔥"
  },
  {
    question: "How do points work?",
    answer: "You earn 1 point for each correct answer. Get on a roll with 3 correct answers in a row, and you'll earn double points for your next correct answers! Keep the streak going to maximize your points. 🎯"
  },
  {
    question: "How does the progress tracking work?",
    answer: "Each subject shows your performance with:\n• Total questions attempted\n• Correct answers (Bullseyes)\n• Incorrect answers (Oopsies)\n• Overall mastery percentage\nThe progress bar color indicates your performance level: green for high scores, amber for medium, and red for areas needing improvement."
  },
  {
    question: "Can I change my grade or school?",
    answer: "Yes, you can update your grade and school in the profile section. Note that changing your grade will reset your progress as questions are grade-specific. Your school information helps us provide relevant curriculum content."
  },
  {
    question: "What if I find an issue with a question?",
    answer: "You can report any issues with questions using the report button in the quiz screen. Our team will review and address the reported issues to ensure accuracy."
  },
  {
    question: "How do I reset my progress?",
    answer: "You can reset your progress for individual subjects from the subject screen. This will clear your progress for that specific subject and let you start fresh."
  }
];

export default function InfoScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [learnerInfo, setLearnerInfo] = useState<{ name: string; grade: string; school_name: string; school: string } | null>(null);

  useEffect(() => {
    async function loadUser() {

      if (user) {


        // Fetch learner info
        try {
          const learner = await getLearner(user.uid);
          if (learner.name && learner.grade && learner.school_name) {
            setLearnerInfo({
              name: learner.name,
              grade: learner.grade?.number?.toString() || '',
              school_name: learner.school_name || '',
              school: learner.school_name || ''
            });
          }
        } catch (error) {
          console.error('Error fetching learner info:', error);
        }
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