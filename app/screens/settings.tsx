import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import React, { useContext } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

export default function SettingsScreen() {
  const themeContext = useContext(ThemeContext);

  if (!themeContext) {
    // This should not happen as it's wrapped in the provider
    return null;
  }

  const { colorScheme, isDarkMode, isSystemMode, setSystemMode, toggleTheme } = themeContext;
  const themeColors = Colors[colorScheme ?? 'light'];

  return (
    <ThemedView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>Display</ThemedText>
        <View style={styles.item}>
          <ThemedText style={{ color: themeColors.text }}>Use System Setting</ThemedText>
          <Switch value={isSystemMode} onValueChange={setSystemMode} />
        </View>
        <View style={styles.item}>
          <ThemedText style={{ color: themeColors.text }}>Dark Mode</ThemedText>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            disabled={isSystemMode}
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
});
