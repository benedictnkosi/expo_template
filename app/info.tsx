import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, Linking } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/Header';
import { useState, useEffect } from 'react';
import { getLearner } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "How does ExamQuiz work?",
    answer: "ExamQuiz helps you practice with real past exam questions tailored to your grade and curriculum. Choose your subjects, select Paper 1 or Paper 2, and start practicing! Each question comes with detailed solutions and explanations. Your progress is tracked separately for each paper and subject, helping you focus on areas that need improvement. You can also switch between quiz mode for practice and lessons mode for learning."
  },
  {
    question: "What are the daily limits?",
    answer: "To ensure balanced learning and prevent burnout, we have set daily limits for different activities:\n\n• Quizzes: 15 attempts per day\n• Lessons: 5 lessons per day (free users)\n• Podcasts: 5 episodes per day\n\nThese limits reset at midnight each day, helping you maintain a consistent study routine. Upgrade to Pro for unlimited access!"
  },
  {
    question: "What are the subscription options?",
    answer: "We offer a Pro subscription with unlimited access to all features:\n\n• Annual Plan: R299 per year\n  - Save over R160 compared to monthly payments\n\n• Monthly Plan: R49 per month\n\nPro subscription includes:\n• Unlimited access to all features\n• Quizzes\n• Lessons\n• Podcasts\n\nChoose the plan that works best for your study schedule and budget."
  },
  {
    question: "Which subjects are not available?",
    answer: "• Currently working on adding Accounting\n\n• Not available due to practical exam requirements:\n\n• Engineering Graphics and Design is not available due to its drawing-based format\n\n• Other subjects are being considered for future addition to expand our curriculum coverage"
  },
];

export default function InfoScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [learnerInfo, setLearnerInfo] = useState<{ name: string; grade: string; school_name: string; school: string; avatar: string } | null>(null);

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
              school: learner.school_name || '',
              avatar: learner.avatar || ''
            });
          }
        } catch (error) {
          console.error('Error fetching learner info:', error);
        }
      }
    }
    loadUser();
  }, [user]);

  return (
    <LinearGradient
      colors={isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC', '#F1F5F9']}
      style={[styles.gradient, { paddingTop: insets.top }]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Header
          learnerInfo={learnerInfo}
        />

        <TouchableOpacity
          style={[styles.whatsappButton, {
            backgroundColor: isDark ? colors.card : 'rgba(255, 255, 255, 0.9)',
            borderColor: colors.border,
            borderWidth: 1
          }]}
          onPress={() => Linking.openURL('https://api.whatsapp.com/send/?phone=27786864479&text=Hi')}
        >
          <ThemedText style={[styles.whatsappText, {
            color: isDark ? '#25D366' : '#25D366'
          }]}>
            👋 Say hi on WhatsApp
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.socialButton, {
            backgroundColor: isDark ? colors.card : 'rgba(255, 255, 255, 0.9)',
            borderColor: colors.border,
            borderWidth: 1
          }]}
          onPress={() => Linking.openURL('https://www.facebook.com/profile.php?id=61573761144016')}
        >
          <FontAwesome name="facebook" size={24} color="#1877F2" style={styles.socialIcon} />
          <ThemedText style={[styles.socialButtonText, {
            color: isDark ? '#1877F2' : '#1877F2'
          }]}>
            Join our Facebook page
          </ThemedText>
        </TouchableOpacity>

        <ThemedText style={[styles.header, { color: colors.text }]}>Frequently Asked Questions</ThemedText>

        {faqs.map((faq, index) => (
          <View key={index} style={[styles.card, {
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: colors.border,
            borderWidth: 1
          }]}>
            <ThemedText style={[styles.title, { color: colors.text }]}>{faq.question}</ThemedText>
            <ThemedText style={[styles.text, { color: colors.textSecondary }]}>{faq.answer}</ThemedText>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.closeButton, {
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: colors.border,
            borderWidth: 1
          }]}
          onPress={() => router.back()}
        >
          <ThemedText style={[styles.closeButtonText, {
            color: colors.text
          }]}>
            Close
          </ThemedText>
        </TouchableOpacity>

        <ThemedText style={[styles.versionText, { color: colors.textSecondary }]}>
          Version 3.0.2876543210
        </ThemedText>

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
    marginBottom: 24,
    marginTop: 20,
  },
  card: {
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
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  whatsappButton: {
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
  },
  socialButton: {
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
  socialButtonText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  socialIcon: {
    marginRight: 8,
  },
  closeButton: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 32,
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
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    opacity: 0.7,
  },
}); 