import { ThemeContext } from '@/contexts/theme-context';
import { useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  variant: 'banner' | 'categories' | 'products' | 'brands' | 'sections' | 'grid';
  label: string;
  height?: number;
  cardWidth?: number;
  rows?: number;
};

export function HomeSkeleton({ variant, label, height = 200, cardWidth = 160, rows = 3 }: Props) {
  const { colorScheme } = useContext(ThemeContext)!;
  const opacity = useRef(new Animated.Value(1)).current;
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReducedMotion(value);
    }).catch(() => { /* Keep the static skeleton if the preference is unavailable. */ });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    opacity.setValue(1);
    if (reducedMotion) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.45, duration: 800, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);

  const backgroundColor = colorScheme === 'dark' ? '#343a40' : '#dce2e7';
  const block = (style: StyleProp<ViewStyle>) => <View style={[styles.block, { backgroundColor }, style]} />;
  const categories = variant === 'categories';
  const brands = variant === 'brands';
  const grid = variant === 'grid';

  return (
    <Animated.View accessible accessibilityRole="progressbar" accessibilityLabel={label}
      accessibilityState={{ busy: true }} pointerEvents="none" style={{ opacity, overflow: 'hidden' }}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {variant === 'banner' ? block({ width: '100%', height }) : (
          <View style={variant === 'sections' ? styles.section : undefined}>
            {variant === 'sections' && block(styles.heading)}
            <View style={[styles.row, categories && styles.categoryRow, grid && styles.grid]}>
              {Array.from({ length: grid ? rows * 2 : categories ? 5 : 3 }, (_, index) => (
                <View key={index} style={grid ? [styles.product, { width: cardWidth }] : categories ? styles.category : brands ? styles.brand : styles.product}>
                  {block(grid ? { width: cardWidth, height: cardWidth, borderRadius: 12 } : categories ? styles.circle : brands ? styles.brandImage : styles.productImage)}
                  {grid ? <View style={{ padding: 10 }}>
                    {block({ width: '88%', height: 14, marginTop: 2 })}
                    {block({ width: '65%', height: 12, marginTop: 8 })}
                    {block({ width: '45%', height: 14, marginTop: 12 })}
                  </View> : !brands && <>
                    {block({ width: categories ? 64 : 140, height: 12, marginTop: 10 })}
                    {block({ width: categories ? 44 : 90, height: 10, marginTop: 8 })}
                  </>}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: 6 },
  row: { flexDirection: 'row', paddingHorizontal: 16, gap: 16 },
  grid: { flexWrap: 'wrap', paddingHorizontal: 0, gap: 12 },
  categoryRow: { paddingHorizontal: 10, gap: 8, minHeight: 120 },
  category: { width: 80, alignItems: 'center' },
  circle: { width: 64, height: 64, borderRadius: 32 },
  product: { width: 160, paddingBottom: 8 },
  productImage: { width: 160, height: 160, borderRadius: 12 },
  brand: { width: 110 },
  brandImage: { width: 110, height: 110, borderRadius: 12 },
  section: { marginTop: 24 },
  heading: { width: 170, height: 22, marginHorizontal: 16, marginBottom: 12 },
});
