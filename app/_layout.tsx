import '../utils/crypto-polyfill';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef } from 'react';
import 'react-native-reanimated';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import AuthLayout from './_auth';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { addNotificationListener, addNotificationResponseListener, removeNotificationListener, initializeNotifications } from '../services/notifications';
import { router } from 'expo-router';

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
        <Stack.Screen
          name="quiz"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal'
          }}
        />
      </Stack>
      <Toast />
    </AuthProvider>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    // Set up notification listeners
    notificationListener.current = addNotificationListener(notification => {
      console.log('Received notification:', notification);
    });

    responseListener.current = addNotificationResponseListener(response => {
      const data = response.notification.request.content.data;

      // Handle notification tap
      if (data?.screen) {
        router.push(data.screen);
      }
    });

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        removeNotificationListener(notificationListener.current);
      }
      if (responseListener.current) {
        removeNotificationListener(responseListener.current);
      }
    };
  }, []);

  useEffect(() => {
    // Initialize notifications when app starts
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

const styles = StyleSheet.create({
  container: {
    flex: 1
  }
});

