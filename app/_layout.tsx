import '../utils/crypto-polyfill';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { SplashScreen } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import AuthLayout from './_auth';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { app } from '@/config/firebase';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '@/services/notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { styles } from '@/styles/global';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

function RootLayoutNav() {
  const { colors } = useTheme();

  return (
    <AuthProvider>
      <AuthLayout />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <Toast />
    </AuthProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    // Initialize notifications when app starts
    async function initializeNotifications() {
      try {
        console.log('[Notifications] Initializing notifications...');

        // Ensure Firebase is initialized
        if (!app) {
          console.error('[Notifications] Firebase app not initialized');
          return;
        }

        // Register for push notifications
        const token = await registerForPushNotificationsAsync();
        if (token) {
          console.log('[Notifications] Successfully registered for push notifications');
        }

        // Set up notification listeners
        notificationListener.current = Notifications.addNotificationReceivedListener(
          (notification: Notifications.Notification) => {
            console.log('[Notifications] Received notification:', notification);
          }
        );

        responseListener.current = Notifications.addNotificationResponseReceivedListener(
          (response: Notifications.NotificationResponse) => {
            const data = response.notification.request.content.data;
            console.log('[Notifications] Received notification response:', data);

            // Handle notification tap
            if (data?.screen) {
              router.push(data.screen);
            }
          }
        );

        // Cleanup listeners on unmount
        return () => {
          if (notificationListener.current) {
            Notifications.removeNotificationSubscription(notificationListener.current);
          }
          if (responseListener.current) {
            Notifications.removeNotificationSubscription(responseListener.current);
          }
        };
      } catch (error) {
        console.error('[Notifications] Error initializing notifications:', error);
      }
    }

    initializeNotifications();
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

