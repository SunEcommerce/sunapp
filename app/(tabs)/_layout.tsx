import { Tabs } from 'expo-router';
import React, { useContext } from 'react';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassTabButton, LiquidGlassBackground, SculptedTabIcon } from '@/components/liquid-glass-tab';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';

export default function TabLayout() {
  const { colorScheme } = useContext(ThemeContext)!;
  const dark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const barHeight = 52 + 32 * Math.min(Math.max(fontScale, 1), 2);

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
          left: Math.max(insets.left, 12),
          right: Math.max(insets.right, 12),
          shadowOpacity: dark ? 0.35 : 0.16,
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
          tabBarIcon: ({ focused }) => <SculptedTabIcon name="home" focused={focused} dark={dark} />,
        }}
      />
      <Tabs.Screen
        name="category"
        options={{
          title: 'Category',
          tabBarAccessibilityLabel: 'Category',
          tabBarIcon: ({ focused }) => <SculptedTabIcon name="widgets" focused={focused} dark={dark} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarAccessibilityLabel: 'Cart',
          tabBarIcon: ({ focused }) => <SculptedTabIcon name="shopping-cart" focused={focused} dark={dark} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile',
          tabBarIcon: ({ focused }) => <SculptedTabIcon name="account-circle" focused={focused} dark={dark} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 6,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderRadius: 32,
    elevation: 8,
    shadowColor: '#163c56',
    shadowOffset: { width: 0, height: 7 },
    shadowRadius: 16,
  },
  item: { borderRadius: 25, minHeight: 48, marginHorizontal: 2 },
  icon: { width: 34, height: 34 },
  label: { fontSize: 13, fontWeight: '600', lineHeight: 16, marginTop: 3, textAlign: 'center', flexShrink: 1 },
});
