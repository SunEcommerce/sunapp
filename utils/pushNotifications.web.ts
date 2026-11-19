// Pushy and Expo push notifications are native-only. Do not import their SDKs
// on web: expo-notifications registers a push-token listener at module load.
import type { NotificationHandler, NotificationClickHandler } from './pushNotifications';
export type { PushNotificationData, NotificationHandler, NotificationClickHandler } from './pushNotifications';

export const initializePushy = async (_apiKey: string): Promise<string> => {
  throw new Error('Push notifications are not supported on web platform');
};
export const setNotificationHandler = (_handler: NotificationHandler): void => {};
export const setNotificationClickHandler = (_handler: NotificationClickHandler): void => {};
export const getDeviceToken = (): string | null => null;
export const isPushyRegistered = async (): Promise<boolean> => false;
export const subscribeToTopic = async (_topic: string): Promise<void> => {};
export const unsubscribeFromTopic = async (_topic: string): Promise<void> => {};
export const setBadge = (_badge: number): void => {};
export const clearBadge = (): void => {};
export const unregisterPushy = async (): Promise<void> => {};
