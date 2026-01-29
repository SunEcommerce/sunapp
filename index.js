import * as Notifications from 'expo-notifications';
import 'expo-router/entry';
import Pushy from 'pushy-react-native';
import { AppRegistry } from 'react-native';

// Register background notification handler for when app is killed/closed
Pushy.setNotificationListener(async (data) => {
  try {
    console.log('Background notification received:', data);
    
    // Parse data if it's stringified
    let notificationData = data;
    if (data.data && typeof data.data === 'string') {
      try {
        const nestedData = JSON.parse(data.data);
        notificationData = { ...data, ...nestedData };
        delete notificationData.data;
      } catch (error) {
        console.error('Failed to parse notification data:', error);
      }
    }
    
    // Display notification when app is in background/killed
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notificationData.title || 'Notification',
        body: notificationData.body || notificationData.message || '',
        data: notificationData,
        sound: true,
        badge: notificationData.badge,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
    
    console.log('Background notification displayed');
  } catch (error) {
    console.error('Error handling background notification:', error);
  }
});

// Register headless task for Pushy (this runs even when app is killed)
AppRegistry.registerHeadlessTask('PushyPushReceiver', () => {
  return async (taskData) => {
    try {
      console.log('Headless task received:', taskData);
      
      // Parse notification data
      let notificationData = taskData;
      if (taskData.data && typeof taskData.data === 'string') {
        try {
          const nestedData = JSON.parse(taskData.data);
          notificationData = { ...taskData, ...nestedData };
          delete notificationData.data;
        } catch (error) {
          console.error('Failed to parse task data:', error);
        }
      }
      
      // Show notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationData.title || 'Notification',
          body: notificationData.body || notificationData.message || '',
          data: notificationData,
          sound: true,
          badge: notificationData.badge,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });
      
      console.log('Headless notification displayed');
    } catch (error) {
      console.error('Error in headless task:', error);
    }
  };
});
