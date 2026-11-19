import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack } from 'expo-router';
import { useContext, useEffect } from 'react';
import { LogBox, Platform, View } from 'react-native';
import 'react-native-reanimated';

// Suppress known deprecation warnings from React Native internals
if (__DEV__) {
  LogBox.ignoreLogs([
    'props.pointerEvents is deprecated',
    'Image: style.resizeMode is deprecated',
  ]);
}

// Configure passive event listeners for web to improve scroll performance
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const supportsPassive = (() => {
    let support = false;
    try {
      const opts = Object.defineProperty({}, 'passive', {
        get() {
          support = true;
          return true;
        },
      });
      window.addEventListener('test', null as any, opts);
      window.removeEventListener('test', null as any, opts);
    } catch (e) {}
    return support;
  })();

  if (supportsPassive) {
    const addEventListenerOriginal = EventTarget.prototype.addEventListener;
    const passiveEvents = ['touchstart', 'touchmove', 'wheel', 'mousewheel'];

    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: any,
      options?: any
    ) {
      if (passiveEvents.includes(type) && typeof options !== 'object') {
        return addEventListenerOriginal.call(this, type, listener, { passive: true });
      }
      return addEventListenerOriginal.call(this, type, listener, options);
    };
  }
}

void SplashScreen.preventAutoHideAsync().catch(() => {});

import { WelcomeStartup } from '@/components/welcome-startup';

export const unstable_settings = {
  anchor: '(tabs)',
  initialRouteName: '(tabs)',
};

import { CartProvider } from '@/contexts/cart-context';
import { PushNotificationProvider, usePushNotifications } from '@/contexts/push-notification-context';
import { ThemeProvider as CustomThemeProvider, ThemeContext } from '@/contexts/theme-context';
import { persistor, store } from '@/store/store';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

function RootLayoutNav() {
  const { colorScheme } = useContext(ThemeContext)!;

  const { initialize } = usePushNotifications();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    // Initialize with your Pushy API key
    const initPushNotifications = async () => {
      try {
        const apiKey = process.env.EXPO_PUBLIC_PUSHY_API_KEY;
        if (!apiKey) {
          console.warn('EXPO_PUBLIC_PUSHY_API_KEY not found in environment variables');
          return;
        }
        await initialize(apiKey);
        console.log('Push notifications initialized');
      } catch (err) {
        console.error('Failed to initialize push notifications:', err);
      }
    };

    initPushNotifications();
  }, []);


  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <WelcomeStartup>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="interstitial" options={{ animation: 'none', gestureEnabled: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="screens/settings" options={{ headerTitle: "App Settings" }} />
      </Stack>
      </WelcomeStartup>
    </ThemeProvider>
  );
}

function StartupBackground() {
  return <View style={{ flex: 1, backgroundColor: '#030f20' }} />;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={<StartupBackground />} persistor={persistor}>
        <CustomThemeProvider>
          <PushNotificationProvider autoInitialize={true}>
            <CartProvider>
              <RootLayoutNav />
            </CartProvider>
          </PushNotificationProvider>
        </CustomThemeProvider>
      </PersistGate>
    </Provider>
  );
}
