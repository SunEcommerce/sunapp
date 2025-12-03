import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import { Button, StyleSheet } from 'react-native';

export default function InterstitialScreen() {
  const handleContinue = () => {
    router.replace('/(tabs)');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Welcome!</ThemedText>
      <ThemedText>Here is your daily message.</ThemedText>
      <Button title="Continue to App" onPress={handleContinue} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
});