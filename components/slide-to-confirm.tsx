import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

const THUMB_SIZE = 48;
const TRACK_PADDING = 4;

type Props = {
  disabled?: boolean;
  onConfirm: () => void;
  accent: string;
  onAccent: string;
  trackColor: string;
  textColor: string;
};

export function SlideToConfirm({ disabled = false, onConfirm, accent, onAccent, trackColor, textColor }: Props) {
  const [width, setWidth] = React.useState(0);
  const position = React.useRef(new Animated.Value(0)).current;
  const locked = React.useRef(false);
  const maxDistance = Math.max(0, width - THUMB_SIZE - TRACK_PADDING * 2);
  const reset = React.useCallback(() => {
    Animated.spring(position, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
  }, [position]);
  const confirm = React.useCallback(() => {
    if (disabled || locked.current) return;
    locked.current = true;
    onConfirm();
  }, [disabled, onConfirm]);

  React.useEffect(() => {
    if (!disabled) { locked.current = false; position.setValue(0); }
  }, [disabled, position]);

  const panResponder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled && !locked.current,
    onMoveShouldSetPanResponder: () => !disabled && !locked.current,
    onPanResponderMove: (_, gesture) => position.setValue(Math.max(0, Math.min(maxDistance, gesture.dx))),
    onPanResponderRelease: (_, gesture) => {
      if (maxDistance > 0 && gesture.dx >= maxDistance * 0.85) {
        Animated.timing(position, { toValue: maxDistance, duration: 140, useNativeDriver: true }).start(({ finished }) => {
          if (finished) confirm();
          else reset();
        });
      } else reset();
    },
    onPanResponderTerminate: reset,
  }), [confirm, disabled, maxDistance, position, reset]);

  return <View style={[styles.track, { backgroundColor: trackColor }]} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <ThemedText style={[styles.label, { color: textColor }]} pointerEvents="none">Slide to confirm</ThemedText>
    <Ionicons name="chevron-forward" size={18} color={textColor} style={styles.arrow} />
    <Animated.View
      {...panResponder.panHandlers}
      accessibilityRole="button"
      accessibilityLabel="Slide to confirm order"
      accessibilityHint="Drag right to place the order"
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'activate', label: 'Confirm order' }]}
      onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'activate') confirm(); }}
      style={[styles.thumb, { backgroundColor: accent, transform: [{ translateX: position }] }]}
    >
      <Ionicons name="chevron-forward" size={25} color={onAccent} />
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  track: { height: 56, borderRadius: 15, padding: TRACK_PADDING, justifyContent: 'center', overflow: 'hidden' },
  label: { textAlign: 'center', fontSize: 14, lineHeight: 20, fontWeight: '600' },
  arrow: { position: 'absolute', right: 15, opacity: 0.55 },
  thumb: { position: 'absolute', left: TRACK_PADDING, width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
