# Push Notification Integration Guide

## Overview
This app uses **Pushy.me** for push notifications. The integration supports notification navigation, badge management, and topic-based subscriptions.

## Setup Status
✅ Push notification provider is already integrated in `app/_layout.tsx`
✅ Automatic initialization enabled
✅ Navigation handling configured

## Notification Message Format

Based on the example in `examples/NotificationMessage.json`, here's the supported notification structure:

```json
{
  "to": "PUSHY_DEVICE_TOKEN_HERE",
  "title": "SunStore မှာ Order အသစ်ရှိပါတယ်",
  "body": "သင်မှာထားတဲ့ ပစ္စည်းလေး လမ်းကြောင်းပေါ်ရောက်နေပါပြီ။",
  "data": { 
    "screen": "OrderDetails",
    "orderId": "12345"
  },
  "sound": "default",
  "priority": "high",
  "badge": 1
}
```

## Supported Notification Data Fields

### Required Fields
- `title` - Notification title (will appear in notification header)
- `body` or `message` - Notification message content

### Optional Fields
- `screen` - Target screen to navigate when notification is clicked
- `orderId` - Order ID for order-related notifications
- `productId` - Product ID for product-related notifications
- `badge` - Badge count to display on app icon (iOS)
- `sound` - Notification sound (default: "default")
- `priority` - Notification priority ("high" or "normal")

## Supported Screen Navigation

When a notification is clicked, the app will automatically navigate to the appropriate screen:

### Order Screens
```json
{
  "screen": "OrderDetails",
  "orderId": "12345"
}
```
or
```json
{
  "screen": "OrderDetail",
  "orderId": "12345"
}
```

### Product Screens
```json
{
  "screen": "ProductDetail",
  "productId": "prod_123"
}
```

### Tab Screens
```json
{ "screen": "Cart" }
{ "screen": "Profile" }
{ "screen": "Category" }
{ "screen": "OrderList" }
```

## Sending Push Notifications

### Using Pushy API

```bash
curl -X POST https://api.pushy.me/push?api_key=YOUR_SECRET_API_KEY \
  -H "Content-Type: application/json" \
  -d '{
    "to": "DEVICE_TOKEN",
    "data": {
      "title": "SunStore မှာ Order အသစ်ရှိပါတယ်",
      "body": "သင်မှာထားတဲ့ ပစ္စည်းလေး လမ်းကြောင်းပေါ်ရောက်နေပါပြီ။",
      "screen": "OrderDetail",
      "orderId": "12345",
      "badge": 1
    },
    "notification": {
      "title": "SunStore မှာ Order အသစ်ရှိပါတယ်",
      "body": "သင်မှာထားတဲ့ ပစ္စည်းလေး လမ်းကြောင်းပေါ်ရောက်နေပါပြီ။",
      "badge": 1,
      "sound": "default"
    }
  }'
```

### Using Node.js

```javascript
const axios = require('axios');

async function sendPushNotification(deviceToken, title, body, data = {}) {
  try {
    const response = await axios.post(
      'https://api.pushy.me/push?api_key=YOUR_SECRET_API_KEY',
      {
        to: deviceToken,
        data: {
          title,
          body,
          ...data
        },
        notification: {
          title,
          body,
          badge: data.badge || 1,
          sound: 'default'
        }
      }
    );
    
    console.log('Notification sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
}

// Example: Send order notification
sendPushNotification(
  'DEVICE_TOKEN',
  'SunStore မှာ Order အသစ်ရှိပါတယ်',
  'သင်မှာထားတဲ့ ပစ္စည်းလေး လမ်းကြောင်းပေါ်ရောက်နေပါပြီ။',
  {
    screen: 'OrderDetail',
    orderId: '12345',
    badge: 1
  }
);
```

## Using in Components

### Get Device Token

```tsx
import { usePushNotifications } from '@/contexts/push-notification-context';

function ProfileScreen() {
  const { deviceToken, isRegistered } = usePushNotifications();

  return (
    <View>
      {isRegistered && (
        <Text>Device Token: {deviceToken}</Text>
      )}
    </View>
  );
}
```

### Subscribe to Topics

```tsx
import { usePushNotifications } from '@/contexts/push-notification-context';

function SettingsScreen() {
  const { subscribe, unsubscribe } = usePushNotifications();

  const handleSubscribeToOrders = async () => {
    try {
      await subscribe('orders');
      console.log('Subscribed to order notifications');
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  };

  return (
    <Button onPress={handleSubscribeToOrders} title="စျေးဝယ် အကြောင်းကြားချက်များ လက်ခံမည်" />
  );
}
```

