import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';

export function HomeHeaderGlass({ dark }: { dark: boolean }) {
  const [reducedTransparency, setReducedTransparency] = useState(Platform.OS === 'ios');
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then(value => {
      if (active) setReducedTransparency(value);
    }).catch(() => { /* Keep the solid surface when the preference cannot be read. */ });
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReducedTransparency);
    return () => { active = false; subscription.remove(); };
  }, []);

  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={[StyleSheet.absoluteFill, { backgroundColor: reducedTransparency ? (dark ? '#1b252c' : '#ffffff') : 'transparent' }]}>
    {!reducedTransparency && <>
      <BlurView style={StyleSheet.absoluteFill} intensity={45} tint={dark ? 'dark' : 'light'} experimentalBlurMethod="dimezisBlurView" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? '#15232c70' : '#ffffff70' }]} />
    </>}
  </View>;
}
