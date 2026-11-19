import { IconButton } from '@/components/ui/icon-button';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Appearance = 'light' | 'dark' | 'system';
const options: { value: Appearance; label: string; hint: string }[] = [
  { value: 'light', label: 'Light', hint: 'Use a light appearance throughout the app' },
  { value: 'dark', label: 'Dark', hint: 'Use a dark appearance throughout the app' },
  { value: 'system', label: 'System', hint: 'Follow your device appearance automatically' },
];

function ThemePreview({ mode }: { mode: Appearance }) {
  const renderPanel = (dark: boolean) => <View style={[styles.previewPanel, { backgroundColor: dark ? '#1b252c' : '#ffffff' }]}>
    <View style={styles.previewNav}>
      <View style={[styles.previewLogo, { backgroundColor: dark ? '#8bd8ed' : '#086b83' }]} />
      <View style={[styles.previewDot, { backgroundColor: dark ? '#728a98' : '#bccbd2' }]} />
    </View>
    <View style={[styles.previewBanner, { backgroundColor: dark ? '#315362' : '#d8edf3' }]} />
    <View style={styles.previewProducts}>{[1, 2].map(key => <View key={key} style={styles.previewProduct}>
      <View style={[styles.previewImage, { backgroundColor: dark ? '#344650' : '#edf1f4' }]} />
      <View style={[styles.previewLine, { backgroundColor: dark ? '#9db2bd' : '#8b9fa9' }]} />
      <View style={[styles.previewPrice, { backgroundColor: dark ? '#8bd8ed' : '#086b83' }]} />
    </View>)}</View>
  </View>;
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.preview}>
    {mode === 'system' ? <>{renderPanel(false)}{renderPanel(true)}</> : renderPanel(mode === 'dark')}
  </View>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const themeContext = useContext(ThemeContext);
  const [saving, setSaving] = useState(false);
  if (!themeContext) return null;

  const { colorScheme, isSystemMode, setSystemMode, setTheme } = themeContext;
  const dark = colorScheme === 'dark';
  const theme = Colors[colorScheme];
  const surface = dark ? '#1b252c' : '#ffffff';
  const border = dark ? '#30414c' : '#e2e8ed';
  const accent = dark ? '#8bd8ed' : '#086b83';
  const softAccent = dark ? '#253b46' : '#eaf4f8';
  const selected: Appearance = isSystemMode ? 'system' : colorScheme;

  const chooseAppearance = async (mode: Appearance) => {
    if (saving || mode === selected) return;
    setSaving(true);
    try {
      if (mode === 'system') await setSystemMode(true);
      else {
        await setSystemMode(false);
        await setTheme(mode);
      }
    } finally {
      setSaving(false);
    }
  };

  return <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
    <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
    <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border }]}>
      <View style={styles.headerContent}>
        <IconButton label="Go back" onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={23} color={theme.text} />
        </IconButton>
        <ThemedText style={styles.headerTitle}>Settings</ThemedText>
        <View style={styles.headerButton} />
      </View>
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.intro}>
        <View style={[styles.introIcon, { backgroundColor: softAccent }]}>
          <Ionicons name={isSystemMode ? 'phone-portrait-outline' : dark ? 'moon-outline' : 'sunny-outline'} size={20} color={accent} />
        </View>
        <View style={styles.currentCopy}>
          <ThemedText accessibilityRole="header" style={styles.title}>Appearance</ThemedText>
          <ThemedText accessibilityLiveRegion="polite" style={[styles.caption, { color: theme.textSecondary }]}>
            {isSystemMode ? `Currently using ${colorScheme} mode` : dark ? 'Dark appearance' : 'Light appearance'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.themeSection}>
        <ThemedText accessibilityRole="header" style={styles.sectionTitle}>Choose a theme</ThemedText>
        <View accessibilityRole="radiogroup" accessibilityLabel="App appearance" style={styles.options}>
          {options.map(option => {
            const active = selected === option.value;
            return <TouchableOpacity key={option.value} accessibilityRole="radio" accessibilityLabel={option.label}
              accessibilityHint={option.hint} accessibilityState={{ checked: active, disabled: saving }} disabled={saving}
              activeOpacity={0.75} onPress={() => chooseAppearance(option.value)}
              style={[styles.option, { backgroundColor: active ? softAccent : surface, borderColor: active ? accent : border }]}>
              <ThemePreview mode={option.value} />
              <View style={styles.optionLabelRow}>
                <ThemedText style={[styles.optionLabel, { color: active ? accent : theme.text }]}>{option.label}</ThemedText>
                <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={16} color={active ? accent : theme.icon} />
              </View>
            </TouchableOpacity>;
          })}
        </View>
        <ThemedText style={[styles.hint, { color: theme.textSecondary }]}>
          {isSystemMode ? 'Automatically follows your device’s appearance.' : 'Use your chosen theme across the app.'}
        </ThemedText>
      </View>
      <View style={[styles.savedHint, { borderTopColor: border }]}>
        <Ionicons name="checkmark-done-outline" size={17} color={theme.icon} />
        <ThemedText style={[styles.caption, { color: theme.textSecondary }]}>Your preference is saved automatically.</ThemedText>
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth },
  headerContent: { width: '100%', maxWidth: 620, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, minHeight: 48 },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 15, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  introIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.6 },
  currentCopy: { flex: 1, gap: 3 },
  caption: { fontSize: 12, lineHeight: 19, flexShrink: 1 },
  themeSection: { marginTop: 16 },
  sectionTitle: { fontSize: 14, lineHeight: 22, fontWeight: '600', marginBottom: 8 },
  options: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, minWidth: 0, borderWidth: 1.5, borderRadius: 14, padding: 8, minHeight: 114 },
  optionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 3, minHeight: 30, paddingTop: 4 },
  optionLabel: { fontSize: 12, lineHeight: 18, fontWeight: '600', flexShrink: 1 },
  preview: { flexDirection: 'row', height: 68, borderRadius: 7, overflow: 'hidden' },
  previewPanel: { flex: 1, padding: 5, gap: 5 },
  previewNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLogo: { width: 11, height: 8, borderRadius: 2 },
  previewDot: { width: 4, height: 4, borderRadius: 2 },
  previewBanner: { height: 14, borderRadius: 4 },
  previewProducts: { flexDirection: 'row', gap: 4 },
  previewProduct: { flex: 1, gap: 3 },
  previewImage: { height: 12, borderRadius: 3 },
  previewLine: { width: '90%', height: 3, borderRadius: 2 },
  previewPrice: { width: '60%', height: 3, borderRadius: 2 },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  savedHint: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 14 },
});
