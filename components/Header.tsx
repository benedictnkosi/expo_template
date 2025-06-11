import { StyleSheet, View, Image, TouchableOpacity, ImageSourcePropType } from 'react-native';
import { ThemedText } from './ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { HOST_URL } from '@/config/api';

const avatarImages: Record<string, ImageSourcePropType> = {
  '1': require('../assets/images/avatars/1.png'),
  '2': require('../assets/images/avatars/2.png'),
  '3': require('../assets/images/avatars/3.png'),
  '4': require('../assets/images/avatars/4.png'),
  '5': require('../assets/images/avatars/5.png'),
  '6': require('../assets/images/avatars/6.png'),
  '7': require('../assets/images/avatars/7.png'),
  '8': require('../assets/images/avatars/8.png'),
  '9': require('../assets/images/avatars/9.png'),
  'default': require('../assets/images/avatars/8.png'),
};

interface LearnerInfo {
  name: string;
  avatar?: string;
  points?: number;
}

export function Header() {
  const insets = useSafeAreaInsets();
  const [learnerInfo, setLearnerInfo] = useState<LearnerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLearnerInfo() {
      console.log('Fetching learner info');
      try {
        const authData = await SecureStore.getItemAsync('auth');
        console.log('Auth data:', authData);
        if (!authData) {
          console.error('No auth data found');
          setIsLoading(false);
          return;
        }

        const { user } = JSON.parse(authData);
        console.log('User:', user);
        if (!user?.uid) {
          console.error('No user UID found');
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${HOST_URL}/api/language-learners/uid/${user.uid}`);
        if (!response.ok) {
          throw new Error('Failed to fetch learner info');
        }
        const data = await response.json();
        console.log('Learner data:', data);
        setLearnerInfo(data);
      } catch (error) {
        console.error('Error fetching learner info:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLearnerInfo();
  }, []);

  const avatarSource = learnerInfo?.avatar && avatarImages[learnerInfo.avatar]
    ? avatarImages[learnerInfo.avatar]
    : avatarImages['default'];

  return (
    <View style={styles.header}>
      <View style={styles.greeting}>
        <ThemedText style={styles.welcomeText} testID='welcome-text'>
          <ThemedText style={styles.appName}>🏳️‍🌈 Dimpo Lingo </ThemedText>
        </ThemedText>
        <ThemedText style={styles.subtitle}>Don't be that Zulu guy. 🌍</ThemedText>
      </View>

      {!isLoading && learnerInfo && (
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <View style={styles.profileSection}>
            <View style={styles.pointsAvatarRow}>
              {learnerInfo.points !== undefined && (
                <View style={styles.pointsContainer}>
                  <ThemedText style={styles.points}>🪙 {learnerInfo.points}</ThemedText>
                </View>
              )}
              <Image
                source={avatarSource}
                style={styles.profileImage}
                resizeMode="cover"
              />
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginTop: 24,
    marginBottom: 16,
  },
  greeting: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  emoji: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  profileSection: {
    marginLeft: 12,
    alignItems: 'center',
  },
  pointsAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  pointsContainer: {
    marginTop: 0,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  points: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
}); 