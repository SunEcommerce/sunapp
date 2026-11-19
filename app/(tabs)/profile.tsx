import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { useTabContentInset } from '@/hooks/use-tab-content-inset';
import { getAccessToken, logout } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { ComponentProps, useCallback, useContext, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type MenuEntry = {
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  action?: () => void;
  unavailable?: string;
};

function MenuItem({ iconName, label, color, muted, accent, iconBackground, borderColor, last, onPress, unavailable }: {
  iconName: MenuEntry['icon']; label: string; color: string; muted: string; accent: string;
  iconBackground: string; borderColor: string; last: boolean; onPress?: () => void; unavailable?: string;
}) {
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={unavailable ? `${label}, ${unavailable}` : label}
      accessibilityState={{ disabled: !!unavailable }} disabled={!!unavailable} onPress={onPress}
      activeOpacity={0.65} style={[styles.menuItem, { borderBottomColor: borderColor, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth }]}>
      <View style={[styles.menuIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={iconName} size={18} color={unavailable ? muted : accent} />
      </View>
      <ThemedText style={[styles.menuLabel, { color: unavailable ? muted : color }]}>{label}</ThemedText>
      {unavailable ? <View style={[styles.statusBadge, { backgroundColor: iconBackground }]}><ThemedText style={[styles.statusText, { color: muted }]}>{unavailable}</ThemedText></View>
        : <Ionicons name="chevron-forward" size={16} color={muted} />}
    </TouchableOpacity>
  );
}

export default function TabTwoScreen() {
  const tabContentInset = useTabContentInset();
  const themeContext = useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const theme = Colors[colorScheme];
  const dark = colorScheme === 'dark';
  const surface = dark ? '#1b252c' : '#ffffff';
  const border = dark ? '#30414c' : '#e2e8ed';
  const accent = dark ? '#8bd8ed' : '#086b83';
  const soft = dark ? '#253b46' : '#edf5f8';
  const buttonText = dark ? '#10232b' : '#ffffff';
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const router = useRouter();

  useFocusEffect(useCallback(() => {
    let active = true;
    const checkLogin = async () => {
      try {
        const token = await getAccessToken();
        const profile = token ? await AsyncStorage.getItem('user_profile') : null;
        if (active) {
          setIsLoggedIn(!!token);
          setUserProfile(profile ? JSON.parse(profile) : null);
        }
      } catch {
        if (active) { setIsLoggedIn(false); setUserProfile(null); }
      }
    };
    checkLogin();
    return () => { active = false; };
  }, []));

  const menuGroups: { title: string; items: MenuEntry[] }[] = [
    { title: 'Preferences', items: [
      { label: 'Language', icon: 'language-outline', unavailable: 'English only' },
      { label: 'App Setting', icon: 'options-outline', action: () => router.push('/screens/settings') },
    ] },
    { title: 'Services', items: [
      { label: 'Warranty', icon: 'shield-checkmark-outline', unavailable: 'Unavailable' },
      { label: 'Apply Hire Purchase', icon: 'card-outline', unavailable: 'Unavailable' },
      { label: 'Loyalty Program', icon: 'gift-outline', unavailable: 'Unavailable' },
    ] },
    { title: 'Help & information', items: [
      { label: 'Contact Us', icon: 'chatbubble-ellipses-outline', action: () => router.push({ pathname: '/PageView', params: { slug: 'contact-us' } }) },
      { label: 'Privacy Policy', icon: 'lock-closed-outline', action: () => router.push({ pathname: '/PageView', params: { slug: 'privacy-policy' } }) },
      { label: 'Terms & Condition', icon: 'document-text-outline', action: () => router.push({ pathname: '/PageView', params: { slug: 'terms-and-conditions' } }) },
    ] },
  ];
  const quickActions: MenuEntry[] = [
    { label: 'My orders', icon: 'receipt-outline', action: () => router.push('/OrderList') },
    { label: 'Favorites', icon: 'heart-outline', action: () => router.push('/FavoriteProducts') },
    { label: 'Addresses', icon: 'location-outline', action: () => router.push('/Address') },
    { label: 'Edit profile', icon: 'person-outline', action: () => router.push('/EditProfile') },
  ];

  async function handleLogout() {
    try {
      await logout();
      setUserProfile(null);
      setIsLoggedIn(false);
      router.push('/Auth');
    } catch (error) { console.error('Logout failed:', error); }
  }

  const name = userProfile?.name?.trim() || 'Your account';
  const phone = [userProfile?.country_code, userProfile?.phone].filter(Boolean).join(' ');
  const avatar = userProfile?.image;
  const initials = name.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabContentInset + 16 }]}
        scrollIndicatorInsets={{ bottom: tabContentInset }}>
        <View style={styles.header}>
          <ThemedText style={[styles.eyebrow, { color: theme.textSecondary }]}>Your space at Sun Mobile</ThemedText>
          <ThemedText accessibilityRole="header" style={styles.pageTitle}>My account</ThemedText>
        </View>

        <View style={[styles.accountCard, { backgroundColor: surface, borderColor: border }]}>
          <View style={styles.identityRow}>
            <View style={[styles.avatar, { backgroundColor: soft }]}>
              {isLoggedIn && avatar && avatar !== failedAvatar ? <Image source={{ uri: avatar }} style={StyleSheet.absoluteFill} contentFit="cover" onError={() => setFailedAvatar(avatar)} accessibilityLabel="Profile photo" />
                : isLoggedIn ? <ThemedText style={[styles.initials, { color: accent }]}>{initials}</ThemedText>
                  : <Ionicons name="person-outline" size={26} color={accent} />}
            </View>
            <View style={styles.identityCopy}>
              <ThemedText style={styles.accountName}>{isLoggedIn ? name : 'Make yourself at home'}</ThemedText>
              <ThemedText style={[styles.accountSubtitle, { color: theme.textSecondary }]}>{isLoggedIn ? (phone || userProfile?.email || 'Manage your account and purchases') : 'Sign in for orders, favorites and more.'}</ThemedText>
            </View>
          </View>
          {!isLoggedIn && <View style={styles.authRow}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign in" onPress={() => router.push('/Auth')}
              style={[styles.authButton, { backgroundColor: accent }]}><ThemedText style={[styles.authButtonText, { color: buttonText }]}>Sign in</ThemedText><Ionicons name="arrow-forward" size={17} color={buttonText} /></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Create account" onPress={() => router.push({ pathname: '/Auth', params: { mode: 'register' } })}
              style={[styles.authButton, { borderWidth: 1, borderColor: border }]}><ThemedText style={[styles.authButtonText, { color: accent }]}>Create account</ThemedText></TouchableOpacity>
          </View>}
        </View>

        {isLoggedIn && <View style={styles.quickActions}>{quickActions.map(action => (
          <TouchableOpacity key={action.label} onPress={action.action} accessibilityRole="button" accessibilityLabel={action.label}
            style={[styles.quickAction, { backgroundColor: surface, borderColor: border }]}>
            <Ionicons name={action.icon} size={20} color={accent} /><ThemedText style={styles.quickLabel}>{action.label}</ThemedText>
          </TouchableOpacity>
        ))}</View>}

        {menuGroups.map(group => <View key={group.title} style={styles.group}>
          <ThemedText accessibilityRole="header" style={[styles.groupTitle, { color: theme.textSecondary }]}>{group.title}</ThemedText>
          <View style={[styles.menuCard, { backgroundColor: surface, borderColor: border }]}>
            {group.items.map((item, index) => <MenuItem key={item.label} label={item.label} iconName={item.icon}
              color={theme.text} muted={theme.textSecondary} accent={accent} iconBackground={soft}
              borderColor={border} last={index === group.items.length - 1} onPress={item.action} unavailable={item.unavailable} />)}
          </View>
        </View>)}
        {isLoggedIn && <TouchableOpacity onPress={handleLogout} accessibilityRole="button" accessibilityLabel="Sign out"
          style={[styles.signOut, { borderColor: border, backgroundColor: surface }]}>
          <Ionicons name="log-out-outline" size={19} color={dark ? '#ffb3b3' : '#b52b38'} /><ThemedText style={[styles.signOutText, { color: dark ? '#ffb3b3' : '#b52b38' }]}>Sign out</ThemedText>
        </TouchableOpacity>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 16 },
  header: { paddingTop: 20, paddingBottom: 18 },
  eyebrow: { fontSize: 12, lineHeight: 18, marginBottom: 3 },
  pageTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.8 },
  accountCard: { borderRadius: 20, borderWidth: 1, padding: 16 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initials: { fontSize: 20, fontWeight: '700', lineHeight: 28 },
  identityCopy: { flex: 1, minWidth: 0 },
  accountName: { fontSize: 17, lineHeight: 23, fontWeight: '600', letterSpacing: -0.3 },
  accountSubtitle: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  authRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  authButton: { flex: 1, minWidth: 110, minHeight: 46, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  authButtonText: { fontSize: 13, lineHeight: 20, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  quickAction: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', minHeight: 48, padding: 12, gap: 10, borderWidth: 1, borderRadius: 14 },
  quickLabel: { fontSize: 13, lineHeight: 20, fontWeight: '500', flexShrink: 1 },
  group: { marginTop: 20 },
  groupTitle: { fontSize: 12, lineHeight: 18, fontWeight: '600', marginLeft: 4, marginBottom: 8 },
  menuCard: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, overflow: 'hidden' },
  menuItem: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  menuIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { fontSize: 13, lineHeight: 20, flex: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, flexShrink: 1 },
  statusText: { fontSize: 10, lineHeight: 16 },
  signOut: { marginTop: 20, borderWidth: 1, borderRadius: 14, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 },
  signOutText: { fontSize: 14, lineHeight: 22, fontWeight: '600' },
});
