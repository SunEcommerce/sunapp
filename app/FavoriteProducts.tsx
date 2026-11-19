import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchWishlistProducts, postWishlistToggle } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface WishlistProduct {
  id: number;
  name: string;
  slug: string;
  currency_price: string;
  cover: string;
  flash_sale: boolean;
  is_offer: boolean;
  discounted_price: string;
  rating_star: number | null;
  rating_star_count: number;
  wishlist: boolean;
}

type FavoritePalette = {
  background: string;
  surface: string;
  imageSurface: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  heart: string;
  heartSoft: string;
  sale: string;
};

const STORAGE_KEY = 'wishlist_products';
const GRID_GAP = 12;
const GRID_HORIZONTAL_PADDING = 16;
const GRID_MAX_WIDTH = 1100;

const parsePrice = (value: string | number | null | undefined) => {
  if (typeof value === 'number') return value;
  return parseFloat((value ?? '').toString().replace(/[^0-9.]/g, '')) || 0;
};

const FavoriteCard = memo(function FavoriteCard({
  item,
  width,
  palette,
  removing,
  onOpen,
  onRemove,
}: {
  item: WishlistProduct;
  width: number;
  palette: FavoritePalette;
  removing: boolean;
  onOpen: (slug: string) => void;
  onRemove: (productId: number) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const regularPrice = parsePrice(item.currency_price);
  const salePrice = parsePrice(item.discounted_price);
  const hasReducedPrice = salePrice > 0 && regularPrice > salePrice;
  const promotionLabel = item.flash_sale ? 'FLASH SALE' : item.is_offer ? 'SPECIAL OFFER' : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${hasReducedPrice ? item.discounted_price : item.currency_price}${item.rating_star !== null ? `, rated ${item.rating_star} out of 5` : ''}`}
      accessibilityHint="Opens product details"
      onPress={() => onOpen(item.slug)}
      style={({ pressed }) => [
        styles.productCard,
        { width, backgroundColor: palette.surface, borderColor: palette.border },
        pressed && styles.productCardPressed,
      ]}
    >
      <View style={[styles.imageContainer, { backgroundColor: palette.imageSurface }]}>
        {!imageFailed && item.cover ? (
          <Image
            accessible
            accessibilityLabel={item.name}
            source={{ uri: item.cover }}
            style={styles.productImage}
            resizeMode="contain"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="image-outline" size={38} color={palette.muted} />
          </View>
        )}

        {promotionLabel && (
          <View style={[styles.promotionBadge, { backgroundColor: palette.sale }]}>
            <Text style={styles.promotionText}>{promotionLabel}</Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.name} from favorites`}
          accessibilityState={{ disabled: removing, busy: removing }}
          disabled={removing}
          hitSlop={6}
          onPress={(event) => {
            event.stopPropagation();
            onRemove(item.id);
          }}
          style={({ pressed }) => [
            styles.removeButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
            pressed && !removing && styles.removeButtonPressed,
          ]}
        >
          {removing
            ? <ActivityIndicator size="small" color={palette.heart} />
            : <Ionicons name="heart" size={20} color={palette.heart} />}
        </Pressable>
      </View>

      <View style={styles.productInfo}>
        <ThemedText style={styles.productName} numberOfLines={2}>{item.name}</ThemedText>

        <View style={styles.priceRow}>
          <ThemedText style={[styles.price, { color: palette.text }]} numberOfLines={1}>
            {hasReducedPrice ? item.discounted_price : item.currency_price}
          </ThemedText>
          {hasReducedPrice && (
            <ThemedText style={[styles.originalPrice, { color: palette.muted }]} numberOfLines={1}>{item.currency_price}</ThemedText>
          )}
        </View>

        <View style={styles.cardMetaRow}>
          {item.rating_star !== null ? (
            <View style={[styles.ratingPill, { backgroundColor: palette.imageSurface }]}>
              <Ionicons name="star" size={13} color="#d99300" />
              <ThemedText style={[styles.ratingText, { color: palette.muted }]}>{item.rating_star}</ThemedText>
              <ThemedText style={[styles.ratingCount, { color: palette.muted }]}>({item.rating_star_count})</ThemedText>
            </View>
          ) : (
            <ThemedText style={[styles.noRatingText, { color: palette.muted }]}>New arrival</ThemedText>
          )}
          <View style={[styles.viewButton, { backgroundColor: palette.accentSoft }]}>
            <Ionicons name="arrow-forward" size={15} color={palette.accent} />
          </View>
        </View>
      </View>
    </Pressable>
  );
});

