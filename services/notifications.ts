import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { analytics } from './analytics';

// Configure how notifications should be handled when the app is in the foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return null;
        }

        token = (await Notifications.getExpoPushTokenAsync({
            projectId: 'b4f9ab87-947e-4014-8990-0c11fa29cb2c' // Your Expo project ID from app.config.js
        })).data;

        // Store the token
        await AsyncStorage.setItem('pushToken', token);

        // Track the event
        await analytics.track('push_notification_permission_granted', {
            platform: Platform.OS,
            token: token
        });

        return token;
    }

    return null;
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
