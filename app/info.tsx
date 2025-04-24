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
    question: "How does the AI help me learn?",
    answer: "Our AI assistant provides personalized learning support in multiple ways: it explains concepts in detail when you get a question wrong, breaks down solutions step-by-step, identifies your specific misconceptions, and provides additional examples tailored to your learning style. The AI adapts to your performance over time, focusing more on areas where you need extra help. You can also request AI explanations for any question to deepen your understanding."
  },
  {
    question: "How do I select my curriculum and terms?",
    answer: "In your profile settings, you can choose between CAPS and IEB curricula or both, and select which terms (1-4) you want to see questions from. This helps customize your practice to match your school's curriculum and current term. You can update these settings anytime as you progress through the school year. For Grade 12 learners, you'll also see your upcoming exam dates for each paper."
  },
  {
    question: "How do streaks work?",
    answer: "To maintain your daily streak, you need to get at least 3 correct answers each day. Miss a day or fail to get 3 correct answers, and your streak resets. Keep practicing daily to build your streak! Longer streaks unlock special achievements and badges to showcase your consistency. 🔥 Your streak progress is displayed in a celebratory modal when you achieve a new milestone."
  },
  {
    question: "How do points work?",
    answer: "You earn 1 point for each correct answer. Points contribute to your overall ranking and unlock special features and achievements. Keep practicing daily to maximize your points and improve your knowledge! ⭐ Points are displayed immediately after answering a question correctly, followed by your streak update if applicable."
  },
  {
    question: "How does the progress tracking work?",
    answer: "Each subject shows your performance with:\n• Total questions attempted\n• Correct answers (Bullseyes)\n• Incorrect answers (Oopsies)\n• Overall mastery percentage\n• Time spent per question\nThe progress bar color indicates your performance level: green for high scores (>70%), amber for medium (40-70%), and red for areas needing improvement (<40%). You can view detailed analytics for each subject to identify specific topics to focus on."
  },
  {
    question: "Can I change my grade or school?",
    answer: "Yes, you can update your grade and school in the profile section. Note that changing your grade will reset your progress as questions are grade-specific. Your school information helps us provide relevant curriculum content and allows you to compare your performance with peers at your school (if enabled in privacy settings). For Grade 12 learners, changing your grade will also affect the exam dates displayed."
  },
  {
    question: "What if I find an issue with a question?",
    answer: "You can report any issues with questions using the report button in the quiz screen. Our team will review and address the reported issues to ensure accuracy. We appreciate your feedback as it helps us improve the quality of our question bank for all users. You can also contact us directly through WhatsApp for immediate assistance."
  },
  {
    question: "How do I reset my progress?",
    answer: "You can reset your progress for individual subjects from the subject screen. This will clear your progress for that specific subject and let you start fresh. This is useful when you want to retry a subject after studying or when you want to practice with a clean slate at the beginning of a new term. Your streaks and points will be preserved."
  },
  {
    question: "Why do I keep seeing the same question?",
    answer: "This is part of our spaced repetition learning system! We show you questions multiple times to reinforce your learning. Only after you've answered a question correctly 3 times do we consider it 'mastered,' and then it will appear less frequently. This approach is based on educational research showing that repeated exposure with increasing intervals helps move information from short-term to long-term memory."
  },
  {
    question: "How do I save questions for later?",
    answer: "You can favorite up to 20 questions per paper by tapping the star icon. These questions will be saved in your favorites tab for easy access later. This is great for revisiting challenging questions or creating a custom study set. You can also view popular questions that other learners have found helpful."
  },
  {
    question: "How does the timer work?",
    answer: "Each question has a timer that starts when the question is displayed. The time taken to answer is recorded and contributes to your performance metrics. This helps you practice time management, which is crucial for exam preparation. You can see your average time per question in the performance summary."
  },
  {
    question: "How does the social features work?",
    answer: "ExamQuiz offers several social features to make learning more engaging:\n\n• Follow other learners using their unique 4-letter follow code\n• View your position on the global leaderboard\n• Track your friends' progress and achievements\n• Share your badges and accomplishments\n• Compare your performance with peers at your school\n• View popular questions that other learners have found helpful\n\nThese features help create a supportive learning community while maintaining your privacy."
  },
  {
    question: "How do I follow other learners?",
    answer: "To follow another learner:\n\n1. Go to the Social tab\n2. Enter their 4-letter follow code in the input field\n3. Tap 'Follow'\n\nYou can find your own follow code in the Social tab. Share it with friends so they can follow you too! You can also follow back learners who are following you."
  },
  {
    question: "What are badges and how do I earn them?",
    answer: "Badges are achievements you can earn by reaching specific milestones:\n\n• Learning Marathon badges: Earned for maintaining daily streaks (3, 7, 30 days)\n• Sharp Shooter badges: Awarded for getting questions correct in a row (3, 5, 10)\n• Quiz Master badges: Earned for mastering specific subjects\n• Speed Demon badges: Awarded for answering questions quickly and accurately\n\nYou can view your badges in the Social tab and share them with friends!"
  },
  {
    question: "How does the leaderboard work?",
    answer: "The leaderboard ranks learners based on their total points earned from correct answers. You can see:\n\n• Top 3 learners with special medals (👑, 🥈, 🥉)\n• Your current position and points\n• How you compare to other learners\n• School-specific rankings (if enabled)\n\nThe leaderboard updates in real-time as learners earn points through practice."
  },
  {
    question: "Can I control who sees my progress?",
    answer: "Yes! You have full control over your privacy settings:\n\n• Choose who can follow you\n• Block unwanted followers\n• Control visibility of your progress and achievements\n• Manage who can see your school information\n• Opt out of school rankings\n\nYour privacy is important to us, and you can adjust these settings anytime in your profile."
  },
  {
    question: "How does the timetable work?",
    answer: "The timetable feature helps you organize your academic schedule with two main views:\n\n• Timetable View: Shows your daily class schedule with color-coded subjects. You can add, edit, or delete classes for each day of the week.\n• Planning View: Helps you plan study sessions, track exam dates, and set reminders. You can view your schedule for multiple weeks ahead and add custom events.\n\nBoth views support:\n• Color coding for different subjects\n• Time slot management\n• Event reminders\n• Easy navigation between days and weeks"
  },
  {
    question: "How do I add classes to my timetable?",
    answer: "To add a class to your timetable:\n\n1. Go to the Timetable tab\n2. Select the day you want to add the class to\n3. Tap the '+' button in the bottom right\n4. Fill in the class details:\n   • Subject name\n   • Start and end times\n   • Any additional notes\n\nYour class will be automatically color-coded and added to your schedule. You can edit or delete classes at any time."
  },
  {
    question: "How do I plan my study sessions?",
    answer: "To plan your study sessions:\n\n1. Switch to the Planning tab\n2. Select the date you want to plan for\n3. Tap the '+' button to add a study session\n4. Set the details:\n   • Title and subject\n   • Start and end times\n   • Enable reminders if needed\n\nYou can view your study plan for multiple weeks ahead and easily adjust your schedule as needed. The planning view also shows your upcoming exams and important events."
  },
  {
    question: "How do I track my exam dates?",
    answer: "For Grade 12 learners, exam dates are automatically displayed in the Planning view. You can also manually add exam dates:\n\n1. Go to the Planning tab\n2. Select the exam date\n3. Tap the '+' button\n4. Add the exam details:\n   • Subject and paper (P1/P2)\n   • Start and end times\n   • Enable reminders\n\nYou'll receive notifications for upcoming exams, and they'll be highlighted in your schedule."
  },
  {
    question: "How do I set reminders for classes and events?",
    answer: "You can set reminders for both classes and study sessions:\n\n1. When adding or editing an event\n2. Toggle the reminder option\n3. The app will notify you before the event starts\n\nReminders are indicated by a bell icon in your schedule, and you'll receive notifications at the appropriate time to help you stay on track."
  },
  {
    question: "How do I navigate between different weeks?",
    answer: "In the Planning view, you can:\n\n• Swipe left/right to move between weeks\n• Tap the 'Load More' button to view additional weeks\n• See up to 4 weeks at a time\n• View your entire schedule for the loaded weeks\n\nDates with events are marked with a dot, making it easy to spot busy days in your schedule."
  }
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
}); 