import { Colors } from '@/constants/theme';
import { useCart } from '@/contexts/cart-context';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchHotSales, fetchSlider } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// Search categories for dropdown
const SEARCH_CATEGORIES = [
  { label: 'All Categories', value: 'all' },
  { label: 'Electronics', value: 'electronics' },
  { label: 'Fashion', value: 'fashion' },
  { label: 'Home', value: 'home' },
  { label: 'Sports', value: 'sports' },
  { label: 'Books', value: 'books' },
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
  const { itemCount } = useCart();
  const router = useRouter();
  const [cartItemCount] = useState(5);
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [sliderData, setSliderData] = useState<any[]>([]);
  const [isLoadingSlider, setIsLoadingSlider] = useState(true);
  const [sliderError, setSliderError] = useState<string | null>(null);
  const [hotSalesData, setHotSalesData] = useState<any[]>([]);
  const [isLoadingHotSales, setIsLoadingHotSales] = useState(true);
  const [hotSalesError, setHotSalesError] = useState<string | null>(null);

  // Fetch slider data from API
  useEffect(() => {
    const loadSlider = async () => {
      try {
        setIsLoadingSlider(true);
        setSliderError(null);
        const response = await fetchSlider();
        const slides = response?.data || response?.sliders || response || [];
        setSliderData(slides);
      } catch (error) {
        console.error('Failed to fetch slider:', error);
        setSliderError(error instanceof Error ? error.message : 'Failed to load banners');
        setSliderData([]);
      } finally {
        setIsLoadingSlider(false);
      }
    };

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

    loadSlider();
    loadHotSales();
  }, []);

  useEffect(() => {
    if (sliderData.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % sliderData.length;
        flatListRef.current?.scrollToOffset({
          offset: nextIndex * SCREEN_WIDTH,
          animated: true,
        });
        return nextIndex;
      });
    }, 3000); // Change banner every 3 seconds

    return () => clearInterval(interval);
  }, [sliderData]);

  const handleCartPress = () => {
    router.push('/(tabs)/cart');
  };

  const handleSearch = () => {
    setShowCategoryDropdown(false);
    router.push({
      pathname: '/ProductList',
      params: {
        category: selectedCategory,
        q: searchQuery.trim(),
        source: 'search',
      },
    });
  };

  const handleViewAll = (source: string) => {
    setShowCategoryDropdown(false);
    router.push({
      pathname: '/ProductList',
      params: {
        category: 'all',
        q: '',
        source,
      },
    });
  };

  const handleCategorySelect = (value: string) => {
    setSelectedCategory(value);
    setShowCategoryDropdown(false);
  };

  const renderBannerItem = ({ item }: { item: any }) => (
    <View style={styles.bannerItem}>
      <Image 
        source={{ uri: item.image || item.image_url || item.url }} 
        style={styles.bannerImage} 
      />
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

  const renderProductItem = ({ item }: { item: any }) => {
    // Handle API response structure
    const imageUrl = item.cover || item.image || item.image_url || item.thumbnail || item.url;
    const title = (item.name || item.title || 'Product').toString().trim();
    const brand = (item.brand || item.brand_name || '').toString().trim();
    const slug = item.slug || '';
    
    // Parse price strings (e.g., "$899.00" -> 899.00)
    const parsePrice = (priceStr: string | number) => {
      if (typeof priceStr === 'number') return priceStr;
      return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
    };
    
    const discountedPrice = parsePrice(item.discounted_price || item.sale_price || item.price || 0);
    const regularPrice = parsePrice(item.currency_price || item.regular_price || item.original_price || discountedPrice);
    
    // Show discount badge if it's a flash sale or offer
    const hasDiscount = item.flash_sale || item.is_offer || (regularPrice > discountedPrice);
    const discountPercent = hasDiscount && regularPrice > 0 
      ? Math.round(((regularPrice - discountedPrice) / regularPrice) * 100)
      : 0;
    
    return (
      <TouchableOpacity 
        style={styles.productCard} 
        onPress={() => router.push({
          pathname: '/ProductDetail',
          params: { slug }
        })} 
        activeOpacity={0.9}
      >
        <View style={styles.productImageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.productImage} />
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
          {/* <Ionicons name="storefront" size={32} color={Colors[colorScheme].tint} /> */}
          <Text style={[styles.logoText, { color: Colors[colorScheme].text }]}>SunApp</Text>
        </View>
        
        <TouchableOpacity style={styles.cartButton} onPress={handleCartPress}>
          <Ionicons name="cart-outline" size={28} color={Colors[colorScheme].text} />
          {itemCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{itemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: Colors[colorScheme].background }]}>
          {/* Category Dropdown */}
          <TouchableOpacity 
            style={styles.categoryDropdown}
            onPress={() => setShowCategoryDropdown(true)}
          >
            <Text style={[styles.categoryText, { color: Colors[colorScheme].text, marginRight: 4 }]} numberOfLines={1}>
              {SEARCH_CATEGORIES.find(cat => cat.value === selectedCategory)?.label || 'All'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors[colorScheme].text} />
          </TouchableOpacity>

          {/* Vertical Divider */}
          <View style={styles.divider} />

          {/* Search Input */}
          <TextInput
            style={[styles.searchInput, { color: Colors[colorScheme].text }]}
            placeholder="Search products..."
            placeholderTextColor={Colors[colorScheme].text + '80'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />

          {/* Search Icon */}
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Ionicons name="search" size={20} color={Colors[colorScheme].tint} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryDropdown}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryDropdown(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryDropdown(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: Colors[colorScheme].background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: Colors[colorScheme].text }]}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryDropdown(false)}>
                <Ionicons name="close" size={24} color={Colors[colorScheme].text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {SEARCH_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.value}
                  style={styles.modalItem}
                  onPress={() => handleCategorySelect(category.value)}
                >
                  <Text style={[styles.modalItemText, { color: Colors[colorScheme].text }]}>
                    {category.label}
                  </Text>
                  {selectedCategory === category.value && (
                    <Ionicons name="checkmark" size={24} color={Colors[colorScheme].tint} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>


      {/* Main Content */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
        {/* Banner Slider */}
        <View style={styles.bannerContainer}>
          {isLoadingSlider ? (
            <View style={[styles.bannerItem, styles.loadingContainer]}>
              <Text style={{ color: Colors[colorScheme].text }}>Loading banners...</Text>
            </View>
          ) : sliderError ? (
            <View style={[styles.bannerItem, styles.errorContainer]}>
              <Ionicons name="alert-circle-outline" size={32} color={Colors[colorScheme].text} />
              <Text style={{ color: Colors[colorScheme].text, marginTop: 8 }}>{sliderError}</Text>
            </View>
          ) : sliderData.length > 0 ? (
            <FlatList
              ref={flatListRef}
              data={sliderData}
              renderItem={renderBannerItem}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              decelerationRate="fast"
              contentContainerStyle={styles.bannerList}
            />
          ) : null}
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
            <TouchableOpacity onPress={() => handleViewAll('hot_sales')}>
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
          ) : hotSalesData.length > 0 ? (
            <FlatList
              data={hotSalesData}
              renderItem={renderProductItem}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productList}
            />
          ) : (
            <View style={styles.emptyProductsContainer}>
              <Text style={{ color: Colors[colorScheme].text, fontSize: 14 }}>No hot sales available</Text>
            </View>
          )}
        </View>

        {/* New Arrival Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>New Arrival</Text>
            <TouchableOpacity onPress={() => handleViewAll('new_arrival')}>
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    minWidth: 90,
  },
  categoryText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalList: {
    paddingTop: 8,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalItemText: {
    fontSize: 16,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  searchButton: {
    padding: 4,
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
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
  emptyProductsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 120,
    paddingHorizontal: 16,
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
    paddingHorizontal: 10,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 8,
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
    resizeMode: 'contain',
  },
});
