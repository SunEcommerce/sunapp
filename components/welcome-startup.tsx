import { WelcomeScreen } from '@/components/welcome-screen';
import { prepareWelcomeArtwork, WELCOME_IMAGE_TIMEOUT_MS } from '@/utils/welcome-artwork';
import { WELCOME_HIDDEN_DATE_KEY } from '@/utils/welcome-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageRef } from 'expo-image';
import { SplashScreen } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

type Phase = 'checking' | 'loading' | 'visible' | 'done';

export function WelcomeStartup({ children }: { children: ReactNode }) {
  const readyBy = useRef(0);
  const [phase, setPhase] = useState<Phase>('checking');
  const [image, setImage] = useState<ImageRef | null>(null);
  const [laidOut, setLaidOut] = useState(false);
  const finish = useCallback(() => { setPhase('done'); setImage(null); }, []);
  const revealWelcome = useCallback(() => setPhase(previous => previous === 'loading' ? 'visible' : previous), []);

  useEffect(() => {
    let active = true;
    let prepared: ImageRef | null = null;
    const prepare = async () => {
      try {
        const hidden = await AsyncStorage.getItem(WELCOME_HIDDEN_DATE_KEY);
        if (!active) return;
        if (hidden !== new Date().toDateString()) {
          readyBy.current = Date.now() + WELCOME_IMAGE_TIMEOUT_MS;
          prepared = await prepareWelcomeArtwork();
        }
        if (!active) { prepared?.release(); return; }
        if (prepared) { setImage(prepared); setPhase('loading'); }
        else setPhase('done');
      } catch { if (active) setPhase('done'); }
    };
    void prepare();
    return () => { active = false; };
  }, []);

  // Release the decoded bitmap after the splash view has unmounted.
  useEffect(() => () => { image?.release(); }, [image]);

  useEffect(() => {
    if (!laidOut || (phase !== 'visible' && phase !== 'done')) return;
    // The selected layer must be committed before the OS launch screen goes away.
    const frame = requestAnimationFrame(() => { void SplashScreen.hideAsync().catch(() => {}); });
    return () => cancelAnimationFrame(frame);
  }, [phase, laidOut]);

  const covered = phase !== 'done';
  return (
    <View style={styles.root} onLayout={() => setLaidOut(true)}>
      <View style={[styles.routes, covered && styles.hidden]} pointerEvents={covered ? 'none' : 'auto'}
        accessibilityElementsHidden={covered} importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'} aria-hidden={covered}>
        {children}
      </View>
      {covered && <View style={styles.cover}>
        {image && <WelcomeScreen image={image} readyBy={readyBy.current} onReady={revealWelcome} onDismiss={finish} onUnavailable={finish} />}
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030f20' },
  routes: { flex: 1 },
  hidden: { opacity: 0 },
  cover: { ...StyleSheet.absoluteFillObject, backgroundColor: '#030f20' },
});
