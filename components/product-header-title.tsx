import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';

export function ProductHeaderTitle({ name, color, reducedMotion }: { name: string; color: string; reducedMotion: boolean }) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateX.setValue(0);
    const distance = Math.max(0, textWidth - viewportWidth);
    if (reducedMotion || viewportWidth === 0 || distance <= 1) return;
    const duration = Math.max(2500, distance * 35);
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(1400),
      Animated.timing(translateX, { toValue: -distance, duration, easing: Easing.linear, useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(translateX, { toValue: 0, duration, easing: Easing.linear, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [name, viewportWidth, textWidth, reducedMotion, translateX]);

  return <View style={styles.viewport} onLayout={event => setViewportWidth(event.nativeEvent.layout.width)}>
    <ScrollView horizontal scrollEnabled={reducedMotion} showsHorizontalScrollIndicator={false}
      accessible accessibilityLabel={name} contentContainerStyle={styles.track}>
      <Animated.Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        onLayout={event => setTextWidth(event.nativeEvent.layout.width)} numberOfLines={1}
        style={[styles.title, { color, transform: [{ translateX }] }]}>{name}</Animated.Text>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  viewport: { flex: 1, marginHorizontal: 8, overflow: 'hidden' },
  track: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
});