export default function FavoriteProducts() {
  const themeContext = useContext(ThemeContext);
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<number>>(() => new Set());

  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  const dark = colorScheme === 'dark';
  const palette = useMemo<FavoritePalette>(() => ({
    background: themeColors.background,
    surface: dark ? '#1d252a' : '#ffffff',
    imageSurface: dark ? '#252f35' : '#f3f6f7',
    text: themeColors.text,
    muted: themeColors.textSecondary,
    border: dark ? '#34434b' : '#dfe7eb',
    accent: dark ? '#77cee6' : '#086b83',
    accentSoft: dark ? '#193842' : '#e4f3f7',
    onAccent: dark ? '#10232b' : '#ffffff',
    heart: dark ? '#ff9298' : '#c93643',
    heartSoft: dark ? '#432329' : '#ffebed',
    sale: dark ? '#b83b47' : '#b42332',
  }), [dark, themeColors]);

  const columnCount = windowWidth >= 900 ? 4 : windowWidth >= 600 ? 3 : 2;
  const contentWidth = Math.min(windowWidth, GRID_MAX_WIDTH);
  const cardWidth = Math.floor(
    (contentWidth - (GRID_HORIZONTAL_PADDING * 2) - (GRID_GAP * (columnCount - 1))) / columnCount,
  );

  const loadWishlistProducts = useCallback(async () => {
    try {
      setError(null);
      const cachedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (cachedData) setProducts(JSON.parse(cachedData));

      const response = await fetchWishlistProducts();
      if (response?.data) {
        setProducts(response.data);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(response.data));
      }
    } catch (loadError) {
      console.error('Failed to load wishlist products:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load favorite products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadWishlistProducts();
  }, [loadWishlistProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWishlistProducts();
  }, [loadWishlistProducts]);

  const handleProductPress = useCallback((slug: string) => {
    router.push(`/ProductDetail?slug=${slug}`);
  }, [router]);

  const handleRemoveFromWishlist = useCallback(async (productId: number) => {
    if (removingIds.has(productId)) return;
    setRemovingIds(current => new Set(current).add(productId));

    try {
      await postWishlistToggle(productId, false);
      setProducts(current => {
        const updatedProducts = current.filter(product => product.id !== productId);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProducts)).catch(cacheError => {
          console.error('Failed to update wishlist cache:', cacheError);
        });
        return updatedProducts;
      });
    } catch (removeError) {
      console.error('Failed to remove from wishlist:', removeError);
      Alert.alert('Couldn’t remove favorite', 'Please check your connection and try again.');
    } finally {
      setRemovingIds(current => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
    }
  }, [removingIds]);

  const renderProduct = useCallback(({ item }: { item: WishlistProduct }) => (
    <FavoriteCard
      item={item}
      width={cardWidth}
      palette={palette}
      removing={removingIds.has(item.id)}
      onOpen={handleProductPress}
      onRemove={handleRemoveFromWishlist}
    />
  ), [cardWidth, handleProductPress, handleRemoveFromWishlist, palette, removingIds]);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} colors={[palette.accent]} />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <IconButton label="Go back" onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </IconButton>
        <ThemedText style={styles.headerTitle}>Favorites</ThemedText>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.stateContainer} accessibilityLiveRegion="polite">
          <View style={[styles.loadingIcon, { backgroundColor: palette.heartSoft }]}>
            <ActivityIndicator size="small" color={palette.heart} />
          </View>
          <ThemedText style={styles.stateTitle}>Loading favorites</ThemedText>
          <ThemedText style={[styles.stateDescription, { color: palette.muted }]}>Gathering the products you saved.</ThemedText>
        </View>
      ) : error && products.length === 0 ? (
        <View style={styles.stateContainer} accessibilityRole="alert">
          <View style={[styles.stateIcon, { backgroundColor: palette.heartSoft }]}>
            <Ionicons name="cloud-offline-outline" size={34} color={palette.heart} />
          </View>
          <ThemedText style={styles.stateTitle}>Couldn&apos;t load favorites</ThemedText>
          <ThemedText style={[styles.stateDescription, { color: palette.muted }]}>{error}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading favorites"
            onPress={loadWishlistProducts}
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: palette.accent }, pressed && styles.primaryButtonPressed]}
          >
            <Ionicons name="refresh" size={18} color={palette.onAccent} />
            <Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>Try again</Text>
          </Pressable>
        </View>
      ) : products.length === 0 ? (
        <FlatList
          data={products}
          renderItem={renderProduct}
          contentContainerStyle={styles.emptyListContent}
          refreshControl={refreshControl}
          ListEmptyComponent={(
            <View style={styles.emptyContent}>
              <View style={[styles.emptyArtwork, { backgroundColor: palette.heartSoft, borderColor: palette.border }]}>
                <Ionicons name="heart-outline" size={54} color={palette.heart} />
                <View style={[styles.emptyArtworkBadge, { backgroundColor: palette.surface, borderColor: palette.background }]}>
                  <Ionicons name="add" size={20} color={palette.accent} />
                </View>
              </View>
              <ThemedText style={styles.stateTitle}>Save what you love</ThemedText>
              <ThemedText style={[styles.stateDescription, { color: palette.muted }]}>Tap the heart on any product to keep it close and find it here later.</ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(tabs)/category')}
                style={({ pressed }) => [styles.primaryButton, { backgroundColor: palette.accent }, pressed && styles.primaryButtonPressed]}
              >
                <Ionicons name="grid-outline" size={18} color={palette.onAccent} />
                <Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>Explore products</Text>
              </Pressable>
            </View>
          )}
        />
      ) : (
        <FlatList
          key={`favorites-${columnCount}`}
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          numColumns={columnCount}
          contentContainerStyle={[styles.listContent, { maxWidth: GRID_MAX_WIDTH }]}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={(
            <View style={styles.listIntro}>
              <View style={styles.listIntroCopy}>
                <ThemedText style={styles.listTitle}>Saved for later</ThemedText>
                <ThemedText style={[styles.listSubtitle, { color: palette.muted }]}>Your handpicked products, all in one place</ThemedText>
              </View>
              <View style={[styles.countBadge, { backgroundColor: palette.heartSoft }]}>
                <Ionicons name="heart" size={14} color={palette.heart} />
                <ThemedText style={[styles.countText, { color: palette.heart }]}>{products.length}</ThemedText>
              </View>
            </View>
          )}
          ListFooterComponent={error ? (
            <View accessibilityRole="alert" style={[styles.inlineError, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Ionicons name="cloud-offline-outline" size={18} color={palette.muted} />
              <ThemedText style={[styles.inlineErrorText, { color: palette.muted }]}>Showing saved favorites. Pull down to refresh.</ThemedText>
            </View>
          ) : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: 44, height: 44 },
  headerTitle: { fontSize: 19, lineHeight: 26, fontWeight: '700' },
  listContent: { width: '100%', alignSelf: 'center', paddingHorizontal: GRID_HORIZONTAL_PADDING, paddingTop: 20, paddingBottom: 30 },
  columnWrapper: { gap: GRID_GAP, marginBottom: GRID_GAP },
  listIntro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, paddingHorizontal: 2 },
  listIntroCopy: { minWidth: 0, flex: 1 },
  listTitle: { fontSize: 22, lineHeight: 29, fontWeight: '700' },
  listSubtitle: { fontSize: 14, lineHeight: 21, marginTop: 2 },
  countBadge: { minWidth: 48, height: 36, borderRadius: 18, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  countText: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  productCard: { minWidth: 0, borderWidth: 1, borderRadius: 19, overflow: 'hidden', shadowColor: '#07151b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  productCardPressed: { opacity: 0.82 },
  imageContainer: { position: 'relative', width: '100%', aspectRatio: 1 },
  productImage: { width: '100%', height: '100%' },
  imageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  promotionBadge: { position: 'absolute', top: 10, left: 10, minHeight: 24, borderRadius: 8, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  promotionText: { color: '#ffffff', fontSize: 9, lineHeight: 13, fontWeight: '800', letterSpacing: 0.5 },
  removeButton: { position: 'absolute', top: 8, right: 8, width: 44, height: 44, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#07151b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2 },
  removeButtonPressed: { opacity: 0.72 },
  productInfo: { padding: 13 },
  productName: { minHeight: 42, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  priceRow: { minHeight: 39, marginTop: 8, justifyContent: 'center' },
  price: { fontSize: 17, lineHeight: 23, fontWeight: '800' },
  originalPrice: { fontSize: 11, lineHeight: 15, textDecorationLine: 'line-through', marginTop: 1 },
  cardMetaRow: { minHeight: 34, marginTop: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ratingPill: { minHeight: 28, minWidth: 0, flexShrink: 1, borderRadius: 10, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
  ratingCount: { fontSize: 10, lineHeight: 14 },
  noRatingText: { minWidth: 0, flexShrink: 1, fontSize: 11, lineHeight: 16 },
  viewButton: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingBottom: 58 },
  loadingIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stateIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stateTitle: { fontSize: 21, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  stateDescription: { maxWidth: 340, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 7 },
  primaryButton: { minHeight: 50, borderRadius: 15, marginTop: 22, paddingHorizontal: 20, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryButtonPressed: { opacity: 0.78 },
  primaryButtonText: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  emptyListContent: { flexGrow: 1, paddingHorizontal: 28 },
  emptyContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 58 },
  emptyArtwork: { width: 128, height: 128, borderRadius: 42, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 24, transform: [{ rotate: '-3deg' }] },
  emptyArtworkBadge: { position: 'absolute', right: 8, bottom: 8, width: 38, height: 38, borderRadius: 19, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  inlineError: { borderWidth: 1, borderRadius: 14, marginTop: 4, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  inlineErrorText: { flexShrink: 1, fontSize: 13, lineHeight: 19 },
});
