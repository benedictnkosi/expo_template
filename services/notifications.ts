// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize notifications
// export async function initializeNotifications() {
//     try {
//         const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');

//         if (notificationsEnabled === null) {
//             await AsyncStorage.setItem('notificationsEnabled', 'true');
//             const hasPermission = await requestNotificationPermissions();
//             if (hasPermission) {
//                 await scheduleDailyReminder();
//             }
//         } else if (notificationsEnabled === 'true') {
//             const hasPermission = await requestNotificationPermissions();
//             if (hasPermission) {
//                 await scheduleDailyReminder();
//             }
//         }
//     } catch (error) {
//         console.error('Error initializing notifications:', error);
//     }
// }

// Request permissions for notifications
// export async function requestNotificationPermissions() {
//     if (Platform.OS === 'android') {
//         await Notifications.setNotificationChannelAsync('default', {
//             name: 'default',
//             importance: Notifications.AndroidImportance.MAX,
//             vibrationPattern: [0, 250, 250, 250],
//             lightColor: '#FF231F7C',
//         });
//     }

//     if (Device.isDevice) {
//         const { status: existingStatus } = await Notifications.getPermissionsAsync();
//         let finalStatus = existingStatus;

//         if (existingStatus !== 'granted') {
//             const { status } = await Notifications.requestPermissionsAsync();
//             finalStatus = status;
//         }

//         if (finalStatus !== 'granted') {
//             console.log('Failed to get notification permissions!');
//             return false;
//         }

//         return true;
//     }

//     return false;
// }

// Schedule a daily reminder notification
// export async function scheduleDailyReminder(hour?: number, minute?: number) {
//     try {
//         await cancelAllNotifications();

//         const reminderHour = hour ?? 12;
//         const reminderMinute = minute ?? 29;

//         await Notifications.scheduleNotificationAsync({
//             content: {
//                 title: 'Time to Practice! 📚',
//                 body: 'Keep your streak going with some daily practice.',
//                 sound: true,
//             },
//             trigger: {
//                 hour: reminderHour,
//                 minute: reminderMinute,
//                 second: 0,
//                 repeats: true,
//             } as unknown as Notifications.NotificationTriggerInput,
//         });

//         await AsyncStorage.setItem('reminderTime', JSON.stringify({ hour: reminderHour, minute: reminderMinute }));

//         return true;
//     } catch (error) {
//         console.error('Error scheduling daily reminder:', error);
//         return false;
//     }
// }

// Get the current reminder time
// export async function getReminderTime() {
//     try {
//         const timeStr = await AsyncStorage.getItem('reminderTime');
//         if (timeStr) {
//             return JSON.parse(timeStr);
//         }
//         return null;
//     } catch (error) {
//         console.error('Error getting reminder time:', error);
//         return null;
//     }
// }

// Cancel all scheduled notifications
// export async function cancelAllNotifications() {
//     try {
//         await Notifications.cancelAllScheduledNotificationsAsync();
//         await AsyncStorage.removeItem('reminderTime');
//         return true;
//     } catch (error) {
//         console.error('Error canceling notifications:', error);
//         return false;
//     }
// }

// Get all pending notifications
// export async function getPendingNotifications() {
//     try {
//         return await Notifications.getAllScheduledNotificationsAsync();
//     } catch (error) {
//         console.error('Error getting pending notifications:', error);
//         return [];
//     }
// }

// Add notification listener
// export function addNotificationListener(
//     callback: (notification: Notifications.Notification) => void
// ) {
//     return Notifications.addNotificationReceivedListener(callback);
// }

// Add notification response listener
// export function addNotificationResponseListener(
//     callback: (response: Notifications.NotificationResponse) => void
// ) {
//     return Notifications.addNotificationResponseReceivedListener(callback);
// }

// Remove notification listener
// export function removeNotificationListener(
//     subscription: ReturnType<typeof Notifications.addNotificationReceivedListener> | ReturnType<typeof Notifications.addNotificationResponseReceivedListener>
// ) {
//     Notifications.removeNotificationSubscription(subscription);
// } 