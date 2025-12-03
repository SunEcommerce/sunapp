import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  return (
    <ThemedView style={[styles.container, { backgroundColor: themeColors.background }]}>

      <View style={styles.section}>
        <ThemedText style={[styles.item, { color: themeColors.text }]}>Display</ThemedText>
        <ThemedText style={[styles.help, { color: themeColors.icon }]}>Use the OS settings or toggle dark/light mode in the app (not implemented).</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  section: { padding: 16 },
  item: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  help: { fontSize: 13 },
});
