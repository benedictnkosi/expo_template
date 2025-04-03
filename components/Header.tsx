import { StyleSheet, View, Image, TouchableOpacity, ImageSourcePropType } from 'react-native';
import { ThemedText } from './ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

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

interface HeaderProps {
  learnerInfo: {
    name: string;
    grade: string;
    school?: string;
    avatar?: string;
  } | null;
}

export function Header({ learnerInfo }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const avatarSource = learnerInfo?.avatar && avatarImages[learnerInfo.avatar]
    ? avatarImages[learnerInfo.avatar]
    : avatarImages['default'];

  return (
    <View style={styles.header}>
      <View style={styles.greeting}>
        <ThemedText style={styles.welcomeText} testID='welcome-text'>
          <ThemedText style={styles.appName}>📚 Exam Quiz</ThemedText> <ThemedText style={styles.emoji}>✨</ThemedText>
        </ThemedText>
        <ThemedText style={styles.subtitle}>Explore the Joy of Learning! 🎓</ThemedText>
      </View>

      {learnerInfo && (
        <TouchableOpacity onPress={() => router.push('/profile')}>
          <View style={styles.profileSection}>
            <Image
              source={avatarSource}
              style={styles.profileImage}
              resizeMode="cover"
            />
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    
  },
  greeting: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  emoji: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
  },
  profileSection: {
    marginLeft: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  schoolText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
}); 