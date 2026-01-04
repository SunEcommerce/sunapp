import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Sample data for banners
const BANNERS = [
  { id: '1', image: 'https://placehold.co/800x300/png?text=Banner+11' },
  { id: '2', image: 'https://placehold.co/800x300/png?text=Banner+22' },
  { id: '3', image: 'https://placehold.co/800x300/png?text=Banner+33' },
];

// Sample data for categories
const CATEGORIES = [
  { id: '1', name: 'Electronics', icon: 'laptop-outline' },
  { id: '2', name: 'Fashion', icon: 'shirt-outline' },
  { id: '3', name: 'Home', icon: 'home-outline' },
  { id: '4', name: 'Sports', icon: 'basketball-outline' },
  { id: '5', name: 'Books', icon: 'book-outline' },
  { id: '6', name: 'Toys', icon: 'game-controller-outline' },
  { id: '7', name: 'Beauty', icon: 'heart-outline' },
  { id: '8', name: 'Food', icon: 'fast-food-outline' },
];

// Sample data for hot sales products
const HOT_SALES = [
  {
    id: '1',
    title: 'Premium Wireless Headphones',
    brand: 'Audio Max',
    image: 'https://placehold.co/200x200/png?text=Product+1',
    originalPrice: 199.99,
    price: 149.99,
    discount: '25% OFF',
  },
  {
    id: '2',
    title: 'Smart Watch Pro',
    brand: 'TechFit',
    image: 'https://placehold.co/200x200/png?text=Product+2',
    originalPrice: 299.99,
    price: 199.99,
    discount: '33% OFF',
  },
  {
    id: '3',
    title: 'Portable Power Bank',
    brand: 'PowerXL',
    image: 'https://placehold.co/200x200/png?text=Product+3',
    originalPrice: 79.99,
    price: 49.99,
    discount: '38% OFF',
  },
  {
    id: '4',
    title: 'USB-C Fast Charger',
    brand: 'ChargePro',
    image: 'https://placehold.co/200x200/png?text=Product+4',
    originalPrice: 59.99,
    price: 39.99,
    discount: '33% OFF',
  },
];

// Sample data for featured brands
const FEATURED_BRANDS = [
  { id: '1', name: 'Sony', logo: 'https://placehold.co/100x100/png?text=Sony' },
  { id: '2', name: 'Samsung', logo: 'https://placehold.co/100x100/png?text=Samsung' },
  { id: '3', name: 'Apple', logo: 'https://placehold.co/100x100/png?text=Apple' },
  { id: '4', name: 'LG', logo: 'https://placehold.co/100x100/png?text=LG' },
  { id: '5', name: 'Canon', logo: 'https://placehold.co/100x100/png?text=Canon' },
  { id: '6', name: 'Nikon', logo: 'https://placehold.co/100x100/png?text=Nikon' },
];

export default function HomeScreen() {
  const { colorScheme } = useContext(ThemeContext)!;
  const router = useRouter();
  const [cartItemCount] = useState(5);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % BANNERS.length;
        flatListRef.current?.scrollToOffset({
          offset: nextIndex * SCREEN_WIDTH,
          animated: true,
        });
        return nextIndex;
      });
    }, 3000); // Change banner every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const handleCartPress = () => {
    router.push('/(tabs)/cart');
  };

  const renderBannerItem = ({ item }: { item: typeof BANNERS[0] }) => (
    <View style={styles.bannerItem}>
      <Image source={{ uri: item.image }} style={styles.bannerImage} />
    </View>
  );

  const renderCategoryItem = ({ item }: { item: typeof CATEGORIES[0] }) => (
    <TouchableOpacity style={styles.categoryItem}>
      <View style={[styles.categoryIconContainer, { backgroundColor: Colors[colorScheme].tint + '20' }]}>
        <Ionicons name={item.icon as any} size={32} color={Colors[colorScheme].tint} />
      </View>
      <Text style={[styles.categoryText, { color: Colors[colorScheme].text }]}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }: { item: typeof HOT_SALES[0] }) => (
    <View style={styles.productCard}>
      <View style={styles.productImageContainer}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{item.discount}</Text>
        </View>
      </View>
      <View style={styles.productInfo}>
        <Text style={[styles.productTitle, { color: Colors[colorScheme].text }]}>{item.title}</Text>
        <Text style={styles.productBrand}>{item.brand}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
          <Text style={styles.originalPrice}>${item.originalPrice.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );

  const renderBrandItem = ({ item }: { item: typeof FEATURED_BRANDS[0] }) => (
    <TouchableOpacity style={styles.brandCard}>
      <Image source={{ uri: item.logo }} style={styles.brandLogo} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors[colorScheme].background }]}>
        <View style={styles.logoPlaceholder}>
          <Ionicons name="storefront" size={32} color={Colors[colorScheme].tint} />
          <Text style={[styles.logoText, { color: Colors[colorScheme].text }]}>SunApp</Text>
        </View>
        
        <TouchableOpacity style={styles.cartButton} onPress={handleCartPress}>
          <Ionicons name="cart-outline" size={28} color={Colors[colorScheme].text} />
          {cartItemCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* Banner Slider */}
        <View style={styles.bannerContainer}>
          <FlatList
            ref={flatListRef}
            data={BANNERS}
            renderItem={renderBannerItem}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            decelerationRate="fast"
            contentContainerStyle={styles.bannerList}
          />
        </View>

        {/* Category Section */}
        <View style={styles.sectionContainer}>
          <FlatList
            data={CATEGORIES}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          />
        </View>

        {/* Hot Sales Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>Hot Sales</Text>
            <TouchableOpacity>
              <Text style={[styles.viewAllText, { color: Colors[colorScheme].tint }]}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={HOT_SALES}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productList}
          />
        </View>

        {/* New Arrival Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>New Arrival</Text>
            <TouchableOpacity>
              <Text style={[styles.viewAllText, { color: Colors[colorScheme].tint }]}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={HOT_SALES}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productList}
          />
        </View>

        {/* Featured Brands Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>Featured Brands</Text>
          <FlatList
            data={FEATURED_BRANDS}
            renderItem={renderBrandItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.brandList}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  logoPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  cartButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    paddingBottom: 26,
  },
  bannerContainer: {
    marginTop: 0,
  },
  bannerList: {
    paddingHorizontal: 0,
  },
  bannerItem: {
    width: SCREEN_WIDTH,
  },
  bannerImage: {
    width: '100%',
    height: 200,
    borderRadius: 0,
    resizeMode: 'cover',
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryList: {
    paddingHorizontal: 16,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
    paddingLeft: 2,
    marginBottom: 12,
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
    resizeMode: 'cover',
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
  productBrand: {
    fontSize: 11,
    color: '#999',
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  brandList: {
    paddingHorizontal: 16,
  },
  brandCard: {
    marginRight: 16,
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
    resizeMode: 'contain',
  },
});
