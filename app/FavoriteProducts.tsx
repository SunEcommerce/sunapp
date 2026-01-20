import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchWishlistProducts } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

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

const STORAGE_KEY = 'wishlist_products';

export default function FavoriteProducts() {
  const themeContext = useContext(ThemeContext);
  const router = useRouter();
  
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  if (!themeContext) {
    return null;
  }
  
  const { colorScheme } = themeContext;
  const themeColors = Colors[colorScheme];

  useEffect(() => {
    loadWishlistProducts();
  }, []);

  const loadWishlistProducts = async () => {
    try {
      // First check storage for cached data
      const cachedData = await AsyncStorage.getItem(STORAGE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setProducts(parsed);
      }

      // Then fetch fresh data from API
      const response = await fetchWishlistProducts();
      if (response?.data) {
        setProducts(response.data);
        // Store in cache
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(response.data));
      }
    } catch (error) {
      console.error('Failed to load wishlist products:', error);
      Alert.alert('Error', 'Failed to load favorite products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadWishlistProducts();
    setRefreshing(false);
  };

  const handleProductPress = (slug: string) => {
    router.push(`/ProductDetail?slug=${slug}`);
  };

  const renderProduct = ({ item }: { item: WishlistProduct }) => (
    <TouchableOpacity
      style={[styles.productCard, { backgroundColor: themeColors.background }]}
      onPress={() => handleProductPress(item.slug)}
    >
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.cover }} style={styles.productImage} />
        {item.flash_sale && (
          <View style={styles.flashSaleBadge}>
            <Text style={styles.flashSaleText}>Flash Sale</Text>
          </View>
        )}
        {item.is_offer && (
          <View style={styles.offerBadge}>
            <Text style={styles.offerText}>Offer</Text>
          </View>
        )}
        <View style={styles.wishlistBadge}>
          <Ionicons name="heart" size={20} color="#E95757" />
        </View>
      </View>
      
      <View style={styles.productInfo}>
        <ThemedText style={styles.productName} numberOfLines={2}>
          {item.name}
        </ThemedText>
        
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{item.currency_price}</Text>
          {item.discounted_price !== item.currency_price && (
            <Text style={styles.originalPrice}>{item.discounted_price}</Text>
          )}
        </View>
        
        {item.rating_star !== null && (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFB800" />
            <Text style={styles.ratingText}>
              {item.rating_star} ({item.rating_star_count})
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={80} color="#CCC" />
      <ThemedText style={styles.emptyText}>No favorite products yet</ThemedText>
      <ThemedText style={styles.emptySubtext}>
        Start adding products to your wishlist!
      </ThemedText>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Favorite Products</ThemedText>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2b5fe2" />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Favorite Products</ThemedText>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </ThemedView>
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
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 8,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  productCard: {
    flex: 1,
    margin: 6,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxWidth: '48%',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  flashSaleBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#E95757',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  flashSaleText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  offerBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFB800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  offerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  wishlistBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 6,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    minHeight: 40,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2b5fe2',
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});
