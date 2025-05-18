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
        let token;

        if (Platform.OS === 'android') {
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
            } catch (error) {
                console.error('[PushNotifications] Failed to set up Android notification channel:', error);
                throw error;
            }
        }

        if (Device.isDevice) {
            try {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;

                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }

                if (finalStatus !== 'granted') {
                    return null;
                }

                try {
                    token = (await Notifications.getExpoPushTokenAsync({
                        projectId: 'b4f9ab87-947e-4014-8990-0c11fa29cb2c'
                    })).data;
                } catch (tokenError) {
                    console.error('[PushNotifications] Failed to get push token:', tokenError);
                    throw tokenError;
                }

                try {
                    await AsyncStorage.setItem('pushToken', token);
                } catch (storageError) {
                    console.error('[PushNotifications] Failed to store push token:', storageError);
                    throw storageError;
                }
                return token;
            } catch (error) {
                console.error('[PushNotifications] Error during permission/token process:', error);
                throw error;
            }
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
