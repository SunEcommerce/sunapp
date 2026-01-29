# Push Notifications with Pushy.me

This document describes how to set up and use push notifications in the SunStore app using Pushy.me service.

## Overview

Pushy.me is a reliable, scalable push notification service for iOS, Android, and web applications. This integration provides push notification capabilities with topic-based subscriptions, badge management, and notification handling.

## Prerequisites

1. **Create a Pushy.me Account**
   - Sign up at [https://pushy.me](https://pushy.me)
   - Create a new app in the dashboard
   - Get your API Key from the dashboard

2. **Install Dependencies**
   ```bash
   npm install
   ```
   The `pushy-react-native` package is already included in package.json.

## Platform Configuration

### Android Configuration

1. Add the following to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Pushy Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="com.google.android.c2dm.permission.RECEIVE" />
    
    <application>
        <!-- ... your existing configuration ... -->
        
        <!-- Pushy Notification Receiver -->
        <receiver android:name="me.pushy.sdk.receivers.PushyBroadcastReceiver"
                  android:exported="true">
            <intent-filter>
                <action android:name="com.google.android.c2dm.intent.RECEIVE" />
                <category android:name="me.pushy.sdk" />
            </intent-filter>
        </receiver>
    </application>
</manifest>
```

2. For Expo apps, add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 21
          }
        }
      ]
    ],
    "android": {
      "permissions": [
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "WAKE_LOCK",
        "RECEIVE_BOOT_COMPLETED",
        "com.google.android.c2dm.permission.RECEIVE"
      ]
    }
  }
}
```

### iOS Configuration

1. Enable push notifications in your Apple Developer account
2. Generate APNs certificates or Auth Keys
3. Upload them to your Pushy.me dashboard

4. For Expo apps, add to `app.json`:

```json
{
  "expo": {
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.sunstore",
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "notification": {
      "icon": "./assets/images/notification-icon.png",
      "color": "#ffffff",
      "androidMode": "default",
      "androidCollapsedTitle": "#{unread_notifications} new notifications"
    }
  }
}
```

## Implementation

### Basic Setup

The push notification service is already integrated in the app. Here's how to use it:

#### 1. Initialize Push Notifications

In any component or screen where you need to initialize push notifications:

```tsx
import { usePushNotifications } from '@/contexts/push-notification-context';
import { useEffect } from 'react';

export default function YourScreen() {
  const { initialize, deviceToken, isInitializing, error } = usePushNotifications();

  useEffect(() => {
    // Initialize with your Pushy API key
    const initPushNotifications = async () => {
      try {
        await initialize('YOUR_PUSHY_API_KEY_HERE');
        console.log('Push notifications initialized');
      } catch (err) {
        console.error('Failed to initialize push notifications:', err);
      }
    };

    initPushNotifications();
  }, []);

  return (
    <View>
      {isInitializing && <Text>Initializing push notifications...</Text>}
      {error && <Text>Error: {error}</Text>}
      {deviceToken && <Text>Device Token: {deviceToken}</Text>}
    </View>
  );
}
```

#### 2. Handle Incoming Notifications

The `lastNotification` state automatically updates when a notification is received:

```tsx
import { usePushNotifications } from '@/contexts/push-notification-context';
import { useEffect } from 'react';

export default function NotificationHandler() {
  const { lastNotification } = usePushNotifications();

  useEffect(() => {
    if (lastNotification) {
      console.log('New notification:', lastNotification);
      
      // Handle notification based on data
      if (lastNotification.type === 'order_update') {
        // Navigate to order details
        // router.push(`/OrderDetail?id=${lastNotification.orderId}`);
      }
    }
  }, [lastNotification]);

  return null;
}
```

#### 3. Subscribe to Topics

```tsx
import { usePushNotifications } from '@/contexts/push-notification-context';

export default function SubscriptionExample() {
  const { subscribe, unsubscribe } = usePushNotifications();

  const handleSubscribe = async () => {
    try {
      await subscribe('order-updates');
      await subscribe('promotions');
      console.log('Subscribed to topics');
    } catch (err) {
      console.error('Subscription failed:', err);
    }
  };

  const handleUnsubscribe = async () => {
    try {
      await unsubscribe('promotions');
      console.log('Unsubscribed from promotions');
    } catch (err) {
      console.error('Unsubscription failed:', err);
    }
  };

  return (
    <View>
      <Button title="Subscribe to Topics" onPress={handleSubscribe} />
      <Button title="Unsubscribe from Promotions" onPress={handleUnsubscribe} />
    </View>
  );
}
```

#### 4. Badge Management (iOS)

```tsx
import { usePushNotifications } from '@/contexts/push-notification-context';

export default function BadgeExample() {
  const { updateBadge, clearBadgeCount } = usePushNotifications();

  const updateNotificationCount = (count: number) => {
    updateBadge(count); // Set badge to specific number
  };

  const clearBadge = () => {
    clearBadgeCount(); // Clear the badge
  };

  return (
    <View>
      <Button title="Set Badge to 5" onPress={() => updateNotificationCount(5)} />
      <Button title="Clear Badge" onPress={clearBadge} />
    </View>
  );
}
```

## Sending Push Notifications

### Using Pushy.me Dashboard

1. Go to your [Pushy.me Dashboard](https://dashboard.pushy.me/)
2. Select your app
3. Click "Send Notification"
4. Enter notification details:
   - **Title**: Notification title
   - **Message**: Notification body
   - **Data**: Custom JSON payload
5. Select target: specific devices, topics, or all devices

### Using Pushy.me API

Send notifications programmatically from your backend:

```javascript
const fetch = require('node-fetch');

async function sendPushNotification(deviceToken, title, message, data) {
  const response = await fetch('https://api.pushy.me/push?api_key=YOUR_API_KEY', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: deviceToken,
      data: {
        title: title,
        message: message,
        ...data,
      },
      notification: {
        title: title,
        body: message,
        badge: 1,
        sound: 'default',
      },
    }),
  });

  return await response.json();
}

// Example usage
sendPushNotification(
  'DEVICE_TOKEN_HERE',
  'Order Shipped',
  'Your order #12345 has been shipped!',
  {
    type: 'order_update',
    orderId: '12345',
    status: 'shipped',
  }
);
```

### Send to Topics

```javascript
async function sendToTopic(topic, title, message) {
  const response = await fetch('https://api.pushy.me/push?api_key=YOUR_API_KEY', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: `/topics/${topic}`,
      data: {
        title: title,
        message: message,
      },
      notification: {
        title: title,
        body: message,
      },
    }),
  });

  return await response.json();
}

// Send to all users subscribed to 'promotions' topic
sendToTopic('promotions', 'Flash Sale!', '50% off on all items for 24 hours');
```

## API Reference

### `usePushNotifications()` Hook

Returns an object with the following properties and methods:

#### Properties

- **`deviceToken`** (`string | null`): The unique device token for push notifications
- **`isRegistered`** (`boolean`): Whether push notifications are registered
- **`isInitializing`** (`boolean`): Whether initialization is in progress
- **`lastNotification`** (`PushNotificationData | null`): The last received notification
- **`error`** (`string | null`): Last error message if any

#### Methods

- **`initialize(apiKey: string)`**: Initialize push notifications with your Pushy API key
- **`subscribe(topic: string)`**: Subscribe to a notification topic
- **`unsubscribe(topic: string)`**: Unsubscribe from a notification topic
- **`updateBadge(count: number)`**: Update app badge count (iOS only)
- **`clearBadgeCount()`**: Clear app badge (iOS only)
- **`unregister()`**: Unregister device from push notifications

## Best Practices

1. **Store API Key Securely**: Never hardcode your API key. Use environment variables or secure storage.

2. **Handle Permissions Gracefully**: Always check if the user has granted notification permissions before sending.

3. **Topic Naming**: Use clear, descriptive topic names like `order-updates`, `promotions`, `user-123`.

4. **Notification Payload**: Keep custom data concise. Use deep linking for navigation.

5. **Testing**: Test notifications on both iOS and Android devices, not just simulators.

6. **User Preferences**: Allow users to opt-in/out of specific notification categories.

## Troubleshooting

### Notifications Not Received

1. Check device token is being generated correctly
2. Verify API key is correct in dashboard and app
3. Check device has internet connection
4. Verify app is not in battery optimization mode (Android)
5. Check notification permissions are granted

### iOS Specific Issues

1. Ensure APNs certificates are uploaded to Pushy dashboard
2. Check bundle identifier matches
3. Verify push notification capability is enabled in Xcode

### Android Specific Issues

1. Check Google Play Services is installed
2. Verify manifest permissions are correct
3. Test on real device (emulator may have issues)

## Environment Variables

Create a `.env` file in your project root:

```env
PUSHY_API_KEY=your_pushy_api_key_here
```

Then use it in your code:

```tsx
import Constants from 'expo-constants';

const PUSHY_API_KEY = Constants.expoConfig?.extra?.pushyApiKey || 'YOUR_FALLBACK_KEY';

// Initialize with environment variable
await initialize(PUSHY_API_KEY);
```

## Resources

- [Pushy.me Documentation](https://pushy.me/docs)
- [Pushy.me Dashboard](https://dashboard.pushy.me/)
- [Pushy.me API Reference](https://pushy.me/docs/api/send-notifications)
- [React Native Push Notifications Guide](https://pushy.me/docs/native/react-native)

## Support

For issues specific to this integration, check the implementation files:
- [utils/pushNotifications.ts](../utils/pushNotifications.ts)
- [contexts/push-notification-context.tsx](../contexts/push-notification-context.tsx)

For Pushy.me service issues, contact [support@pushy.me](mailto:support@pushy.me)
