import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchHotSales } from '@/utils/api';
import { navigateToProductDetail } from '@/utils/navigation';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function HotSalesSection() {
  const { colorScheme } = useContext(ThemeContext)!;
  const router = useRouter();
  const [hotSalesData, setHotSalesData] = useState<any[]>([]);
  const [isLoadingHotSales, setIsLoadingHotSales] = useState(true);
  const [hotSalesError, setHotSalesError] = useState<string | null>(null);

  useEffect(() => {
    loadHotSales();
  }, []);

  const loadHotSales = async () => {
    try {
      setIsLoadingHotSales(true);
      setHotSalesError(null);
      const hotSalesResponse = await fetchHotSales();
      const hotSales = hotSalesResponse?.data || hotSalesResponse?.products || hotSalesResponse || [];
      setHotSalesData(hotSales);
    } catch (error) {
      console.error('Failed to fetch hot sales:', error);
      setHotSalesError(error instanceof Error ? error.message : 'Failed to load hot sales');
      setHotSalesData([]);
    } finally {
      setIsLoadingHotSales(false);
    }
  };

  const handleViewAll = () => {
    router.push({
      pathname: '/ProductList',
      params: {
        category: 'all',
        name: '',
        source: 'hot_sales',
      },
    });
  };

  const renderProductItem = ({ item }: { item: any }) => {
    const imageUrl = item.cover || item.image || item.image_url || item.thumbnail || item.url;
    const title = (item.name || item.title || 'Product').toString().trim();
    const slug = item.slug || '';

    const parsePrice = (priceStr: string | number) => {
      if (typeof priceStr === 'number') return priceStr;
      return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
    };

    const discountedPrice = parsePrice(item.discounted_price || item.sale_price || item.price || 0);
    const regularPrice = parsePrice(item.currency_price || item.regular_price || item.original_price || discountedPrice);

    const hasDiscount = item.flash_sale || item.is_offer || (regularPrice > discountedPrice);
    const discountPercent = hasDiscount && regularPrice > 0
      ? Math.round(((regularPrice - discountedPrice) / regularPrice) * 100)
      : 0;

    return (
      <TouchableOpacity
        style={styles.productCard}
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
        <View style={styles.productImageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          {hasDiscount && discountPercent > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPercent}% OFF</Text>
            </View>
          )}
        </View>
        <View style={styles.productInfo}>
          <Text style={[styles.productTitle, { color: Colors[colorScheme].text }]} numberOfLines={2}>
            {title}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>${discountedPrice.toFixed(2)}</Text>
            {regularPrice > discountedPrice && (
              <Text style={[styles.originalPrice, { marginLeft: 6 }]}>${regularPrice.toFixed(2)}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isLoadingHotSales && !hotSalesError && hotSalesData.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>Hot Sales</Text>
        <TouchableOpacity onPress={handleViewAll}>
          <Text style={[styles.viewAllText, { color: Colors[colorScheme].tint }]}>View All</Text>
        </TouchableOpacity>
      </View>
      {isLoadingHotSales ? (
        <View style={styles.loadingProductsContainer}>
          <Text style={{ color: Colors[colorScheme].text }}>Loading products...</Text>
        </View>
      ) : hotSalesError ? (
        <View style={styles.errorProductsContainer}>
          <Ionicons name="alert-circle-outline" size={24} color={Colors[colorScheme].text} />
          <Text style={{ color: Colors[colorScheme].text, marginTop: 8, fontSize: 12 }}>{hotSalesError}</Text>
        </View>
      ) : (
        <FlatList
          data={hotSalesData}
          renderItem={renderProductItem}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productList}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    paddingLeft: 2,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    paddingHorizontal: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingProductsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 120,
    paddingHorizontal: 16,
  },
  errorProductsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 120,
    paddingHorizontal: 16,
  },
  productList: {
    paddingHorizontal: 16,
  },
  productCard: {
    marginRight: 16,
    width: 160,
  },
  productImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  productImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  productInfo: {
    paddingHorizontal: 2,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 16,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  originalPrice: {
    fontSize: 11,
    color: '#CCC',
    textDecorationLine: 'line-through',
  },
});
