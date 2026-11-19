import { WelcomeSkipButton } from '@/components/welcome-skip-button';
import { WELCOME_DURATION_MS, WELCOME_HIDDEN_DATE_KEY } from '@/utils/welcome-screen';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image as CachedImage, type ImageRef } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = { image: ImageRef; readyBy: number; onReady: () => void; onDismiss: () => void; onUnavailable: () => void };

export function WelcomeScreen({ image, readyBy, onReady, onDismiss, onUnavailable }: Props) {
  const displayed = useRef(false);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [dontShowToday, setDontShowToday] = useState(false);
  const preference = useRef(false);
  const closing = useRef(false);
  const [seconds, setSeconds] = useState(WELCOME_DURATION_MS / 1000);

  const dismiss = useCallback(async () => {
    if (closing.current) return;
    closing.current = true;
    try {
      // The default is always unchecked. Only explicit opt-out suppresses today.
      if (preference.current) {
        await AsyncStorage.setItem(WELCOME_HIDDEN_DATE_KEY, new Date().toDateString());
      }
    } catch (error) {
      console.warn('Could not save welcome preference:', error);
    } finally {
      onDismiss();
    }
  }, [onDismiss]);

  useEffect(() => {
    if (deadline !== null) return;
    const timeout = setTimeout(onUnavailable, Math.max(0, readyBy - Date.now()));
    return () => clearTimeout(timeout);
  }, [deadline, onUnavailable, readyBy]);

  useEffect(() => {
    if (deadline === null) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) void dismiss();
    }, 200);
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      void dismiss();
      return true;
    });
    return () => { clearInterval(timer); back.remove(); };
  }, [dismiss, deadline]);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <CachedImage source={image} contentFit="cover" transition={0} style={styles.backgroundImage}
        onDisplay={() => {
          if (displayed.current) return;
          displayed.current = true;
          if (Date.now() >= readyBy) { onUnavailable(); return; }
          setDeadline(Date.now() + WELCOME_DURATION_MS);
          onReady();
        }} onError={onUnavailable}
        accessibilityLabel="Phone, earbuds and smartwatch on illuminated glass displays" />
      {deadline !== null && <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.header} pointerEvents="box-none">
          <Image source={require('@/assets/images/sun-logo.png')} resizeMode="contain" style={styles.logo} accessibilityLabel="Sun logo" />
        </View>
        <View style={styles.footer} pointerEvents="box-none">
          <Pressable accessibilityRole="checkbox" accessibilityLabel="Don't show today"
            accessibilityState={{ checked: dontShowToday }}
            onPress={() => {
              preference.current = !preference.current;
              setDontShowToday(preference.current);
            }} style={({ pressed }) => [styles.preference, pressed && styles.pressed]}>
            <View style={[styles.checkbox, dontShowToday && styles.checkboxChecked]}>
              {dontShowToday && <Ionicons name="checkmark" size={15} color="#071522" />}
            </View>
            <Text style={styles.preferenceText}>{"Don't show today"}</Text>
          </Pressable>
          <WelcomeSkipButton seconds={seconds} deadline={deadline} onPress={() => void dismiss()} />
        </View>
      </SafeAreaView>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#030f20', overflow: 'hidden' },
  backgroundImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  header: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 12 },
  logo: { width: 66, height: 44, borderRadius: 10, backgroundColor: '#1c639c' },
  footer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
  preference: { minHeight: 48, flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 24, backgroundColor: 'rgba(3, 15, 32, 0.82)' },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#dce8ef', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#83e4ed', borderColor: '#83e4ed' },
  preferenceText: { flexShrink: 1, fontSize: 12, lineHeight: 18, color: '#ffffff', fontWeight: '500' },
  pressed: { opacity: 0.75 },
});
