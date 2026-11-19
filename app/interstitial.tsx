import { safeWelcomeTarget } from '@/utils/welcome-screen';
import { Redirect, useLocalSearchParams } from 'expo-router';

// Compatibility for old links. Startup presentation is owned by WelcomeStartup.
export default function InterstitialScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string | string[] }>();
  return <Redirect href={safeWelcomeTarget(returnTo) as any} />;
}
