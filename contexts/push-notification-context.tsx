import {
    clearBadge,
    initializePushy,
    isPushyRegistered,
    PushNotificationData,
    setBadge,
    setNotificationHandler,
    subscribeToTopic,
    unregisterPushy,
    unsubscribeFromTopic
} from '@/utils/pushNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

  const initialize = async (key: string) => {
    if (isInitializing) return;

    setIsInitializing(true);
    setError(null);

    console.log("start initializing push notifications");
    try {
      // Set up notification handler
      setNotificationHandler((data) => {
        console.log('Notification received in context:', data);
        setLastNotification(data);
      });

      // Initialize Pushy
      const token = await initializePushy(key);
      setDeviceToken(token);
      setIsRegistered(true);

      // Save token to AsyncStorage
      await AsyncStorage.setItem(PUSHY_DEVICE_TOKEN_KEY, token);

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
