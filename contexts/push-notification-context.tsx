import {
  clearBadge,
  initializePushy,
  isPushyRegistered,
  PushNotificationData,
  setBadge,
  setNotificationClickHandler,
  setNotificationHandler,
  subscribeToTopic,
  unregisterPushy,
  unsubscribeFromTopic
} from '@/utils/pushNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

const PUSHY_DEVICE_TOKEN_KEY = '@pushy_device_token';

interface PushNotificationContextType {
  deviceToken: string | null;
  isRegistered: boolean;
  isInitializing: boolean;
  lastNotification: PushNotificationData | null;
  error: string | null;
  initialize: (apiKey: string) => Promise<void>;
  subscribe: (topic: string) => Promise<void>;
  unsubscribe: (topic: string) => Promise<void>;
  updateBadge: (count: number) => void;
  clearBadgeCount: () => void;
  unregister: () => Promise<void>;
  handleNotificationNavigation: (notification: PushNotificationData) => void;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(
  undefined
);

interface PushNotificationProviderProps {
  children: ReactNode;
  apiKey?: string; // Optional: Auto-initialize with API key
  autoInitialize?: boolean; // Optional: Auto-initialize on mount
}

export const PushNotificationProvider: React.FC<PushNotificationProviderProps> = ({
  children,
  apiKey,
  autoInitialize = false,
}) => {
  const router = useRouter();
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [lastNotification, setLastNotification] = useState<PushNotificationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load saved device token
    const loadDeviceToken = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(PUSHY_DEVICE_TOKEN_KEY);
        if (savedToken) {
          setDeviceToken(savedToken);
          const registered = await isPushyRegistered();
          setIsRegistered(registered);
        }
      } catch (err) {
        console.error('Failed to load device token:', err);
      }
    };

    loadDeviceToken();

    // Auto-initialize if enabled and API key provided
    if (autoInitialize && apiKey) {
      initialize(apiKey);
    }
  }, []);

  // Handle notification navigation based on data
  const handleNotificationNavigation = (notification: PushNotificationData) => {
    try {
      console.log('Handling navigation for notification:');
      // Check if notification has screen data
      if (notification.screen) {
        const screen = notification.screen;
        
        // Navigate based on screen name from notification
        switch (screen) {
          case 'OrderDetails':
          case 'OrderDetail':
          case 'OrderList':
            router.push('/OrderList');
            break;
          case 'ProductDetail':
          case 'ProductDetails':
            if (notification.productId) {
              router.push(`/ProductDetail?productId=${notification.productId}`);
            }
            break;
          case 'ProductList':
            if (notification.productId) {
              router.push(`/ProductList?name=${notification.productId}`);
            } else {
              router.push('/ProductList');
            }
            break;
          case 'Cart':
            router.push('/(tabs)/cart');
            break;
          case 'Profile':
            router.push('/(tabs)/profile');
            break;
          case 'Category':
            router.push('/(tabs)/category');
            break;
          default:
            // Navigate to main screen if unknown
            router.push('/(tabs)');
        }
      }
    } catch (err) {
      console.error('Failed to navigate from notification:', err);
    }
  };

  const initialize = async (key: string) => {
    if (isInitializing) return;

    setIsInitializing(true);
    setError(null);

    console.log("start initializing push notifications");
    try {
      // Set up notification received handler (just update state, no navigation)
      setNotificationHandler((data) => {
        console.log('notification received handler');
      });

      // Set up notification click handler (handle navigation)
      setNotificationClickHandler((data) => {
        setLastNotification(data);
        
        // Handle navigation ONLY when notification is clicked
        handleNotificationNavigation(data);
      });

      // Initialize Pushy
      const token = await initializePushy(key);
      setDeviceToken(token);
      setIsRegistered(true);

      // Save token to AsyncStorage
      await AsyncStorage.setItem(PUSHY_DEVICE_TOKEN_KEY, token);

      // Subscribe to General_Channel topic
      try {
        await subscribeToTopic('default');
        console.log('Subscribed to default topic');
      } catch (err) {
        console.error('Failed to subscribe to default:', err);
      }

      console.log('Push notifications initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Failed to initialize push notifications:', errorMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  const subscribe = async (topic: string) => {
    try {
      await subscribeToTopic(topic);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  };

  const unsubscribe = async (topic: string) => {
    try {
      await unsubscribeFromTopic(topic);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  };

  const updateBadge = (count: number) => {
    setBadge(count);
  };

  const clearBadgeCount = () => {
    clearBadge();
  };

  const unregister = async () => {
    try {
      await unregisterPushy();
      setDeviceToken(null);
      setIsRegistered(false);
      await AsyncStorage.removeItem(PUSHY_DEVICE_TOKEN_KEY);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  };

  const value: PushNotificationContextType = {
    deviceToken,
    isRegistered,
    isInitializing,
    lastNotification,
    error,
    initialize,
    subscribe,
    unsubscribe,
    updateBadge,
    clearBadgeCount,
    unregister,
    handleNotificationNavigation,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
};

export const usePushNotifications = () => {
  const context = useContext(PushNotificationContext);
  if (context === undefined) {
    throw new Error('usePushNotifications must be used within a PushNotificationProvider');
  }
  return context;
};