### Listen to Notifications

```tsx
import { usePushNotifications } from '@/contexts/push-notification-context';
import { useEffect } from 'react';

function MainScreen() {
  const { lastNotification } = usePushNotifications();

  useEffect(() => {
    if (lastNotification) {
      console.log('New notification:', lastNotification);
      
      // Show in-app notification or update UI
      if (lastNotification.title && lastNotification.body) {
        Alert.alert(
          lastNotification.title,
          lastNotification.body || lastNotification.message
        );
      }
    }
  }, [lastNotification]);

  return <View>...</View>;
}
```

### Manual Navigation Handling

```tsx
import { usePushNotifications } from '@/contexts/push-notification-context';

function CustomNotificationHandler() {
  const { lastNotification, handleNotificationNavigation } = usePushNotifications();

  const handleCustomNavigation = () => {
    if (lastNotification) {
      // Use built-in navigation handler
      handleNotificationNavigation(lastNotification);
    }
  };

  return (
    <Button onPress={handleCustomNavigation} title="Go to Notification" />
  );
}
```

## Testing Push Notifications

### 1. Get Device Token
Run the app and check the console logs for the device token:
```
Pushy device token: xxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Send Test Notification
Use the Pushy Dashboard or API to send a test notification:

```bash
# Test Order Notification
curl -X POST https://api.pushy.me/push?api_key=YOUR_SECRET_API_KEY \
  -H "Content-Type: application/json" \
  -d '{
    "to": "YOUR_DEVICE_TOKEN",
    "data": {
      "title": "စမ်းသပ် အကြောင်းကြားချက်",
      "body": "Push notification စမ်းသပ်နေပါသည်",
      "screen": "OrderDetail",
      "orderId": "test123"
    }
  }'
```

### 3. Verify Navigation
Click on the notification and verify that the app navigates to the correct screen.

## Common Notification Scenarios

### New Order Notification
```json
{
  "title": "အော်ဒါအသစ် ရောက်ရှိပါပြီ",
  "body": "Order #12345 ကို လက်ခဲ့ပြီးပါပြီ",
  "screen": "OrderDetail",
  "orderId": "12345",
  "badge": 1
}
```

### Order Status Update
```json
{
  "title": "Order Status Update",
  "body": "သင့်အော်ဒါကို ပို့ဆောင်ပြီးပါပြီ",
  "screen": "OrderDetail",
  "orderId": "12345"
}
```

### Product Promotion
```json
{
  "title": "အထူးလျှော့ဈေး",
  "body": "ဒီပစ္စည်းကို 50% လျှော့ဈေးပေးနေပါပြီ",
  "screen": "ProductDetail",
  "productId": "prod_123"
}
```

### Cart Reminder
```json
{
  "title": "Cart Reminder",
  "body": "သင့် cart ထဲမှာ ပစ္စည်းတွေ ရှိနေပါသေးတယ်",
  "screen": "Cart"
}
```

## Badge Management

### Update Badge Count
```tsx
const { updateBadge } = usePushNotifications();

// Set badge to 5
updateBadge(5);
```

### Clear Badge
```tsx
const { clearBadgeCount } = usePushNotifications();

// Clear badge
clearBadgeCount();
```

### Auto Badge Update
Badges are automatically updated when a notification with a `badge` field is received.

## Error Handling

```tsx
const { error, isInitializing } = usePushNotifications();

if (error) {
  console.error('Push notification error:', error);
}

if (isInitializing) {
  console.log('Initializing push notifications...');
}
```

## Important Notes

1. **Pushy API Key**: The API key is configured in `app/_layout.tsx`
2. **Device Token**: Stored in AsyncStorage for persistence
3. **Navigation**: Automatic navigation is handled in the context provider
4. **Platform Support**: iOS and Android only (not supported on web or Expo Go)
5. **Development Build Required**: Pushy requires a development build or EAS build

## Environment Variables

Consider moving the API key to environment variables:

```env
EXPO_PUBLIC_PUSHY_API_KEY=your_api_key_here
```

Then use it:
```tsx
await initialize(process.env.EXPO_PUBLIC_PUSHY_API_KEY);
```

## API Reference

See [PUSH_NOTIFICATIONS.md](./PUSH_NOTIFICATIONS.md) for complete API documentation.
