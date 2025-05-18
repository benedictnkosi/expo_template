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
          <ThemedText style={styles.appName}>📚 Dimpo Learning App </ThemedText> <ThemedText style={styles.emoji}>✨</ThemedText>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  schoolText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
}); 