import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SplashScreen, Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const INTERSTITIAL_LAST_SHOWN_KEY = 'interstitialLastShown';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  anchor: '(tabs)',
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    const checkInterstitial = async () => {
      try {
        const lastShown = await AsyncStorage.getItem(INTERSTITIAL_LAST_SHOWN_KEY);
        const today = new Date().toDateString();

        if (lastShown !== today) {
          await AsyncStorage.setItem(INTERSTITIAL_LAST_SHOWN_KEY, today);
          router.replace('/interstitial');
        } else {
          router.replace('/(tabs)');
        }
      } catch (e) {
        // If there's an error, just go to the main screen
        router.replace('/(tabs)');
      } finally {
        // Hide the splash screen after navigation
        SplashScreen.hideAsync();
      }
    };

    checkInterstitial();
  }, [router]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="interstitial" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="screens/settings"  options={{ headerTitle: "App Settings", headerShown: true,}} />
      </Stack>
    </ThemeProvider>
  );
}
