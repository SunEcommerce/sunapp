import * as Notifications from 'expo-notifications';
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
  body?: string; // Support both message and body fields
  badge?: number;
  screen?: string; // Target screen to navigate to
  orderId?: string; // Order ID for order-related notifications
  productId?: string; // Product ID for product-related notifications
  [key: string]: any; // Allow additional custom data
}

export type NotificationHandler = (data: PushNotificationData) => void;
export type NotificationClickHandler = (data: PushNotificationData) => void;

let deviceToken: string | null = null;
let notificationHandler: NotificationHandler | null = null;
let notificationClickHandler: NotificationClickHandler | null = null;

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return false;
  }
};

/**
 * Setup Android notification channel (required for Android 8.0+)
 */
const setupAndroidNotificationChannel = async (): Promise<void> => {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
      console.log('Android notification channel created');
    } catch (error) {
      console.error('Failed to create notification channel:', error);
    }
  }
};

/**
 * Display a local notification
 */
const showLocalNotification = async (data: PushNotificationData): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: data.title || 'Notification',
        body: data.body || data.message || '',
        data: data,
        sound: true,
        badge: data.badge,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null, // Show immediately
    });
    console.log('Local notification displayed');
  } catch (error) {
    console.error('Failed to show local notification:', error);
  }
};

/**
 * Parse and normalize notification data from Pushy
 * Handles stringified data field and merges all properties
 */
const parseNotificationData = (data: string | object): PushNotificationData => {
  let parsedData: any = typeof data === 'string' ? {} : { ...data };
  
  // If data field is a stringified JSON, parse it
  if (parsedData.data && typeof parsedData.data === 'string') {
    try {
      const nestedData = JSON.parse(parsedData.data);
      // Merge nested data with top-level data
      parsedData = { ...parsedData, ...nestedData };
      delete parsedData.data; // Remove the stringified data field
    } catch (error) {
      console.error('Failed to parse notification data field:', error);
    }
  }
  
  console.log('Parsed notification data:', parsedData);
  return parsedData as PushNotificationData;
};

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

    // Request notification permissions
    await requestNotificationPermissions();
    
    // Setup Android notification channel
    await setupAndroidNotificationChannel();
    
    // Set up expo notification response listener (for when user taps notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data as PushNotificationData;
        
        if (notificationClickHandler && data) {
          notificationClickHandler(data);
        }
      } catch (error) {
        console.error('Error handling notification response:', error);
      }
    });
    
    // Register the device for push notifications
    deviceToken = await Pushy.register();
    console.log('Pushy device token:', deviceToken);

    // Set up notification listener (when notification is received, not clicked)
    Pushy.setNotificationListener(async (data: string | object) => {
      try {
        console.log('Received notification (raw):', data);
        
        const notificationData = parseNotificationData(data);
        
        // Show visual notification
        await showLocalNotification(notificationData);
        
        // Handle badge updates automatically
        if (notificationData.badge !== undefined) {
          setBadge(notificationData.badge);
        }
        
        // DO NOT navigate here - only when clicked
        // Call the received handler if exists (for other purposes like updating UI state)
        if (notificationHandler) {
          notificationHandler(notificationData);
        }
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });

    // Set up notification click listener (when user clicks on notification)
    Pushy.setNotificationClickListener(async (data: string | object) => {
      try {
        console.log('Notification clicked (raw):', data);
        
        const notificationData = parseNotificationData(data);
        
        // Handle badge updates
        if (notificationData.badge !== undefined) {
          setBadge(notificationData.badge);
        }
        
        // Pass to CLICK handler for navigation
        if (notificationClickHandler) {
          notificationClickHandler(notificationData);
        }
      } catch (error) {
        console.error('Error in notification click listener:', error);
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
 * Register a handler for incoming push notifications (received, not clicked)
 * @param handler Function to be called when notification is received
 */
export const setNotificationHandler = (handler: NotificationHandler) => {
  notificationHandler = handler;
};

/**
 * Register a handler for notification clicks
 * @param handler Function to be called when notification is clicked
 */
export const setNotificationClickHandler = (handler: NotificationClickHandler) => {
  notificationClickHandler = handler;
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
