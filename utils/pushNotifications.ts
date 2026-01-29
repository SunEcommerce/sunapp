import Pushy from 'pushy-react-native';
import { Platform } from 'react-native';

/**
 * Push Notification Utility for Pushy.me Integration
 * 
 * This module provides functions to initialize Pushy push notifications,
 * register the device, and handle incoming notifications.
 */

export interface PushNotificationData {
  title?: string;
  message?: string;
  badge?: number;
  [key: string]: any;
}

export type NotificationHandler = (data: PushNotificationData) => void;

let deviceToken: string | null = null;
let notificationHandler: NotificationHandler | null = null;

/**
 * Initialize Pushy push notifications
 * @param apiKey Your Pushy API key (get it from https://dashboard.pushy.me/)
 * @returns Promise<string> The device token
 */
export const initializePushy = async (apiKey: string): Promise<string> => {
  try {
    // Check if Pushy module is available
    if (!Pushy || typeof Pushy.register !== 'function') {
      throw new Error(
        'Pushy module not available. ' +
        'Push notifications are not supported on:\n' +
        '- Web browsers\n' +
        '- Expo Go app\n\n' +
        'To use push notifications, you need to:\n' +
        '1. Create a development build: npx expo run:android or npx expo run:ios\n' +
        '2. Or build with EAS: eas build --profile development'
      );
    }

    // Check if running on web
    if (Platform.OS === 'web') {
      throw new Error('Push notifications are not supported on web platform');
    }

    // Register the device for push notifications
    deviceToken = await Pushy.register();
    console.log('Pushy device token:', deviceToken);

    // Set up notification listener
    Pushy.setNotificationListener(async (data: string | object) => {
      console.log('Received notification:', data);
      
      // Call the registered handler if exists
      if (notificationHandler && typeof data === 'object') {
        notificationHandler(data as PushNotificationData);
      }
    });

    // Set up notification click listener
    Pushy.setNotificationClickListener(async (data: string | object) => {
      console.log('Notification clicked:', data);
      
      // You can navigate to specific screens based on notification data
      if (notificationHandler && typeof data === 'object') {
        notificationHandler(data as PushNotificationData);
      }
    });

    // iOS: Request notification permissions
    if (Platform.OS === 'ios') {
      const isRegistered = await Pushy.isRegistered();
      if (!isRegistered) {
        throw new Error('Push notifications permission denied');
      }
    }

    if (!deviceToken) {
      throw new Error('Failed to retrieve device token');
    }

    return deviceToken;
  } catch (error) {
    console.error('Failed to initialize Pushy:', error);
    throw error;
  }
};

/**
 * Register a handler for incoming push notifications
 * @param handler Function to be called when notification is received
 */
export const setNotificationHandler = (handler: NotificationHandler) => {
  notificationHandler = handler;
};

/**
 * Get the current device token
 * @returns The device token or null if not initialized
 */
export const getDeviceToken = (): string | null => {
  return deviceToken;
};

/**
 * Check if push notifications are registered
 * @returns Promise<boolean> True if registered
 */
export const isPushyRegistered = async (): Promise<boolean> => {
  try {
    return await Pushy.isRegistered();
  } catch (error) {
    console.error('Error checking Pushy registration:', error);
    return false;
  }
};

/**
 * Subscribe to a topic for targeted notifications
 * @param topic The topic name to subscribe to
 */
export const subscribeToTopic = async (topic: string): Promise<void> => {
  try {
    await Pushy.subscribe(topic);
    console.log(`Subscribed to topic: ${topic}`);
  } catch (error) {
    console.error(`Failed to subscribe to topic ${topic}:`, error);
    throw error;
  }
};

/**
 * Unsubscribe from a topic
 * @param topic The topic name to unsubscribe from
 */
export const unsubscribeFromTopic = async (topic: string): Promise<void> => {
  try {
    await Pushy.unsubscribe(topic);
    console.log(`Unsubscribed from topic: ${topic}`);
  } catch (error) {
    console.error(`Failed to unsubscribe from topic ${topic}:`, error);
    throw error;
  }
};

/**
 * Toggle app badge (iOS only)
 * @param badge Badge number to display
 */
export const setBadge = (badge: number): void => {
  if (Platform.OS === 'ios') {
    Pushy.setBadge(badge);
  }
};

/**
 * Clear app badge (iOS only)
 */
export const clearBadge = (): void => {
  if (Platform.OS === 'ios') {
    Pushy.setBadge(0);
  }
};

/**
 * Unregister device from push notifications
 */
export const unregisterPushy = async (): Promise<void> => {
  try {
    await Pushy.unregister();
    deviceToken = null;
    notificationHandler = null;
    console.log('Successfully unregistered from push notifications');
  } catch (error) {
    console.error('Failed to unregister from Pushy:', error);
    throw error;
  }
};
