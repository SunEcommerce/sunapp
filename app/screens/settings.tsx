import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext } from 'react';
import { StatusBar, StyleSheet, Switch, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const themeContext = useContext(ThemeContext);

  if (!themeContext) {
    // This should not happen as it's wrapped in the provider
    return null;
  }

  const { colorScheme, isDarkMode, isSystemMode, setSystemMode, toggleTheme } = themeContext;
  const themeColors = Colors[colorScheme ?? 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>App Setting</ThemedText>
        <View style={styles.headerRight} />
      </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
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
