import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

type Props = { seconds: number; deadline: number; onPress: () => void };

/** Visual timer only; screen dismissal uses the same absolute deadline. */
export function WelcomeSkipButton({ seconds, deadline, onPress }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reducedMotion, setReducedMotion] = useState(true);
  const [size, setSize] = useState({ width: 100, height: 48 });
  const radius = (size.height - 3) / 2;
  const perimeter = 2 * (size.width + size.height - 6 - 4 * radius) + 2 * Math.PI * radius;

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReducedMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const remaining = Math.max(0, deadline - Date.now());
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: remaining, easing: Easing.linear, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [deadline, progress, reducedMotion]);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Skip welcome screen"
      accessibilityHint={`Closes automatically in ${seconds} seconds`} onPress={onPress}
      onLayout={({ nativeEvent: { layout } }) => setSize(previous =>
        previous.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height })}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFillObject}
        pointerEvents="none" accessible={false} aria-hidden>
        <Rect x={1.5} y={1.5} width={size.width - 3} height={size.height - 3} rx={radius}
          fill="none" stroke={reducedMotion ? '#83e4ed' : '#697a88'} strokeWidth={1.5} />
        {!reducedMotion && <AnimatedRect x={1.5} y={1.5} width={size.width - 3} height={size.height - 3} rx={radius}
          fill="none" stroke="#83e4ed" strokeWidth={2} strokeLinecap="round"
          strokeDasharray={[perimeter, perimeter]}
          strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [0, perimeter] })} />}
      </Svg>
      <Text style={styles.label}>Skip <Text style={styles.count}>{seconds}</Text></Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 100, minHeight: 48, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(3, 15, 32, 0.82)' },
  label: { color: '#ffffff', fontSize: 14, lineHeight: 22, fontWeight: '600' },
  count: { color: '#83e4ed', fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.75 },
});
