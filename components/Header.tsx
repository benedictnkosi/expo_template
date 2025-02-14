import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { router } from 'expo-router';
import { User } from 'firebase/auth';

interface HeaderProps {
  title: string;
  user: User | null;
  learnerInfo?: {
    name: string;
    grade: string;
  } | null;
}

export function Header({ title, user, learnerInfo }: HeaderProps) {
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
      <ThemedView style={styles.profileSection}>
        <ThemedView style={styles.userInfo}>
          <ThemedText style={styles.userName}>
            {learnerInfo?.name || 'User'}
          </ThemedText>
          <ThemedText style={styles.userGrade}>
            Grade {learnerInfo?.grade || ''}
          </ThemedText>
        </ThemedView>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          activeOpacity={0.7}
        >
          {user?.photoURL ? (
            <Image
              source={{ uri: user.photoURL }}
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.profileImage, styles.profilePlaceholder]}>
              <ThemedText style={styles.profileInitial}>
                {(user?.displayName?.charAt(0) || '👤').toUpperCase()}
              </ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </ThemedView>
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
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
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
}); 