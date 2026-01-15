import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Button, StyleSheet } from 'react-native';

export default function InterstitialScreen() {
  const [requestedPage, setRequestedPage] = useState<any>(null);

  useEffect(() => {
    const fetchRequestedPage = async () => {
      const page = await AsyncStorage.getItem('REQUESTED_PAGE');
      if (page) {
        setRequestedPage(JSON.parse(page));
        await AsyncStorage.removeItem('REQUESTED_PAGE');
      }
    };
    fetchRequestedPage();
  }, []);

  const handleContinue = () => {
    if(requestedPage) {
      router.replace(requestedPage);
    } else router.replace('/(tabs)');
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