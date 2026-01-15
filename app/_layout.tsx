import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack, usePathname, useRouter } from 'expo-router';
import { useContext, useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

const INTERSTITIAL_LAST_SHOWN_KEY = 'interstitialLastShown';

export const unstable_settings = {
  anchor: '(tabs)',
  initialRouteName: '(tabs)',
};

import { CartProvider } from '@/contexts/cart-context';
import { ThemeProvider as CustomThemeProvider, ThemeContext } from '@/contexts/theme-context';

function RootLayoutNav() {
  const { colorScheme } = useContext(ThemeContext)!;
  const router = useRouter();
  const pathname = usePathname();
  const didNavigate = useRef(false);

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
            router.replace(target);
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
              router.replace(target);
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
    <CustomThemeProvider>
      <CartProvider>
        <RootLayoutNav />
      </CartProvider>
    </CustomThemeProvider>
  );
}
