import ProductCustomSections from '@/components/ProductCustomSections';
import { Colors } from '@/constants/theme';
import { useCart } from '@/contexts/cart-context';
import { ThemeContext } from '@/contexts/theme-context';
import {
  selectCategoriesLoading,
  selectParentCategories,
  setCategoriesTree,
  setLoading
} from '@/store/categoriesSlice';
import { fetchBrands, fetchCategoryTree, fetchHotSales, fetchNewArrivals, fetchSlider } from '@/utils/api';
import { navigateToProductDetail } from '@/utils/navigation';
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
import { useDispatch, useSelector } from 'react-redux';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const { colorScheme } = useContext(ThemeContext)!;
  const { itemCount } = useCart();
  const router = useRouter();
  const dispatch = useDispatch();
  
  // Redux selectors
  const parentCategories = useSelector(selectParentCategories);
  const isLoadingCategories = useSelector(selectCategoriesLoading);

  // Create search categories dropdown from API data
  const SEARCH_CATEGORIES = [
    { label: 'All Categories', value: 'all' },
    ...parentCategories.map(cat => ({
      label: cat.name || cat.name_mm || 'Category',
      value: cat.slug || cat.id.toString(),
    }))
  ];
  
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
  const [newArrivalsData, setNewArrivalsData] = useState<any[]>([]);
  const [isLoadingNewArrivals, setIsLoadingNewArrivals] = useState(true);
  const [brandsData, setBrandsData] = useState<any[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);

  // Fetch categories from API and store in Redux
  useEffect(() => {
    const loadCategories = async () => {
      // Only fetch if we don't have categories yet
      if (parentCategories.length === 0) {
        try {
          dispatch(setLoading(true));
          const response = await fetchCategoryTree();
          const categories = response?.data || response || [];
          dispatch(setCategoriesTree(categories));
        } catch (error) {
          console.error('Failed to fetch categories:', error);
        } finally {
          dispatch(setLoading(false));
        }
      }
    };

    loadCategories();
  }, [dispatch]);

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

    const loadNewArrivals = async () => {
      try {
        setIsLoadingNewArrivals(true);
        const newArrivalResponse = await fetchNewArrivals();
        const newArrivalsData = newArrivalResponse?.data || newArrivalResponse?.products || newArrivalResponse || [];
        setNewArrivalsData(newArrivalsData);
      } catch (error) {
        console.error('Failed to fetch new arrivals:', error);
        setNewArrivalsData([]);
      } finally {
        setIsLoadingNewArrivals(false);
      }
    };

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

    loadSlider();
    loadHotSales();
    loadNewArrivals();
    loadBrands();
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
        name: searchQuery.trim(),
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
        name: '',
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
        resizeMode="cover"
      />
    </View>
  );

  const renderCategoryItem = ({ item }: { item: any }) => {
    const categoryName = item.name || item.name_mm || 'Category';
    const categoryImage = item.image || item.icon;
    const categorySlug = item.slug || '';
    
    return (
      <TouchableOpacity 
        style={styles.categoryItem}
        onPress={() => router.push({
          pathname: '/ProductList',
          params: {
            category: categorySlug,
            name: '',
            source: 'category',
          },
        })}
      >
        {categoryImage ? (
          <View style={styles.categoryIconContainer}>
            <Image 
              source={{ uri: categoryImage }} 
              style={styles.categoryIconImage}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={[styles.categoryIconContainer, { backgroundColor: Colors[colorScheme].tint + '20' }]}>
            <Ionicons name="apps-outline" size={32} color={Colors[colorScheme].tint} />
          </View>
        )}
        <Text style={[styles.categoryText, { color: Colors[colorScheme].text }]} numberOfLines={2}>
          {categoryName}
        </Text>
      </TouchableOpacity>
    );
  };

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors[colorScheme].background }]}>
        <View style={styles.logoPlaceholder}>
          {/* <Ionicons name="storefront" size={32} color={Colors[colorScheme].tint} /> */}
          <Text style={[styles.logoText, { color: Colors[colorScheme].text }]}>Sun Mobile App</Text>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Text style={[styles.categoryText, { color: Colors[colorScheme].text }]} numberOfLines={1}>
                {SEARCH_CATEGORIES.find(cat => cat.value === selectedCategory)?.label || 'All'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={Colors[colorScheme].text} style={{ marginLeft: 6 }} />
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
          {isLoadingCategories ? (
            <View style={styles.loadingProductsContainer}>
              <Text style={{ color: Colors[colorScheme].text }}>Loading categories...</Text>
            </View>
          ) : parentCategories.length > 0 ? (
            <FlatList
              data={parentCategories}
              renderItem={renderCategoryItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            />
          ) : (
            <View style={styles.emptyProductsContainer}>
              <Text style={{ color: Colors[colorScheme].text, fontSize: 14 }}>No categories available</Text>
            </View>
          )}
        </View>

        {/* Hot Sales Section */}
        {(isLoadingHotSales || hotSalesError || hotSalesData.length > 0) && (
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
        )}

        {/* New Arrival Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}>New Arrivals</Text>
            <TouchableOpacity onPress={() => handleViewAll('new_arrivals')}>
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
          ) : newArrivalsData.length > 0 ? (
            <FlatList
              data={newArrivalsData}
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

        {/* Products Custom Section(s) */}
        <ProductCustomSections />

        {/* Featured Brands Section */}
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
          ) : (
            <View style={styles.emptyProductsContainer}>
              <Text style={{ color: Colors[colorScheme].text, fontSize: 14 }}>No brands available</Text>
            </View>
          )}
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
    boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  categoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    minWidth: 90,
    flex: 1,
    justifyContent: 'space-between',
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
    overflow: 'hidden',
  },
  categoryIconImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  },
});
