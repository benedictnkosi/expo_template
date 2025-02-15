import { View, TouchableOpacity, Image, StyleSheet, Linking, Platform, Share } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { router } from 'expo-router';
import { User } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  title: string;
  user: User | null;
  learnerInfo?: {
    name: string;
    grade: string;
  } | null;
}

export function Header({ title, user, learnerInfo }: HeaderProps) {
  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out ExamQuiz for free exam practice!',
        url: 'https://examquiz.co.za',
        title: 'ExamQuiz'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <ThemedView style={styles.header}>
      <TouchableOpacity
        onPress={() => router.push('/(tabs)')}
        activeOpacity={0.7}
      >
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <View style={styles.profileSection}>
        <View style={styles.userInfo}>
          <ThemedText style={styles.userName}>
            {learnerInfo?.name || 'User'}
          </ThemedText>
          <ThemedText style={styles.userGrade}>
            Grade {learnerInfo?.grade || ''}
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={handleShare}
          activeOpacity={0.7}
          style={styles.shareButton}
        >
          <Ionicons name="share-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    marginBottom: 24,
  },
  logo: {
    width: 180,
    height: 40,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userInfo: {
    alignItems: 'flex-end',
    gap: 2,
  },
  userName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    lineHeight: 14,
  },
  userGrade: {
    fontSize: 10,
    color: '#666',
    opacity: 0.8,
    lineHeight: 12,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
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
      }
    }),
  },
  shareIcon: {
    fontSize: 24,
    color: '#000000',
  },
}); 