import { HomeSkeleton } from '@/components/HomeSkeleton';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { usePromotions } from '@/hooks/use-promotions';
import type { Promotion } from '@/utils/promotions';
import { useRouter } from 'expo-router';
import { useContext, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

export function PromotionBanner({ promotion, small = false, width }: { promotion: Promotion; small?: boolean; width?: number }) {
  const router = useRouter();
  const { colorScheme } = useContext(ThemeContext)!;
  const theme = Colors[colorScheme];
  const image = small ? promotion.cover || promotion.preview : promotion.preview || promotion.cover;
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`View ${promotion.name || 'promotion'} products`}
      style={[styles.banner, { width: width ?? '100%', aspectRatio: small ? 540 / 336 : 1689 / 600, backgroundColor: theme.card }]}
      onPress={() => router.push({ pathname: '/ProductList', params: { source: 'promotion', promotion: promotion.slug, title: promotion.name } })}>
      {image !== failedImage ? <Image source={{ uri: image }} resizeMode="contain" style={StyleSheet.absoluteFill}
        onError={() => setFailedImage(image)} /> : <Text style={{ color: theme.text, textAlign: 'center', padding: 12 }}>{promotion.name || 'View promotion'}</Text>}
    </TouchableOpacity>
  );
}

export function PromotionRetry({ onPress }: { onPress: () => void }) {
  const { colorScheme } = useContext(ThemeContext)!;
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.retry}>
    <Text style={{ color: Colors[colorScheme].text }}>Could not load promotions.</Text>
    <Text style={{ color: Colors[colorScheme].tint, marginTop: 6 }}>Retry promotions</Text>
  </TouchableOpacity>;
}

export default function PromotionSection({ refreshKey = 0 }: { refreshKey?: number }) {
  const { promotions, loading, error, retry } = usePromotions(5, refreshKey);
  const { width } = useWindowDimensions();
  const cardWidth = width >= 640 ? (width - 64) / 3 : Math.min(208, width - 32);
  if (loading) return <View style={styles.section}><HomeSkeleton variant="banner" label="Loading promotions" height={cardWidth * 336 / 540} /></View>;
  if (error) return <PromotionRetry onPress={retry} />;
  if (!promotions.length) return null;
  return <FlatList style={{ marginTop: 24 }} horizontal data={promotions} keyExtractor={item => String(item.id)} showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.row} renderItem={({ item }) => <PromotionBanner promotion={item} small width={cardWidth} />} />;
}

const styles = StyleSheet.create({
  section: { marginTop: 24, paddingHorizontal: 16 },
  row: { paddingHorizontal: 16, gap: 16 },
  banner: { borderRadius: 12, overflow: 'hidden', justifyContent: 'center' },
  retry: { padding: 16, marginTop: 24 },
});
