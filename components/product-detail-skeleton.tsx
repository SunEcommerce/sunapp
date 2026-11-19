import { ThemeContext } from '@/contexts/theme-context';
import { useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export function ProductDetailSkeleton({ variant = 'page', galleryHeight = 300 }: {
  variant?: 'page' | 'details' | 'metadata' | 'purchase';
  galleryHeight?: number;
}) {
  const dark = useContext(ThemeContext)?.colorScheme === 'dark';
  const opacity = useRef(new Animated.Value(1)).current;
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReducedMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    opacity.setValue(1);
    if (reducedMotion) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.5, duration: 850, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 850, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);
  const block = (style: StyleProp<ViewStyle>) => <View style={[styles.block, { backgroundColor: dark ? '#344650' : '#dce5eb' }, style]} />;
  return <Animated.View accessible accessibilityRole="progressbar" accessibilityLabel={variant === 'purchase' ? 'Preparing purchase options' : 'Loading product details'}
    accessibilityState={{ busy: true }} pointerEvents="none" style={{ opacity }}>
    <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {variant === 'purchase' ? <View style={styles.purchase}>{block({ width: 114, height: 44, borderRadius: 12 })}{block({ flex: 1, height: 44, borderRadius: 12 })}</View>
        : variant === 'metadata' ? <View style={styles.metadata}>{block({ width: '44%', height: 12 })}{block({ width: '30%', height: 12 })}</View>
          : <>
            {variant === 'page' && <>
              <View style={[styles.gallery, { height: galleryHeight, backgroundColor: dark ? '#1b252c' : '#eef3f6' }]}>{block({ width: '40%', height: '72%', borderRadius: 18 })}</View>
              <View style={styles.info}>{block({ width: '50%', height: 12 })}{block({ width: '36%', height: 23, marginTop: 8 })}</View>
            </>}
            <View style={[styles.details, { backgroundColor: dark ? '#1b252c' : '#ffffff', borderColor: dark ? '#30414c' : '#e2e8ed' }]}>
              {block({ width: '35%', height: 15 })}
              <View style={styles.options}>{[1, 2, 3].map(key => <View key={key} style={{ flex: 1 }}>{block({ height: 40, borderRadius: 10 })}</View>)}</View>
              {block({ width: '46%', height: 16, marginTop: 22 })}
              {block({ width: '100%', height: 12, marginTop: 14 })}
              {block({ width: '86%', height: 12, marginTop: 8 })}
              {block({ width: '62%', height: 12, marginTop: 8 })}
            </View>
          </>}
    </View>
  </Animated.View>;
}

const styles = StyleSheet.create({
  block: { borderRadius: 5 },
  gallery: { marginTop: 44, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, alignItems: 'center', justifyContent: 'center' },
  info: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 2 },
  details: { marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 18, borderWidth: 1 },
  options: { flexDirection: 'row', gap: 8, marginTop: 14 },
  metadata: { flexDirection: 'row', gap: 12, paddingVertical: 6 },
  purchase: { flexDirection: 'row', gap: 10 },
});
