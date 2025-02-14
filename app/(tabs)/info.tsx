import { StyleSheet, ScrollView, Platform, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Linking } from 'react-native';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "How does the quiz work?",
    answer: "Select a subject from your enrolled subjects. You'll be presented with past exam questions one at a time. Each question includes detailed solutions and explanations. Track your progress and improve your understanding of key concepts."
  },
  {
    question: "How do I get started?",
    answer: "After signing in with Google, select your grade and add subjects you want to practice. You can find available subjects on the home screen and tap to add them to your list."
  },
  {
    question: "Can I change my grade?",
    answer: "Yes, you can change your grade in the profile section. Note that changing your grade will reset your progress as questions are grade-specific."
  },
  {
    question: "How is my progress tracked?",
    answer: "Each subject shows your total questions, answered questions, and correct answers. Your progress is saved automatically and you can track your improvement over time."
  },
  {
    question: "Need help or have suggestions?",
    answer: "We're here to help! Click the WhatsApp button above to chat with us directly. We welcome your feedback and questions."
  },
  {
    question: "Can I practice offline?",
    answer: "Currently, an internet connection is required to access questions and track your progress. We're working on offline support for future updates."
  },
  {
    question: "How often are new questions added?",
    answer: "We regularly update our question bank with new past exam papers. Questions are carefully selected and verified by subject matter experts."
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
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </ThemedView>

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