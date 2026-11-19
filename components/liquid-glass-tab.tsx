import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, View } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';

function useReducedTransparency() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let active = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then(value => { if (active) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

export function LiquidGlassBackground({ dark }: { dark: boolean }) {
  const reduced = useReducedTransparency();
  const nativeGlass = Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  return (
    <View pointerEvents="none" aria-hidden style={[styles.glass, {
      borderColor: dark ? '#e0f5ff45' : '#ffffffcc',
      backgroundColor: reduced ? (dark ? '#182733' : '#edf5fa') : 'transparent',
    }]}>
      {!reduced && (nativeGlass ? (
        <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" colorScheme={dark ? 'dark' : 'light'} />
      ) : (
        <BlurView style={StyleSheet.absoluteFill} intensity={65} tint={dark ? 'dark' : 'light'}
          experimentalBlurMethod="dimezisBlurView" blurReductionFactor={4} />
      ))}
      <LinearGradient
        colors={dark ? ['#263d4c66', '#15232c99', '#14232d88'] : ['#ffffffb8', '#f0f8fca6', '#dfedf5b8']}
        locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      {/* Full-height fade avoids a seam through the middle of the bar. */}
      <LinearGradient colors={['#ffffff26', '#ffffff06', '#ffffff00']}
        locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

export function GlassTabButton({ dark, children, style, ...props }: BottomTabBarButtonProps & { dark: boolean }) {
  const selected = props['aria-selected'] === true;
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(selected ? 1 : 0)).current;
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: selected ? 1 : 0, duration: reduced ? 0 : 220, useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity, reduced, selected]);
  return (
    <HapticTab {...props} android_ripple={{ color: '#4fb0d222', borderless: false }}
      onFocus={event => { setFocused(true); props.onFocus?.(event); }}
      onBlur={event => { setFocused(false); props.onBlur?.(event); }}
      onHoverIn={event => { setHovered(true); props.onHoverIn?.(event); }}
      onHoverOut={event => { setHovered(false); props.onHoverOut?.(event); }}
      style={[style, styles.button, {
        borderColor: focused ? (dark ? '#a3eaff' : '#076887') : 'transparent',
        backgroundColor: hovered ? (dark ? '#ffffff0d' : '#ffffff33') : 'transparent',
      }]}>
      <Animated.View pointerEvents="none" aria-hidden style={[styles.selection, {
        opacity, backgroundColor: dark ? '#21495d' : '#dceef5',
        borderColor: dark ? '#8bdcfb45' : '#82c7df70',
      }]} />
      {children}
    </HapticTab>
  );
}

const styles = StyleSheet.create({
  glass: { ...StyleSheet.absoluteFillObject, borderRadius: 26, borderWidth: 1, overflow: 'hidden' },
  button: { borderRadius: 20, borderWidth: 2, paddingHorizontal: 2, paddingVertical: 2, justifyContent: 'center', overflow: 'hidden' },
  selection: { ...StyleSheet.absoluteFillObject, borderRadius: 18, borderWidth: 1 },
});
