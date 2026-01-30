import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchProductSections } from '@/utils/api';
import { navigateToProductDetail } from '@/utils/navigation';
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

interface Product {
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

interface ProductSection {
  id: number;
  name: string;
  slug: string;
  status: number;
  products: Product[];
}

export default function ProductCustomSections() {
  const { colorScheme } = useContext(ThemeContext)!;
  const router = useRouter();
  const [sections, setSections] = useState<ProductSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProductSections();
  }, []);

  const loadProductSections = async () => {
    try {
      setIsLoading(true);
      const response = await fetchProductSections();
      const sectionsData = response?.data || response || [];
      // Filter only active sections (status === 5) with products
      const activeSections = sectionsData.filter(
        (section: ProductSection) => section.status === 5 && section.products && section.products.length > 0
      );
      setSections(activeSections);
    } catch (error) {
      console.error('Failed to fetch product sections:', error);
      setSections([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAll = (sectionSlug: string) => {
    router.push({
      pathname: '/ProductList',
      params: {
        section: sectionSlug,
        category: 'all',
        name: '',
        source: 'section',
      },
    });
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const imageUrl = item.cover;
    const title = item.name || 'Product';
    const slug = item.slug || '';

    // Parse price strings
    const parsePrice = (priceStr: string | number) => {
      if (typeof priceStr === 'number') return priceStr;
      return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
    };

    const discountedPrice = parsePrice(item.discounted_price);
    const regularPrice = parsePrice(item.currency_price);

    // Show discount badge if it's a flash sale or offer
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

  const renderSection = ({ item }: { item: ProductSection }) => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>{item.name}</Text>
        <TouchableOpacity onPress={() => handleViewAll(item.slug)}>
          <Text style={[styles.viewAllText, { color: Colors[colorScheme].tint }]}>View All</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={item.products}
        renderItem={renderProductItem}
        keyExtractor={(product) => product.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productList}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: Colors[colorScheme].text }}>Loading sections...</Text>
      </View>
    );
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <View>
      {sections.map((section) => (
        <View key={section.id} style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>{section.name}</Text>
            <TouchableOpacity onPress={() => handleViewAll(section.slug)}>
              <Text style={[styles.viewAllText, { color: Colors[colorScheme].tint }]}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={section.products}
            renderItem={renderProductItem}
            keyExtractor={(product) => product.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productList}
          />
        </View>
      ))}
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
});
