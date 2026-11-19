import { TextInput } from '@/components/ui/text-input';
import { IconButton } from '@/components/ui/icon-button';
import FilterBottomSheet, { Filters } from '@/components/FilterBottomSheet';
import { HomeSkeleton } from '@/components/HomeSkeleton';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchFilteredProducts, type ProductSort } from '@/utils/product-listing';
import { navigateToProductDetail } from '@/utils/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  StatusBar,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CARD_GUTTER = 12;
const NUM_COLUMNS = 2;


export default function ProductListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const themeContext = useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  const { width } = useWindowDimensions();
  const [listWidth, setListWidth] = useState(width);
  const cardWidth = Math.max(0, (listWidth - CARD_GUTTER * (NUM_COLUMNS + 1)) / NUM_COLUMNS);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState<ProductSort>('best');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [nextPage, setNextPage] = useState(2);
  const [requestVersion, setRequestVersion] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = Array.isArray(params.category)
    ? params.category[0] || 'all'
    : params.category || 'all';
  const searchQuery = Array.isArray(params.name) ? params.name[0] || '' : params.name || '';
  const brandSlug = Array.isArray(params.brand) ? params.brand[0] || '' : params.brand || '';
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const section = Array.isArray(params.section) ? params.section[0] : params.section;
  const promotion = Array.isArray(params.promotion) ? params.promotion[0] : params.promotion;
  const promotionTitle = Array.isArray(params.title) ? params.title[0] : params.title;
  const defaultSort = source === 'new_arrivals' ? 'newest' : 'best';
  useEffect(() => {
    setFilters(null);
    setSelectedSort(source === 'new_arrivals' ? 'newest' : 'best');
    setPage(1);
  }, [selectedCategory, brandSlug, source, section, promotion]);
  const appliedFilters = useMemo<Filters>(() => filters || {
    category: selectedCategory,
    brands: brandSlug ? [brandSlug] : [],
    sortBy: selectedSort,
  }, [filters, selectedCategory, brandSlug, selectedSort]);

  // Fetch products from API
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetchFilteredProducts({ ...appliedFilters, name: searchQuery, page, source, section, promotion });
        if (cancelled) return;
        setProducts(previous => page === 1 ? response.products : [...previous, ...response.products]);
        setHasMore(response.hasMore);
        setNextPage(response.nextPage);
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to fetch products:', error);
        setError(error instanceof Error ? error.message : 'Failed to load products');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadProducts();
    return () => { cancelled = true; };
  }, [appliedFilters, searchQuery, page, requestVersion, source, section, promotion]);

  const changeSort = (sort: ProductSort) => {
    setPage(1);
    setSelectedSort(sort);
    setFilters({ ...appliedFilters, sortBy: sort });
  };

  const renderCard = ({ item }: { item: any }) => {
    const imageUrl = item.cover || item.image || item.image_url || item.thumbnail || 'https://placehold.co/400x400/png?text=Product';
    const title = (item.name || item.title || 'Product').toString().trim();
    const slug = item.slug || '';
    
    // Parse price strings (e.g., "$899.00" -> 899.00)
    const parsePrice = (priceStr: string | number) => {
      if (typeof priceStr === 'number') return priceStr;
      return parseFloat(priceStr.toString().replace(/[^0-9.]/g, '')) || 0;
    };
    
    const discountedPrice = parsePrice(item.discounted_price || item.sale_price || item.price || 0);
    const regularPrice = parsePrice(item.currency_price || item.regular_price || item.original_price || discountedPrice);

    return (
      <TouchableOpacity 
        style={[styles.card, { backgroundColor: themeColors.card, width: cardWidth }]}
        onPress={() => navigateToProductDetail(router, slug, {
          name: title,
          price: discountedPrice,
          image: imageUrl,
          currency_price: discountedPrice,
          old_currency_price: regularPrice,
          discounted_price: discountedPrice,
        })} 
        activeOpacity={0.9}
      >
        <View style={styles.imageWrapper}>
          <Image source={{ uri: imageUrl }} style={[styles.image, { height: cardWidth }]} />
        </View>
        <View style={styles.cardBody}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {title}
          </ThemedText>
          <View style={styles.priceContainer}>
            <ThemedText style={[styles.price, { color: themeColors.success }]}>${discountedPrice.toFixed(2)}</ThemedText>
            {regularPrice > discountedPrice && (
              <ThemedText style={[styles.originalPrice, { color: themeColors.textSecondary }]}>${regularPrice.toFixed(2)}</ThemedText>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const activeFilterCount = Number(appliedFilters.category !== 'all')
    + appliedFilters.brands.length + Number(Boolean(appliedFilters.priceRange));
  const accent = colorScheme === 'dark' ? '#77d8f2' : '#076783';
  const softAccent = colorScheme === 'dark' ? '#173640' : '#e2f2f7';
  const subtleBorder = colorScheme === 'dark' ? '#35434a' : '#dce3e7';
  const sortOptions: { key: ProductSort; label: string }[] = [
    { key: 'best', label: 'Best Match' },
    { key: 'newest', label: 'Newest' },
    { key: 'top_rated', label: 'Top Rated' },
    { key: 'price_low_high', label: 'Price: Low to High' },
    { key: 'price_high_low', label: 'Price: High to Low' },
  ];
  const ListHeader = (
    <View style={[styles.stickyHeaderContent, { backgroundColor: themeColors.background }]}>
      {(source === 'hot_sales' || source === 'new_arrivals' || source === 'promotion') && (
        <ThemedText style={[styles.resultText, { color: themeColors.text }]}>
          {source === 'promotion' ? promotionTitle || 'Promotion' : source === 'hot_sales' ? 'Hot Sales' : 'New Arrivals'}
        </ThemedText>
      )}
      <View style={styles.controlRow}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}
          style={[styles.controlButton, { backgroundColor: softAccent, borderColor: subtleBorder }]}
          onPress={() => setFilterVisible(true)} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={19} color={accent} />
          <ThemedText style={[styles.controlText, { color: accent }]}>Filters</ThemedText>
          {activeFilterCount > 0 && <View style={[styles.filterBadge, { backgroundColor: accent }]}>
            <Text style={[styles.filterBadgeText, { color: themeColors.background }]}>{activeFilterCount}</Text>
          </View>}
        </TouchableOpacity>
        <View style={[styles.controlDivider, { backgroundColor: subtleBorder }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroll} contentContainerStyle={styles.sortOptions}>
          {sortOptions.map(option => {
            const active = appliedFilters.sortBy === option.key;
            return <TouchableOpacity key={option.key} accessibilityRole="button" accessibilityState={{ selected: active }}
              onPress={() => changeSort(option.key)} activeOpacity={0.7}
              style={[styles.sortButton, { backgroundColor: active ? softAccent : themeColors.card, borderColor: active ? accent : subtleBorder }]}>
              {active && <Ionicons name="checkmark" size={16} color={accent} />}
              <ThemedText style={[styles.sortButtonText, { color: active ? accent : themeColors.textSecondary }]}>{option.label}</ThemedText>
              {(option.key === 'price_low_high' || option.key === 'price_high_low') && (
                <Ionicons name={option.key === 'price_low_high' ? 'arrow-up-outline' : 'arrow-down-outline'}
                  size={18} color={active ? accent : themeColors.textSecondary} />
              )}
            </TouchableOpacity>;
          })}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']} onLayout={e => setListWidth(e.nativeEvent.layout.width)}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      {/* Header Navigation */}
      <View style={[styles.headerNav, { backgroundColor: themeColors.card, borderBottomColor: themeColors.borderColor }]}>
        <IconButton label="Go back" style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </IconButton>
        <View style={[styles.searchContainer, { backgroundColor: themeColors.background }]}>
          <Ionicons name="search-outline" size={20} color={themeColors.icon} style={styles.searchIcon} />
          <TextInput accessibilityLabel="Search products..."
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder="Search products..."
            placeholderTextColor={themeColors.icon}
            value={localSearchQuery}
            onChangeText={setLocalSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => {
              setPage(1);
              router.setParams({ name: localSearchQuery.trim() });
            }}
          />
          {localSearchQuery.length > 0 && (
            <IconButton label="Clear search" onPress={() => { setLocalSearchQuery(''); setPage(1); router.setParams({ name: '' }); }}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </IconButton>
          )}
        </View>
      </View>

      {error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setRequestVersion(version => version + 1);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={isLoading && page === 1 ? [] : products}
          renderItem={renderCard}
          keyExtractor={(item, index) => item.id?.toString() || item.slug || index.toString()}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={products.length > 0 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={isLoading ? (page > 1 ? <HomeSkeleton variant="grid" label="Loading more products" cardWidth={cardWidth} rows={1} /> : null) : hasMore ? (
            <TouchableOpacity accessibilityRole="button" style={styles.retryButton} onPress={() => setPage(nextPage)}>
              <Text style={styles.retryButtonText}>Load More</Text>
            </TouchableOpacity>
          ) : products.length > 0 ? (
            <ThemedText accessibilityLiveRegion="polite" style={[styles.endText, { color: themeColors.textSecondary }]}>No more products</ThemedText>
          ) : null}
          ListEmptyComponent={isLoading ? <HomeSkeleton variant="grid" label="Loading products" cardWidth={cardWidth} /> :
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#CCC" />
              <ThemedText style={styles.emptyText}>No products found</ThemedText>
              <ThemedText style={styles.emptySubtext}>Try adjusting your search or filters</ThemedText>
            </View>
          }
          stickyHeaderIndices={[0]}
          showsVerticalScrollIndicator={false}
        />
      )}
      <FilterBottomSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onReset={() => { setPage(1); setSelectedSort(defaultSort); setFilters({ category: 'all', brands: [], sortBy: defaultSort }); }}
        onApply={(f) => {
          setFilters(f);
          setPage(1);
          setFilterVisible(false);
          // Example: navigate with applied filters (optional)
          // router.setParams?.(f as any);
        }}
        initial={appliedFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: CARD_GUTTER,
    paddingTop: 8,
    paddingBottom: 24,
  },
  stickyHeaderContent: {
    paddingVertical: 10,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  controlButton: {
    flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44,
    paddingHorizontal: 12, borderRadius: 14, borderWidth: 1,
  },
  controlText: { fontSize: 14, fontWeight: '700' },
  filterBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  filterBadgeText: { fontSize: 11, fontWeight: '700' },
  controlDivider: { width: 1, height: 24 },
  sortScroll: { flex: 1 },
  sortOptions: { gap: 8, paddingRight: 2 },
  sortButton: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, minHeight: 44, borderRadius: 14, borderWidth: 1,
  },
  sortButtonText: { fontSize: 13, fontWeight: '600' },
  columnWrapper: {
    gap: CARD_GUTTER,
    marginBottom: CARD_GUTTER,
  },
  card: {
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    resizeMode: 'cover',
  },
  favButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 6,
    borderRadius: 16,
  },
  cardBody: {
    padding: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B8457',
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  endText: { textAlign: 'center', fontSize: 14, paddingVertical: 24 },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#1E88E5',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.6,
  },
  cartButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E88E5',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
});
