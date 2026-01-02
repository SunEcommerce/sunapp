import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';

function InlineCartIllustration() {
  return (
    <View style={styles.illustrationContainer} accessible accessibilityRole="image" accessibilityLabel="Empty cart illustration">
      <View style={styles.cartOutline}>
        <View style={styles.cartGrid} />
      </View>

      <View style={[styles.wheel, styles.wheelLeft]} />
      <View style={[styles.wheel, styles.wheelRight]} />

      <View style={styles.plusBadge}>
        <ThemedText style={styles.plusText}>+</ThemedText>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();

  return (
    <ThemedView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <InlineCartIllustration />

        <ThemedText type="title" style={styles.heading}>
          Ohhh... Your cart is empty
        </ThemedText>

        <ThemedText type="default" style={styles.subtitle}>
          but it doesn't have to be.
        </ThemedText>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => router.push('/(tabs)/index')}
          accessibilityRole="button"
          accessibilityLabel="Shop now">
          <ThemedText style={styles.ctaText}>SHOP NOW</ThemedText>
        </Pressable>
      </ThemedView>
    </ThemedView>
  );
}

const ILLUSTRATION_SIZE = 220;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 0,
    paddingHorizontal: 24,
    gap: 18,
  },
  illustrationContainer: {
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartOutline: {
    width: '82%',
    height: '52%',
    borderWidth: 3,
    borderColor: '#9aa6b2',
    borderRadius: 6,
    transform: [{ translateY: -10 }, { rotate: '-6deg' }],
    backgroundColor: 'rgba(240,243,248,0.8)',
    overflow: 'hidden',
  },
  cartGrid: {
    flex: 1,
    backgroundColor: 'transparent',
    borderLeftWidth: 0,
  },
  wheel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e9aeb0',
    position: 'absolute',
    bottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  wheelLeft: {
    left: '22%',
  },
  wheelRight: {
    right: '22%',
  },
  plusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#bfe1ff',
    position: 'absolute',
    top: 6,
    right: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  plusText: {
    fontSize: 22,
    lineHeight: 22,
    color: '#ffffff',
    fontWeight: '700',
  },
  heading: {
    textAlign: 'center',
    maxWidth: 300,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  cta: {
    marginTop: 12,
    backgroundColor: '#67A8FF',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 28,
    shadowColor: '#67A8FF',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
  },
});
