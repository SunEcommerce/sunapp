# Push Notification Background Fix

## ပြဿနာ
- App သုံးနေတဲ့အခါပဲ notification ရတယ်
- App kill လုပ်လိုက်တဲ့အခါ notification မရတော့ဘူး
- Error: "No task registered for key PushyPushReceiver"

## ဘာကြောင့် ဖြစ်တာလဲ
Pushy က background notification အတွက် headless task register လုပ်ရမယ်။ Expo Router ရဲ့ default entry point က headless task support မလုပ်ဘူး။

## Fix လုပ်ထားတာတွေ

### 1. ✅ index.js ဖန်တီးပြီး headless task register လုပ်ထားပြီး
- `AppRegistry.registerHeadlessTask('PushyPushReceiver')` register လုပ်ထားပြီး
- App killed/background မှာရှိစဉ် notification လာရင် display လုပ်မယ်
- Notification data parsing ပါဝင်ပြီး

### 2. ✅ package.json entry point ပြောင်းထားပြီး
- `"main": "index.js"` ကို update လုပ်ထားပြီး
- Headless task ကို load လုပ်နိုင်ဖို့

### 3. ✅ app.json မှာ Android permissions ထည့်ထားပြီး
- `RECEIVE_BOOT_COMPLETED` - Device boot ပြီးရင် notification service restart
- `WAKE_LOCK` - Screen off ဖြစ်ထားလဲ notification ရမယ်
- `POST_NOTIFICATIONS` - Android 13+ အတွက် notification permission
- `useNextNotificationsApi: true` - Latest notification API သုံးမယ်

## 🔨 လုပ်ရမယ့်အဆင့်တွေ

### 1. Clean Rebuild လုပ်ပါ
```bash
# Clean previous build
npx expo prebuild --clean

# Rebuild for Android
npx expo run:android
```

### 2. Test လုပ်ပါ
**Scenario 1: App ဖွင့်ထားစဉ် (Foreground)**
- ✅ Notification ရမယ်
- ✅ Click လုပ်ရင် navigation သွားမယ်

**Scenario 2: App recent တွေမှာရှိစဉ် (Background)**
- ✅ Notification ရမယ်
- ✅ Click လုပ်ရင် app ဖွင့်ပြီး navigation သွားမယ်

**Scenario 3: App kill လုပ်ထားတဲ့အခါ (Killed)**
- ✅ Notification ရမယ်
- ✅ Click လုပ်ရင် app ဖွင့်ပြီး navigation သွားမယ်

## ⚠️ အရေးကြီးတဲ့ အချက်တွေ

1. **Development build သုံးရမယ်**
   - Expo Go မှာ background task အလုပ်မလုပ်ဘူး
   - `npx expo run:android` နဲ့ build လုပ်ရမယ်

2. **Battery optimization ပိတ်ပါ**
   - Android Settings → Apps → SunStore → Battery → Unrestricted
   - ဒါမှသာ background မှာ notification ကောင်းကောင်းရမယ်

3. **Permissions စစ်ပါ**
   - Settings → Apps → SunStore → Permissions → Notifications → Allow

## 🧪 Testing Commands

### Notification ပို့ဖို့
```bash
curl -X POST https://api.pushy.me/push?api_key=YOUR_SECRET_API_KEY \
  -H "Content-Type: application/json" \
  -d '{
  "title": "SunStore မှာ Order အသစ်ရှိပါတယ်",
  "body": "သင်မှာထားတဲ့ ပစ္စည်းလေး လမ်းကြောင်းပေါ်ရောက်နေပါပြီ။",
  "data": {
    "screen": "OrderDetails",
    "orderId": "12345"
  },
  "sound": "default",
  "priority": "high",
  "badge": 1,
  "android": {
    "priority": "high"
  },
  "content_available": true
}'
```

### Test Steps:
1. App ကို build လုပ်ပြီး install လုပ်ပါ
2. Device token ကို copy လုပ်ပါ
3. App ကို kill လုပ်ပါ (Recent apps ကနေ swipe away)
4. Notification ပို့ပါ
5. Notification ရမယ်လား ကြည့်ပါ

## 🔍 Troubleshooting

### Notification မရဘူးဆိုရင်:
```bash
# Check logs
npx react-native log-android

# Look for:
# - "Headless task received:"
# - "Background notification displayed"
# - Any error messages
```

### Common Issues:

**1. "PushyPushReceiver not registered" still showing**
- Clean rebuild လုပ်ထားပြီးပြီလား?
- index.js ကို load လုပ်ထားပြီးပြီလား?
- package.json main entry က "index.js" ပြောင်းထားပြီးပြီလား?

**2. Notification ရပေမယ့် click လုပ်ရင် navigation မသွားဘူး**
- Expo notification response listener က register လုပ်ထားပြီးပြီလား?
- App ကို foreground က initialize လုပ်ထားပြီးပြီလား?

**3. Battery optimization ကြောင့် notification မရဘူး**
- Settings → Battery → Unrestricted ထားပါ
- Background data allowed ဖြစ်ပါစေ

## 📝 Technical Details

### How it works:

1. **Foreground (App running)**
   - `pushNotifications.ts` ထဲက `Pushy.setNotificationListener` က handle လုပ်တယ်
   - Local notification display လုပ်တယ်
   - Navigation ready ဖြစ်တယ်

2. **Background (App in recent apps)**
   - `pushNotifications.ts` listener က အလုပ်လုပ်သေးတယ်
   - Local notification display လုပ်တယ်
   - Click လုပ်ရင် `Notifications.addNotificationResponseReceivedListener` က catch လုပ်တယ်

3. **Killed (App not running)**
   - `index.js` ထဲက `AppRegistry.registerHeadlessTask` က handle လုပ်တယ်
   - Android Native Service က headless task ကို run တယ်
   - Notification display လုပ်တယ်
   - Click လုပ်ရင် app launch ဖြစ်ပြီး expo notification listener က catch လုပ်တယ်

## ✨ Expected Behavior After Fix

| App State | Notification Display | Navigation |
|-----------|---------------------|------------|
| Foreground (Active) | ✅ Yes | ✅ Yes |
| Background (Recent) | ✅ Yes | ✅ Yes |
| Killed (Not running) | ✅ Yes | ✅ Yes |
| Device Reboot | ✅ Yes | ✅ Yes |

## 🚀 Next Steps

1. **Rebuild app**: `npx expo prebuild --clean && npx expo run:android`
2. **Test all scenarios**: Foreground, Background, Killed
3. **Check battery settings**: Unrestricted
4. **Test navigation**: Click notification and verify screen navigation

---

**Note**: Production build အတွက် EAS Build သုံးဖို့ recommend လုပ်ပါတယ်:
```bash
eas build --platform android --profile production
```
