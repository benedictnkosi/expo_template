import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from './analytics';
import { app } from '@/config/firebase';

// Configure how notifications should be handled when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function registerForPushNotificationsAsync() {
    try {
        console.log('[PushNotifications] Starting registration process...');
        let token;

        if (Platform.OS === 'android') {
            console.log('[PushNotifications] Setting up Android notification channel...');
            try {
                // Ensure Firebase is initialized
                if (!app) {
                    console.error('[PushNotifications] Firebase app not initialized');
                    return null;
                }

                await Notifications.setNotificationChannelAsync('default', {
                    name: 'default',
                    importance: Notifications.AndroidImportance.MAX,
                    vibrationPattern: [0, 250, 250, 250],
                    lightColor: '#FF231F7C',
                });
                console.log('[PushNotifications] Android notification channel setup successful');
            } catch (error) {
                console.error('[PushNotifications] Failed to set up Android notification channel:', error);
                throw error;
            }
        }

        if (Device.isDevice) {
            console.log('[PushNotifications] Device is physical, checking permissions...');
            try {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                console.log('[PushNotifications] Current permission status:', existingStatus);
                let finalStatus = existingStatus;

                if (existingStatus !== 'granted') {
                    console.log('[PushNotifications] Requesting permissions...');
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                    console.log('[PushNotifications] New permission status:', status);
                }

                if (finalStatus !== 'granted') {
                    console.warn('[PushNotifications] Permission not granted. Status:', finalStatus);
                    return null;
                }

                console.log('[PushNotifications] Getting Expo push token...');
                try {
                    token = (await Notifications.getExpoPushTokenAsync({
                        projectId: 'b4f9ab87-947e-4014-8990-0c11fa29cb2c'
                    })).data;
                    console.log('[PushNotifications] Successfully obtained push token');
                } catch (tokenError) {
                    console.error('[PushNotifications] Failed to get push token:', tokenError);
                    if (Platform.OS === 'android') {
                        console.error('[PushNotifications] Make sure Firebase is properly configured in google-services.json');
                    }
                    throw tokenError;
                }

                try {
                    await AsyncStorage.setItem('pushToken', token);
                    console.log('[PushNotifications] Successfully stored push token');
                } catch (storageError) {
                    console.error('[PushNotifications] Failed to store push token:', storageError);
                    throw storageError;
                }

                try {
                    await analytics.track('push_notification_permission_granted', {
                        platform: Platform.OS,
                        token: token
                    });
                    console.log('[PushNotifications] Successfully tracked permission event');
                } catch (analyticsError) {
                    console.error('[PushNotifications] Failed to track analytics event:', analyticsError);
                    // Don't throw here as this is not critical
                }

                console.log('[PushNotifications] Returning token:', token);
                return token;
            } catch (error) {
                console.error('[PushNotifications] Error during permission/token process:', error);
                throw error;
            }
        } else {
            console.log('[PushNotifications] Not running on a physical device, skipping registration');
        }

        return null;
    } catch (error) {
        console.error('[PushNotifications] Critical error in registration process:', error);
        return null;
    }
}

export async function getStoredPushToken() {
    try {
        return await AsyncStorage.getItem('pushToken');
    } catch (error) {
        console.error('Error getting stored push token:', error);
        return null;
    }
}

export async function removePushToken() {
    try {
        await AsyncStorage.removeItem('pushToken');
    } catch (error) {
        console.error('Error removing push token:', error);
    }
}
