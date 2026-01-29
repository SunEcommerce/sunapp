import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack, usePathname, useRouter } from 'expo-router';
import { useContext, useEffect, useRef } from 'react';
import { Linking, LogBox, Platform } from 'react-native';
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

SplashScreen.preventAutoHideAsync();

const INTERSTITIAL_LAST_SHOWN_KEY = 'interstitialLastShown';

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
  const router = useRouter();
  const pathname = usePathname();
  const didNavigate = useRef(false);

  const { initialize, deviceToken, isInitializing, error } = usePushNotifications();

  useEffect(() => {
    // Initialize with your Pushy API key
    const initPushNotifications = async () => {
      try {
        await initialize('f623a9888636195ff0a9186b33b237541f37295d28b8bec76c2e5910a1d1734a');
        console.log('Push notifications initialized');
      } catch (err) {
        console.error('Failed to initialize push notifications:', err);
      }
    };

    initPushNotifications();
  }, []);

  useEffect(() => {
    const checkInterstitial = async () => {
      const initialUrl = await Linking.getInitialURL();
      await AsyncStorage.setItem('REQUESTED_PAGE', JSON.stringify(initialUrl));
      try {
        const lastShown = await AsyncStorage.getItem(INTERSTITIAL_LAST_SHOWN_KEY);
        const today = new Date().toDateString();

        if (lastShown !== today) {
          await AsyncStorage.setItem(INTERSTITIAL_LAST_SHOWN_KEY, today);
          router.replace('/interstitial');
        } else {
          if (didNavigate.current) return;
          didNavigate.current = true;
          let target = '/(tabs)';
          if (initialUrl) {
            try {
              const urlObj = new URL(initialUrl);
              let p = urlObj.pathname || '';
              if (p.startsWith('/--')) p = p.replace('/--', '');
              target = p || '/(tabs)';
              if (urlObj.search) target += urlObj.search;
            } catch {
              target = initialUrl;
            }
          }
          if (target !== pathname) {
            router.replace(target as any);
          } else if (pathname !== '/(tabs)') {
            router.replace('/(tabs)');
          }
        }
      } catch (e) {
        // If there's an error, try to navigate to requested page, else main screen
        try {
          if (!didNavigate.current) {
            didNavigate.current = true;
            const initialUrl = await Linking.getInitialURL();
            let target = '/(tabs)';
            if (initialUrl) {
              try {
                const urlObj = new URL(initialUrl);
                let p = urlObj.pathname || '';
                if (p.startsWith('/--')) p = p.replace('/--', '');
                target = p || '/(tabs)';
                if (urlObj.search) target += urlObj.search;
              } catch {
                target = initialUrl;
              }
            }
            if (target !== pathname) {
              router.replace(target as any);
            } else if (pathname !== '/(tabs)') {
              router.replace('/(tabs)');
            }
          }
        } catch (_) {
          if (pathname !== '/(tabs)') {
            router.replace('/(tabs)');
          }
        }
      } finally {
        // Hide the splash screen after navigation
        SplashScreen.hideAsync();
      }
    };

    checkInterstitial();
  }, [router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="interstitial" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="screens/settings" options={{ headerTitle: "App Settings" }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
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
