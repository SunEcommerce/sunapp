import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useContext } from 'react';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassTabButton, LiquidGlassBackground } from '@/components/liquid-glass-tab';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';

export default function TabLayout() {
  const { colorScheme } = useContext(ThemeContext)!;
  const dark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { fontScale, width } = useWindowDimensions();
  const labelScale = Math.min(Math.max(fontScale, 1), 2);
  // Enlarged labels can wrap to two lines on narrow phones.
  const barHeight = 48 + 16 * labelScale * (labelScale > 1.1 ? 2 : 1);
  const horizontalInset = Math.max(insets.left, insets.right, 12);
  const sideOffset = (width - Math.min(width - horizontalInset * 2, 560)) / 2;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: dark ? '#ecfaff' : '#06465f',
        tabBarInactiveTintColor: dark ? '#e1eaf0' : '#334d60',
        headerShown: false,
        tabBarButton: props => <GlassTabButton {...props} dark={dark} />,
        tabBarBackground: () => <LiquidGlassBackground dark={dark} />,
        tabBarStyle: [styles.bar, {
          height: barHeight,
          bottom: Math.max(insets.bottom, 12),
          left: sideOffset,
          right: sideOffset,
          boxShadow: `0px 7px 16px rgba(22, 60, 86, ${dark ? 0.35 : 0.16})`,
        }],
        tabBarItemStyle: styles.item,
        tabBarIconStyle: styles.icon,
        tabBarLabel: ({ children, color }) => (
          <Text maxFontSizeMultiplier={2} style={[styles.label, { color }]}>{children}</Text>
        ),
        tabBarAllowFontScaling: true,
        tabBarHideOnKeyboard: true,
        tabBarLabelPosition: 'below-icon',
        sceneStyle: { backgroundColor: Colors[colorScheme].background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home',
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={23} color={color} accessible={false} aria-hidden />,
        }}
      />
      <Tabs.Screen
        name="category"
        options={{
          title: 'Category',
          tabBarAccessibilityLabel: 'Category',
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'grid' : 'grid-outline'} size={23} color={color} accessible={false} aria-hidden />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarAccessibilityLabel: 'Cart',
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'cart' : 'cart-outline'} size={23} color={color} accessible={false} aria-hidden />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile',
          tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? 'person' : 'person-outline'} size={23} color={color} accessible={false} aria-hidden />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 6,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderRadius: 26,
    elevation: 8,
  },
  item: { borderRadius: 20, minHeight: 48, marginHorizontal: 2 },
  icon: { width: 26, height: 26 },
  label: { fontSize: 12, fontWeight: '600', lineHeight: 15, marginTop: 2, textAlign: 'center', flexShrink: 1 },
});
