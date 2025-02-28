import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleUser } from '@/contexts/AuthContext';
import { router } from 'expo-router';

interface HeaderProps {
  title: string;
  user: GoogleUser | null;
  learnerInfo: {
    name: string;
    grade: string;
    school?: string;
  } | null;
}

export function Header({ title, user, learnerInfo }: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { marginTop: insets.top }]}>
      <View style={styles.greeting}>
        <ThemedText style={styles.welcomeText} testID='welcome-text'>
          Hey, {learnerInfo?.name || ''}!
        </ThemedText>
        <ThemedText style={styles.subtitle}>{learnerInfo?.school || ''}</ThemedText>
      </View>

      <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
        <View style={styles.profileSection}>
          {user?.picture ? (
            <Image
              source={{ uri: user.picture }}
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.profileImage, styles.profilePlaceholder]}>
              <ThemedText style={styles.profileInitial}>
                {learnerInfo?.name?.[0]?.toUpperCase() || '?'}
              </ThemedText>
            </View>
          )}
        </View>
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
    color: '#999',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
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