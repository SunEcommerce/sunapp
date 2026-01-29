import FilterBottomSheet, { Filters } from '@/components/FilterBottomSheet';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchProducts } from '@/utils/api';
import { navigateToProductDetail } from '@/utils/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GUTTER = 12;
const NUM_COLUMNS = 2;
const CARD_WIDTH = (SCREEN_WIDTH - CARD_GUTTER * (NUM_COLUMNS + 1)) / NUM_COLUMNS;


export default function ProductListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const themeContext = useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<Partial<Filters>>({});
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [selectedSort, setSelectedSort] = useState<'best' | 'sales' | 'price'>('best');
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = Array.isArray(params.category)
    ? params.category[0] || 'all'
    : params.category || 'all';
  const searchQuery = Array.isArray(params.name) ? params.name[0] || '' : params.name || '';
  const brandSlug = Array.isArray(params.brand) ? params.brand[0] || '' : params.brand || '';
  const source = Array.isArray(params.source) ? params.source[0] || '' : params.source || '';

  // Fetch products from API
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const apiParams: any = {};
        
        if (selectedCategory && selectedCategory !== 'all') {
          apiParams.category = selectedCategory;
        }
        
        if (searchQuery.trim()) {
          apiParams.name = searchQuery.trim();
        }

        if (brandSlug) {
          apiParams.brand = brandSlug;
        }

        // Add sort parameter
        if (selectedSort === 'sales') {
          apiParams.sort = 'sales';
        } else if (selectedSort === 'price') {
          apiParams.sort = 'price';
        }

        // Add filters if any
        if (filters.minPrice) {
          apiParams.min_price = filters.minPrice;
        }
        if (filters.maxPrice) {
          apiParams.max_price = filters.maxPrice;
        }

        const response = await fetchProducts(apiParams);
        const productsData = response?.data || response?.products || response || [];
        setProducts(productsData);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setError(error instanceof Error ? error.message : 'Failed to load products');
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [selectedCategory, searchQuery, brandSlug, selectedSort, filters]);

  const totalResults = products.length;

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
        style={[styles.card, { backgroundColor: themeColors.card }]} 
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
          <Image source={{ uri: imageUrl }} style={styles.image} />
        </View>
        <View style={styles.cardBody}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {title}
          </ThemedText>
          <View style={styles.priceContainer}>
            <ThemedText style={styles.price}>${discountedPrice.toFixed(2)}</ThemedText>
            {regularPrice > discountedPrice && (
              <ThemedText style={styles.originalPrice}>${regularPrice.toFixed(2)}</ThemedText>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeader = (
    <View style={[styles.stickyHeaderContent, { backgroundColor: themeColors.background }]}>
      <View style={styles.controlRow}>
        <TouchableOpacity style={[styles.controlButton, { backgroundColor: themeColors.card, borderColor: '#1E88E5' }]} onPress={() => setFilterVisible(true)}>
          <Ionicons name="filter-outline" size={16} color="#1E88E5" />
          <ThemedText style={styles.controlText}>Filter</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortButton, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor }, selectedSort === 'best' && styles.sortButtonActive]} 
          onPress={() => setSelectedSort('best')}>
          <ThemedText style={[styles.sortButtonText, selectedSort === 'best' && styles.sortButtonTextActive]}>Best Match</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortButton, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor }, selectedSort === 'sales' && styles.sortButtonActive]} 
          onPress={() => setSelectedSort('sales')}>
          <ThemedText style={[styles.sortButtonText, selectedSort === 'sales' && styles.sortButtonTextActive]}>Top Sales</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortButton, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor }, selectedSort === 'price' && styles.sortButtonActive]} 
          onPress={() => setSelectedSort('price')}>
          <ThemedText style={[styles.sortButtonText, selectedSort === 'price' && styles.sortButtonTextActive]}>Price ↕</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      {/* Header Navigation */}
      <View style={[styles.headerNav, { backgroundColor: themeColors.card, borderBottomColor: themeColors.borderColor }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <View style={[styles.searchContainer, { backgroundColor: themeColors.background }]}>
          <Ionicons name="search-outline" size={20} color={themeColors.icon} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.text }]}
            placeholder="Search products..."
            placeholderTextColor={themeColors.icon}
            value={localSearchQuery}
            onChangeText={setLocalSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (localSearchQuery.trim()) {
                router.setParams({ name: localSearchQuery.trim() });
              }
            }}
          />
          {localSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setLocalSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <ThemedText style={styles.loadingText}>Loading products...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setIsLoading(true);
              setError(null);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderCard}
          keyExtractor={(item, index) => item.id?.toString() || item.slug || index.toString()}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={products.length > 0 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
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
        onReset={() => setFilters({})}
        onApply={(f) => {
          setFilters(f);
          setFilterVisible(false);
          // Example: navigate with applied filters (optional)
          // router.setParams?.(f as any);
        }}
        initial={{
          category: selectedCategory === 'all' ? 'All' : selectedCategory,
        }}
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
  controlRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  controlText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E88E5',
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortButtonActive: {
    backgroundColor: '#1E88E5',
    borderColor: '#1E88E5',
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
  },
  columnWrapper: {
    gap: CARD_GUTTER,
    marginBottom: CARD_GUTTER,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: CARD_WIDTH,
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
});
