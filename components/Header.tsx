import { StyleSheet, View, Image, TouchableOpacity, Share } from 'react-native';
import { ThemedText } from './ThemedText';
import { User } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  title: string;
  user: User | null;
  learnerInfo: {
    name: string;
    grade: string;
  } | null;
}

export function Header({ title, user, learnerInfo }: HeaderProps) {
  const insets = useSafeAreaInsets();

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out Exam Quiz - Your ultimate study companion! https://play.google.com/store/apps/details?id=za.co.examquizafrica',
        title: 'Share Exam Quiz'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={[styles.header, { marginTop: insets.top }]}>
      <View style={styles.greeting}>
        <ThemedText style={styles.welcomeText}>Hi, {learnerInfo?.name || ''}</ThemedText>
        <ThemedText style={styles.subtitle}>Let's make this day productive</ThemedText>
      </View>

      <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
        <Ionicons name="share-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  greeting: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
  },
  profileSection: {
    marginLeft: 16,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  profilePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  shareButton: {
    padding: 8,
  },
}); 