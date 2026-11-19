import { IconButton } from '@/components/ui/icon-button';
import CategoriesSection from '@/components/CategoriesSection';
import FeaturedBrandsSection from '@/components/FeaturedBrandsSection';
import HotSalesSection from '@/components/HotSalesSection';
import NewArrivalsSection from '@/components/NewArrivalsSection';
import ProductCustomSections from '@/components/ProductCustomSections';
import { Colors } from '@/constants/theme';
import { useCart } from '@/contexts/cart-context';
import { ThemeContext } from '@/contexts/theme-context';
import {
  selectParentCategories,
  setCategoriesTree,
  setLoading
} from '@/store/categoriesSlice';
import { fetchCategoryTree, fetchSlider } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useContext, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';


export default function HomeScreen() {
  const { colorScheme } = useContext(ThemeContext)!;
  const { itemCount } = useCart();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [bannerWidth, setBannerWidth] = useState(width);
  const dispatch = useDispatch();
  
  // Redux selectors
  const parentCategories = useSelector(selectParentCategories);

  // Create search categories dropdown from API data
  const SEARCH_CATEGORIES = [
    { label: 'All Categories', value: 'all' },
    ...parentCategories.map(cat => ({
      label: cat.name || cat.name_mm || 'Category',
      value: cat.slug || cat.id.toString(),
    }))
  ];
  
  const flatListRef = useRef<FlatList>(null);
  const currentIndex = useRef(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [sliderData, setSliderData] = useState<any[]>([]);
  const [isLoadingSlider, setIsLoadingSlider] = useState(true);
  const [sliderError, setSliderError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(key => key + 1);

  // Fetch categories from API and store in Redux
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoryError(null);
        dispatch(setLoading(true));
        const response = await fetchCategoryTree();
        const categories = response?.data || response || [];
        dispatch(setCategoriesTree(categories));
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        setCategoryError('Could not load categories. Pull down to retry.');
      } finally {
        dispatch(setLoading(false));
      }
    };

    loadCategories();
  }, [dispatch, refreshKey]);

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

    loadSlider();
  }, [refreshKey]);

  // Auto-scroll banner
  useEffect(() => {
    if (sliderData.length === 0) return;
    
    const interval = setInterval(() => {
      currentIndex.current = (currentIndex.current + 1) % sliderData.length;
      flatListRef.current?.scrollToOffset({
        offset: currentIndex.current * bannerWidth,
        animated: true,
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [sliderData, bannerWidth]);

  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: currentIndex.current * bannerWidth, animated: false });
  }, [bannerWidth]);

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

  const handleCategorySelect = (value: string) => {
    setSelectedCategory(value);
    setShowCategoryDropdown(false);
  };

  const renderBannerItem = ({ item }: { item: any }) => (
    <View style={[styles.bannerItem, { width: bannerWidth }]}>
      <Image 
        source={{ uri: item.image || item.image_url || item.url }} 
        style={styles.bannerImage}
        resizeMode="cover"
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: Colors[colorScheme].background }]}>
        <View style={styles.logoPlaceholder}>
          <Text style={[styles.logoText, { color: Colors[colorScheme].text }]}>Sun Mobile App</Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton label="Refresh home" onPress={refresh} disabled={isLoadingSlider}>
            <Ionicons name="refresh" size={24} color={Colors[colorScheme].text} />
          </IconButton>
          <TouchableOpacity style={styles.cartButton} onPress={handleCartPress} accessibilityRole="button" accessibilityLabel={`Cart, ${itemCount} items`}>
            <Ionicons name="cart-outline" size={28} color={Colors[colorScheme].text} />
            {itemCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{itemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: Colors[colorScheme].background }]}>
          <TouchableOpacity 
            accessibilityRole="button"
            accessibilityLabel="Choose search category"
            accessibilityState={{ expanded: showCategoryDropdown }}
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

          <View style={styles.divider} />

          <TextInput accessibilityLabel="Search products..."
            style={[styles.searchInput, { color: Colors[colorScheme].text }]}
            placeholder="Search products..."
            placeholderTextColor={Colors[colorScheme].text + '80'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />

          <IconButton label="Search products" style={styles.searchButton} onPress={handleSearch}>
            <Ionicons name="search" size={20} color={Colors[colorScheme].tint} />
          </IconButton>
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
              <IconButton label="Close categories" onPress={() => setShowCategoryDropdown(false)}>
                <Ionicons name="close" size={24} color={Colors[colorScheme].text} />
              </IconButton>
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
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshKey > 0 && isLoadingSlider} onRefresh={refresh} tintColor={Colors[colorScheme].tint} />}>
        {/* Banner Slider */}
        <View style={styles.bannerContainer} onLayout={e => setBannerWidth(e.nativeEvent.layout.width)}>
          {isLoadingSlider ? (
            <View style={[styles.bannerItem, styles.loadingContainer]}>
              <Text style={{ color: Colors[colorScheme].text }}>Loading banners...</Text>
            </View>
          ) : sliderError ? (
            <View style={[styles.bannerItem, styles.errorContainer]}>
              <Ionicons name="alert-circle-outline" size={32} color={Colors[colorScheme].text} />
              <Text style={{ color: Colors[colorScheme].text, marginTop: 8 }}>{sliderError}</Text>
              <TouchableOpacity onPress={refresh} accessibilityRole="button" style={{ padding: 12 }}>
                <Text style={{ color: Colors[colorScheme].tint }}>Retry banners</Text>
              </TouchableOpacity>
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
        {categoryError ? <TouchableOpacity onPress={refresh} accessibilityRole="button" style={{ padding: 16 }}><Text style={{ color: Colors[colorScheme].text }}>{categoryError}</Text><Text style={{ color: Colors[colorScheme].tint }}>Retry categories</Text></TouchableOpacity> : <CategoriesSection />}

        {/* Hot Sales Section */}
        <HotSalesSection refreshKey={refreshKey} />

        {/* New Arrival Section */}
        <NewArrivalsSection refreshKey={refreshKey} />

        {/* Products Custom Section(s) */}
        <ProductCustomSections refreshKey={refreshKey} />

        {/* Featured Brands Section */}
        <FeaturedBrandsSection refreshKey={refreshKey} />
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
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    width: '100%',
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
});
