import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchBrands } from '@/utils/api';
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

export default function FeaturedBrandsSection() {
  const { colorScheme } = useContext(ThemeContext)!;
  const router = useRouter();
  const [brandsData, setBrandsData] = useState<any[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      setIsLoadingBrands(true);
      const brandsResponse = await fetchBrands();
      const brands = brandsResponse?.data || brandsResponse?.brands || brandsResponse || [];
      setBrandsData(brands);
    } catch (error) {
      console.error('Failed to fetch brands:', error);
      setBrandsData([]);
    } finally {
      setIsLoadingBrands(false);
    }
  };

  const renderBrandItem = ({ item }: { item: any }) => {
    const logoUrl = item.cover || item.thumb || 'https://placehold.co/100x100/png?text=Brand';
    const brandName = item.name || 'Brand';
    const brandSlug = item.slug || '';

    return (
      <TouchableOpacity
        style={styles.brandCard}
        onPress={() => router.push({
          pathname: '/ProductList',
          params: {
            brand: brandSlug,
            category: 'all',
            q: '',
            source: 'brand',
          },
        })}
      >
        <Image source={{ uri: logoUrl }} style={styles.brandLogo} resizeMode="contain" />
      </TouchableOpacity>
    );
  };

  if (!isLoadingBrands && brandsData.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>Featured Brands</Text>
      {isLoadingBrands ? (
        <View style={styles.loadingProductsContainer}>
          <Text style={{ color: Colors[colorScheme].text }}>Loading brands...</Text>
        </View>
      ) : brandsData.length > 0 ? (
        <FlatList
          data={brandsData}
          renderItem={renderBrandItem}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.brandList}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  loadingProductsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 120,
    paddingHorizontal: 16,
  },
  brandList: {
    paddingHorizontal: 16,
  },
  brandCard: {
    marginRight: 6,
    width: 110,
    height: 110,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  brandLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});
