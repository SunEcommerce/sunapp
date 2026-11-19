import { TextInput } from '@/components/ui/text-input';
import { IconButton } from '@/components/ui/icon-button';
import CategoriesSection from '@/components/CategoriesSection';
import { HomeSkeleton } from '@/components/HomeSkeleton';
import FeaturedBrandsSection from '@/components/FeaturedBrandsSection';
import HotSalesSection from '@/components/HotSalesSection';
import NewArrivalsSection from '@/components/NewArrivalsSection';
import ProductCustomSections from '@/components/ProductCustomSections';
import PromotionSection from '@/components/PromotionSection';
import { Colors } from '@/constants/theme';
import { useTabContentInset } from '@/hooks/use-tab-content-inset';
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
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';

// Match the desktop slider conversion in sunapi/app/Models/Slider.php.
const BANNER_ASPECT_RATIO = 1689 / 600;

export default function HomeScreen() {
  const tabContentInset = useTabContentInset();
  const { colorScheme } = useContext(ThemeContext)!;
  const { itemCount } = useCart();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [bannerWidth, setBannerWidth] = useState(width);
  const bannerHeight = bannerWidth / BANNER_ASPECT_RATIO;
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
  const [searchVisible, setSearchVisible] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollTop = useRef(0);
  const headerScroll = useRef(new Animated.Value(0)).current;
  const refreshing = refreshKey > 0 && isLoadingSlider;
  const refresh = useCallback(() => {
    setIsLoadingSlider(true);
    setRefreshKey(key => key + 1);
  }, []);
  // RefreshControl handles native gestures; web needs its own top-edge pull gesture.
  const pullResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => Platform.OS === 'web' && !isLoadingSlider &&
      scrollTop.current <= 0 && gesture.dy > 12 && gesture.dy > Math.abs(gesture.dx) * 1.5,
    onPanResponderMove: (_, gesture) => setPullDistance(Math.min(Math.max(gesture.dy, 0) * 0.45, 64)),
    onPanResponderRelease: (_, gesture) => {
      setPullDistance(0);
      if (gesture.dy >= 80) refresh();
    },
    onPanResponderTerminate: () => setPullDistance(0),
  }), [isLoadingSlider, refresh]);

  const toggleSearch = () => {
    if (searchVisible) {
      Keyboard.dismiss();
      setShowCategoryDropdown(false);
    }
    setSearchVisible(visible => !visible);
  };

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
    Keyboard.dismiss();
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
    <View style={[styles.bannerItem, { width: bannerWidth, height: bannerHeight }]}>
      <Image 
        source={{ uri: item.image || item.image_url || item.url }} 
        style={styles.bannerImage}
        resizeMode="contain"
      />
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
      {/* Header */}
      <Animated.View style={[styles.header, { backgroundColor: Colors[colorScheme].background,
        height: headerScroll.interpolate({ inputRange: [0, 80], outputRange: [76, 48], extrapolate: 'clamp' }) }]}>
        <Animated.Image source={require('@/assets/images/sun-logo.png')} style={[styles.logo, {
          width: headerScroll.interpolate({ inputRange: [0, 80], outputRange: [90, 54], extrapolate: 'clamp' }),
          height: headerScroll.interpolate({ inputRange: [0, 80], outputRange: [60, 36], extrapolate: 'clamp' }),
        }]}
          resizeMode="contain" accessible accessibilityRole="image" accessibilityLabel="Sun Mobile" />
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton label={searchVisible ? 'Close search' : 'Open search'} onPress={toggleSearch}
            accessibilityState={{ expanded: searchVisible }}>
            <Ionicons name={searchVisible ? 'close' : 'search-outline'} size={24} color={Colors[colorScheme].text} />
          </IconButton>
          <TouchableOpacity style={styles.cartButton} onPress={handleCartPress} accessibilityRole="button" accessibilityLabel={`Cart, ${itemCount} items`}>
            <Ionicons name="cart-outline" size={24} color={Colors[colorScheme].text} />
            {itemCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{itemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Search Bar */}
      {searchVisible && <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: Colors[colorScheme].card, borderColor: Colors[colorScheme].icon + '40' }]}>
          <TouchableOpacity 
            accessibilityRole="button"
            accessibilityLabel={`Choose search category, ${SEARCH_CATEGORIES.find(cat => cat.value === selectedCategory)?.label || 'All categories'}`}
            accessibilityState={{ expanded: showCategoryDropdown }}
            style={styles.categoryDropdown}
            onPress={() => setShowCategoryDropdown(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Text style={[styles.categoryText, { color: Colors[colorScheme].text }]} numberOfLines={1}>
                {selectedCategory === 'all' ? 'All' : SEARCH_CATEGORIES.find(cat => cat.value === selectedCategory)?.label || 'All'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color={Colors[colorScheme].text} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TextInput accessibilityLabel="Search products..."
            autoFocus
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
      </View>}

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
      <View style={styles.mainContent} {...(Platform.OS === 'web' ? pullResponder.panHandlers : {})}>
      {Platform.OS === 'web' && (pullDistance > 0 || refreshing) && (
        <View accessibilityRole="progressbar" accessibilityLabel={refreshing ? 'Refreshing home' : 'Pull down to refresh'}
          accessibilityState={{ busy: refreshing }} style={{ height: refreshing ? 48 : pullDistance, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors[colorScheme].tint} />
        </View>
      )}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={event => {
          const offset = Math.max(0, event.nativeEvent.contentOffset.y);
          scrollTop.current = offset;
          headerScroll.setValue(Math.min(offset, 80));
        }}
        contentContainerStyle={{ paddingBottom: tabContentInset }}
        scrollIndicatorInsets={{ bottom: tabContentInset }}
        refreshControl={Platform.OS === 'web' ? undefined : <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors[colorScheme].tint} />}>
        {/* Banner Slider */}
        <View style={styles.bannerContainer} onLayout={e => setBannerWidth(e.nativeEvent.layout.width)}>
          {isLoadingSlider ? (
            <HomeSkeleton variant="banner" label="Loading banners" height={bannerHeight} />
          ) : sliderError ? (
            <View style={[styles.bannerItem, styles.errorContainer, { minHeight: bannerHeight }]}>
              <Ionicons name="alert-circle-outline" size={32} color={Colors[colorScheme].text} />
              <Text style={{ color: Colors[colorScheme].text, marginTop: 8 }}>{sliderError}</Text>
              <TouchableOpacity onPress={refresh} accessibilityRole="button" style={{ padding: 12 }}>
                <Text style={{ color: Colors[colorScheme].tint }}>Retry banners</Text>
              </TouchableOpacity>
            </View>
          ) : sliderData.length > 0 ? (
            <FlatList
              style={{ height: bannerHeight }}
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
        <PromotionSection refreshKey={refreshKey} />
        <ProductCustomSections refreshKey={refreshKey} />

        {/* Featured Brands Section */}
        <FeaturedBrandsSection refreshKey={refreshKey} />
      </ScrollView>
      </View>
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
    paddingVertical: 2,
  },
  logo: {
    width: 54,
    height: 36,
    borderRadius: 7,
  },
  cartButton: {
    position: 'relative',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 8,
    minHeight: 44,
  },
  categoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    width: 88,
    minHeight: 44,
    flexShrink: 0,
    justifyContent: 'space-between',
  },
  categoryText: {
    fontSize: 12,
    textAlign: 'left',
    flexShrink: 1,
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
    minWidth: 0,
    fontSize: 16,
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
    height: '100%',
    borderRadius: 0,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
