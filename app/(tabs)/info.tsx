import { StyleSheet, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "How does the quiz work?",
    answer: "Select a subject from your enrolled subjects. You'll be presented with questions one at a time. Answer each question and get immediate feedback. You can skip questions or move to the next one after answering."
  },
  {
    question: "How do I add subjects?",
    answer: "On the home screen, scroll down to 'Available Subjects' and tap on any subject you want to add. It will immediately appear in 'Your Subjects' section."
  },
  {
    question: "Can I remove subjects?",
    answer: "Yes, in 'Your Subjects' section, tap the remove (⊝) button next to any subject. Note that this will reset your progress for that subject."
  },
  {
    question: "How is my progress tracked?",
    answer: "Each subject shows your progress with the number of questions answered and a progress bar. Your progress is saved automatically as you answer questions."
  },
  {
    question: "What types of questions are there?",
    answer: "There are two types: multiple choice questions where you select from options, and text input questions where you type your answer."
  },
  {
    question: "Can I update my profile?",
    answer: "Yes, tap on the profile tab to update your name and grade at any time."
  },
  {
    question: "What if I can't see the question image clearly?",
    answer: "Tap on any question image to view it in full screen. You can zoom in and swipe down to close."
  }
];

export default function InfoScreen() {
  return (
    <LinearGradient
      colors={['#DBEAFE', '#F3E8FF']}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            How It Works
          </ThemedText>
        </ThemedView>

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
  },
  header: {
    padding: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6B4EFF',
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
    color: '#6B4EFF',
    marginBottom: 8,
  },
  answer: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
}); 