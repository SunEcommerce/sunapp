import { ProductHeaderTitle } from '@/components/product-header-title';
import { BlurView } from 'expo-blur';
import { IconButton } from '@/components/ui/icon-button';
import { ProductDetailSkeleton } from '@/components/product-detail-skeleton';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useCart } from '@/contexts/cart-context';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchChildrenVariations, fetchInitialVariations, fetchProductDetails, postWishlistToggle } from '@/utils/api';
import { productGalleryImages, variationImageIndex } from '@/utils/product-gallery';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';


export default function ProductDetailScreen() {
  const router = useRouter();
  const { slug, preloadData } = useLocalSearchParams<{ slug: string; preloadData?: string }>();
  const { addToCart } = useCart();
  const themeContext = useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  const dark = colorScheme === 'dark';
  const surface = dark ? '#1b252c' : '#ffffff';
  const border = dark ? '#30414c' : '#e2e8ed';
  const accent = dark ? '#8bd8ed' : '#086b83';
  const onAccent = dark ? '#10232b' : '#ffffff';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [carouselWidth, setCarouselWidth] = useState(Math.min(width, 760));
  const galleryHeight = Math.min(carouselWidth * 0.7, 300);
  const carouselRef = useRef<ScrollView>(null);
  
  // Parse preloaded data for instant display
  const initialData = useMemo(() => {
    try { return preloadData ? JSON.parse(preloadData) : null; } catch { return null; }
  }, [preloadData]);
  
  const [product, setProduct] = useState<any>(initialData);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [isLoadingDetails, setIsLoadingDetails] = useState(!!initialData);
  const [error, setError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageIndexRef = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    carouselRef.current?.scrollTo({ x: imageIndexRef.current * carouselWidth, animated: false });
  }, [carouselWidth]);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReducedMotion(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { active = false; subscription.remove(); };
  }, []);
  const [quantity, setQuantity] = useState(1);
  const [bottomBarHeight, setBottomBarHeight] = useState(72);
  const [expandedSection, setExpandedSection] = useState<string>('description');
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<Record<number, any>>({});
  const [currentVariation, setCurrentVariation] = useState<any>(null);
  const [availableOptions, setAvailableOptions] = useState<Record<number, any[]>>({});
  const [enableAddToCart, setEnableAddToCart] = useState(false);
  const [variationNames, setVariationNames] = useState<string>('');
  const [initProduct, setInitProduct] = useState<any>(null);
  const [justAdded, setJustAdded] = useState(false);
  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 2000);
    return () => clearTimeout(timer);
  }, [justAdded]);

  // Fetch product details from API
  useEffect(() => {
    const loadProduct = async () => {
      if (!slug) {
        setError('Product not found');
        setIsLoading(false);
        return;
      }

      try {
        // Only show loading if we don't have preloaded data
        if (!initialData) {
          setIsLoading(true);
        } else {
          setIsLoading(false); // partially loaded from preload
          setIsLoadingDetails(true); // but still loading full details
        }
        setError(null);
        const response = await fetchProductDetails(slug);
        const productData = response?.data || response;
        
        if (productData) {
          setProduct(productData);
          setFavorite(productData.wishlist || false);
          
          // Set initial product values
          setInitProduct({
            sku: productData.sku,
            stock: productData.stock,
            price: productData.price,
            oldPrice: productData.old_price,
            maximum_purchase_quantity: productData.maximum_purchase_quantity
          });
          
          // Fetch initial variations if product has variations
          try {
            const variationsResponse = await fetchInitialVariations(productData.id);
            const variationsList = variationsResponse?.data || [];
            
            if (variationsList.length > 0) {
              setVariations(variationsList);
              // Initialize available options for the first attribute
              setAvailableOptions({ 0: variationsList });
              // Disable add to cart until variation is selected
              setEnableAddToCart(false);
            } else {
              // No variations, enable add to cart if stock available
              setEnableAddToCart(productData.stock > 0);
            }
          } catch (varError) {
            console.error('Failed to fetch variations:', varError);
            // Continue without variations - enable if stock available
            setEnableAddToCart(productData.stock > 0);
          }
        } else {
          setError('Product not found');
        }
      } catch (err) {
        console.error('Failed to fetch product:', err);
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setIsLoading(false);
        setIsLoadingDetails(false);
      }
    };
    loadProduct();
  }, [slug, initialData, preloadData]);

  // Reserve the same gallery and purchase-bar geometry while details are fetched.
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: surface }]} edges={['top', 'left', 'right']}>
        <View style={[styles.header, styles.glassHeader, { top: insets.top, borderBottomColor: dark ? '#ffffff18' : '#ffffff90' }]}>
        <BlurView pointerEvents="none" tint={dark ? 'dark' : 'light'} intensity={55}
          experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: dark ? '#18252c99' : '#ffffff99' }]} />
          <IconButton label="Go back" style={styles.headerButton} onPress={() => router.back()}><Ionicons name="chevron-back" size={23} color={themeColors.text} /></IconButton>
          <ThemedText style={styles.headerTitle}>Product details</ThemedText>
          <View style={styles.headerButton} />
        </View>
        <ScrollView style={[styles.scrollView, { backgroundColor: themeColors.background }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View onLayout={event => setCarouselWidth(event.nativeEvent.layout.width)}><ProductDetailSkeleton galleryHeight={galleryHeight} /></View>
          <View style={{ height: bottomBarHeight + 12 }} />
        </ScrollView>
        <View onLayout={event => setBottomBarHeight(event.nativeEvent.layout.height)} style={[styles.bottomBar, { backgroundColor: surface, borderTopColor: border, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.purchaseContent}><View style={{ flex: 1 }}><ProductDetailSkeleton variant="purchase" /></View></View>
        </View>
      </SafeAreaView>
    );
  }
  // Show error state
  if (error || !product) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: surface }]} edges={['top', 'left', 'right']}>
        <StatusBar 
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
        />
        <View style={[styles.header, { backgroundColor: surface }]}>
          <IconButton label="Go back" style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </IconButton>
          <ThemedText style={styles.headerTitle}>Error</ThemedText>
          <View style={styles.headerButton} />
        </View>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
          <Ionicons name="alert-circle-outline" size={64} color="#E53935" />
          <ThemedText style={{ marginTop: 16, fontSize: 16, textAlign: 'center' }}>
            {error || 'Product not found'}
          </ThemedText>
          <TouchableOpacity 
            accessibilityRole="button"
            style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, minHeight: 44, backgroundColor: accent, borderRadius: 12 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: onAccent, fontWeight: '600' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Parse price helper
  const parsePrice = (priceStr: string | number) => {
    if (typeof priceStr === 'number') return priceStr;
    return parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
  };

  const productPrice = parsePrice(product.currency_price || product.price || 0);
  const oldPrice = parsePrice(product.old_currency_price || product.old_price || 0);
  const productImages = Array.isArray(product.images) ? product.images : [];
  const mainImage = product.image || (productImages.length > 0 ? productImages[0] : '');
  const allImages = productGalleryImages(product);

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? '' : section));
  };

  const incrementQuantity = () => {
    setJustAdded(false);
    const maxQty = currentVariation?.maximum_purchase_quantity || initProduct?.maximum_purchase_quantity || 100;
    const currentStock = getCurrentStock();
    setQuantity((prev) => Math.min(prev + 1, Math.min(maxQty, currentStock || maxQty)));
  };
  
  const decrementQuantity = () => { setJustAdded(false); setQuantity((prev) => Math.max(prev - 1, 1)); };

  const handleVariationSelect = async (attributeIndex: number, variation: any) => {
    setJustAdded(false);
    const imageIndex = variationImageIndex(variation.product_attribute_option_id, product.images_meta, allImages);
    if (imageIndex >= 0) {
      imageIndexRef.current = imageIndex;
      setCurrentImageIndex(imageIndex);
      carouselRef.current?.scrollTo({ x: imageIndex * carouselWidth, animated: !reducedMotion });
    }
    const newSelected = { ...selectedVariations, [attributeIndex]: variation };
    setSelectedVariations(newSelected);
    
    // Clear current variation and disable add to cart temporarily
    setCurrentVariation(null);
    setEnableAddToCart(false);
    setVariationNames('');
    
    // Always try to fetch children for this variation
    try {
        
        // Build variation names from selected variations
        const selectedNames: string[] = [];
        Object.keys(newSelected).sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
          const selectedVar = newSelected[parseInt(key)];
          if (selectedVar?.product_attribute_option_name) {
            selectedNames.push(selectedVar.product_attribute_option_name);
          }
        });
        const names = selectedNames.join(' | ');
        setVariationNames(names);

      const childrenResponse = await fetchChildrenVariations(product.id, variation.id);
      const children = childrenResponse?.data || [];
      
      if (children.length > 0) {
        // This variation has children - show them at next level
        const newOptions = { ...availableOptions };
        newOptions[attributeIndex + 1] = children;
        
        // Clear all options after this level
        Object.keys(newOptions).forEach(key => {
          const keyNum = parseInt(key);
          if (keyNum > attributeIndex + 1) {
            delete newOptions[keyNum];
          }
        });
        setAvailableOptions(newOptions);
        
        // Clear selections after this level (but keep current selection)
        const clearedSelections = { ...newSelected };
        Object.keys(clearedSelections).forEach(key => {
          const keyNum = parseInt(key);
          if (keyNum > attributeIndex) {
            delete clearedSelections[keyNum];
          }
        });
        setSelectedVariations(clearedSelections);
      } else {
        // No children - this is the final variation (leaf node)
        setCurrentVariation(variation);
        
        // Build variation names from selected variations
        const selectedNames: string[] = [];
        Object.keys(newSelected).sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
          const selectedVar = newSelected[parseInt(key)];
          if (selectedVar?.product_attribute_option_name) {
            selectedNames.push(selectedVar.product_attribute_option_name);
          }
        });
        const names = selectedNames.join(' | ');
        setVariationNames(names);
        
        // Enable add to cart only if variation has stock
        setEnableAddToCart(variation.stock > 0);
        
        // Clear options after this level since no more children
        const newOptions = { ...availableOptions };
        Object.keys(newOptions).forEach(key => {
          const keyNum = parseInt(key);
          if (keyNum > attributeIndex) {
            delete newOptions[keyNum];
          }
        });
        setAvailableOptions(newOptions);
      }
    } catch (err) {
      console.error('Failed to fetch children variations:', err);
      // If fetch fails, treat as leaf node
      setCurrentVariation(variation);
      setEnableAddToCart(variation.stock > 0);
    }
  };

  const handleAddToCart = () => {
    if (!enableAddToCart) {
      return;
    }
    
    const itemPrice = getCurrentPrice();
    const itemDiscount = 0; // Calculate discount if applicable
    const itemSubtotal = itemPrice * quantity;
    const itemTax = 0; // Calculate tax if applicable
    const itemTotal = itemSubtotal - itemDiscount + itemTax;
    
    addToCart({
      productId: product.id?.toString() || product.sku || '',
      name: product.name || 'Product',
      price: itemPrice,
      quantity: quantity,
      image: mainImage,
      item_type: currentVariation ? 'ProductVariation' : 'Product',
      item_id: currentVariation ? currentVariation.id : product.id,
      sku: currentVariation?.sku || product.sku || '',
      discount: itemDiscount,
      tax: itemTax,
      subtotal: itemSubtotal,
      total: itemTotal,
      variation_names: variationNames?? '',
    });
    setJustAdded(true);
    
    // Reset after adding to cart
    if (currentVariation) {
      setSelectedVariations({});
      setCurrentVariation(null);
      setVariationNames('');
      setQuantity(1);
      
      // Reset to first level variations
      if (variations.length > 0) {
        setAvailableOptions({ 0: variations });
        setEnableAddToCart(false);
      }
    }
  };

  const getCurrentPrice = () => {
    if (currentVariation?.price) {
      return parsePrice(currentVariation.price);
    }
    return initProduct?.price ? parsePrice(initProduct.price) : productPrice;
  };

  const getCurrentStock = () => {
    if (currentVariation?.stock !== undefined) {
      return currentVariation.stock;
    }
    return initProduct?.stock || product.stock || 0;
  };

  const getCurrentOldPrice = () => {
    if (currentVariation?.old_price) {
      return parsePrice(currentVariation.old_price);
    }
    return initProduct?.oldPrice ? parsePrice(initProduct.oldPrice) : oldPrice;
  };

  const hasOffer = () => {
    return product.is_offer || product.flash_sale || false;
  };
  const quantityLimit = Math.min(currentVariation?.maximum_purchase_quantity || initProduct?.maximum_purchase_quantity || 100, getCurrentStock());

  const handleToggleFavorite = async () => {
    if (!product?.id) return;
    
    const previousState = favorite;
    // Optimistically update UI
    setFavorite(!favorite);
    
    try {
      await postWishlistToggle(product.id, !favorite);
      // Successfully toggled on backend
    } catch (err) {
      console.error('Failed to toggle wishlist:', err);
      // Revert on error
      setFavorite(previousState);
      // Optionally show error message to user
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: surface }]} edges={['top', 'left', 'right']}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      {/* Header */}
      <View style={[styles.header, styles.glassHeader, { top: insets.top, borderBottomColor: dark ? '#ffffff18' : '#ffffff90' }]}>
        <BlurView pointerEvents="none" tint={dark ? 'dark' : 'light'} intensity={55}
          experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: dark ? '#18252c99' : '#ffffff99' }]} />
        <IconButton label="Go back" style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={23} color={themeColors.text} />
        </IconButton>
        <ProductHeaderTitle name={product.name || 'Product'} color={themeColors.text} reducedMotion={reducedMotion} />
        <IconButton label={favorite ? "Remove from favorites" : "Add to favorites"} style={styles.headerButton} onPress={handleToggleFavorite}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={24} color={favorite ? '#E53935' : themeColors.text} />
        </IconButton>
      </View>

      <ScrollView style={[styles.scrollView, { backgroundColor: themeColors.background }]} contentContainerStyle={styles.content} scrollIndicatorInsets={{ bottom: bottomBarHeight }} showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={[styles.carouselContainer, { backgroundColor: surface }]} onLayout={e => setCarouselWidth(e.nativeEvent.layout.width)}>
          {allImages.length > 0 ? (
            <>
              <ScrollView
                ref={carouselRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
                  imageIndexRef.current = index;
                  setCurrentImageIndex(index);
                }}
                scrollEventThrottle={16}
              >
                {allImages.map((img:any, idx:number) => (
                  <Image key={img} source={{ uri: img }} resizeMode="contain" accessibilityLabel={`${product.name}, image ${idx + 1} of ${allImages.length}`} style={[styles.carouselImage, { backgroundColor: surface, width: carouselWidth, height: galleryHeight }]} />
                ))}
              </ScrollView>
              {/* Pagination Dots */}
              {allImages.length > 1 && (
                <View style={styles.paginationDots}>
                  {allImages.map((_:any, idx:number) => (
                    <View key={idx} style={[styles.dot, { backgroundColor: currentImageIndex === idx ? accent : border }, currentImageIndex === idx && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={{ height: galleryHeight, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="image-outline" size={48} color={themeColors.textSecondary} />
              <ThemedText style={{ color: themeColors.textSecondary, marginTop: 8 }}>No image available</ThemedText>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          {isLoadingDetails ? <ProductDetailSkeleton variant="metadata" /> : <View style={styles.metaRow}>
            <ThemedText style={[styles.sku, { color: themeColors.textSecondary }]}>SKU: {currentVariation?.sku || product.sku || 'N/A'}</ThemedText>
            <ThemedText style={[styles.stock, { color: getCurrentStock() > 0 ? themeColors.success : themeColors.textSecondary }]}>
              {getCurrentStock() > 0 ? `In stock · ${getCurrentStock()} ${product.unit || 'pcs'}` : variations.length > 0 && !currentVariation ? 'Select an option' : 'Out of stock'}
            </ThemedText>
          </View>}
          <View style={styles.priceRow}>
            <ThemedText style={styles.priceValue}>${getCurrentPrice().toFixed(2)}</ThemedText>
            {getCurrentOldPrice() > getCurrentPrice() && <ThemedText style={[styles.oldPriceValue, { color: themeColors.textSecondary }]}>${getCurrentOldPrice().toFixed(2)}</ThemedText>}
            {hasOffer() && <View style={[styles.offerBadge, { backgroundColor: dark ? '#253b46' : '#eaf4f8' }]}>
              <Text style={{ color: accent, fontSize: 10, lineHeight: 16, fontWeight: '700' }}>OFFER</Text>
            </View>}
          </View>
        </View>

        {/* Product Variations */}
        {isLoadingDetails && <ProductDetailSkeleton variant="details" />}
        {Object.entries(availableOptions).map(([index, options]) => {
          const attributeIndex = parseInt(index);
          const firstOption = options[0];
          const attributeName = firstOption?.product_attribute?.name || firstOption.product_attribute_name;
          
          return (
            <View key={index} style={[styles.variantSection, { backgroundColor: surface, borderColor: border }]}>
              <ThemedText style={styles.variantLabel}>{attributeName}</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.variationRow}>
                  {options.map((variation: any) => {
                    const isSelected = selectedVariations[attributeIndex]?.id === variation.id;
                    const optionName = variation.product_attribute_option_name;
                    return (
                      <TouchableOpacity
                        key={variation.id}
                        style={[
                          styles.variationChip,
                          { backgroundColor: themeColors.background, borderColor: border },
                          isSelected && { backgroundColor: dark ? '#253b46' : '#eaf4f8', borderColor: accent }
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={optionName}
                        accessibilityState={{ selected: isSelected }}
                        onPress={() => handleVariationSelect(attributeIndex, variation)}
                      >
                        <Text style={[styles.variationText, { color: isSelected ? accent : themeColors.textSecondary }]}>
                          {optionName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          );
        })}

        {/* Description */}
        {product.details? (
          <View style={[styles.expandableSection, { backgroundColor: surface, borderColor: border }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: expandedSection === 'description' }} style={styles.expandableHeader} onPress={() => toggleSection('description')}>
              <ThemedText style={styles.expandableTitle}>Description</ThemedText>
              <Ionicons
                name={expandedSection === 'description' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={themeColors.icon}
              />
            </TouchableOpacity>
            {expandedSection === 'description' && (
              <View style={[styles.expandableBody, { borderTopColor: border }]}>
                <ThemedText style={[styles.descriptionText, { color: themeColors.textSecondary }]}>{product.details.replace(/<[^>]*>/g, '')}</ThemedText>
              </View>
            )}
          </View>
        ): <></>}

        {/* Feature Description */}
        {product.feature_description? (
          <View style={[styles.expandableSection, { backgroundColor: surface, borderColor: border }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: expandedSection === 'feature_description' }} style={styles.expandableHeader} onPress={() => toggleSection('feature_description')}>
              <ThemedText style={styles.expandableTitle}>Feature Description</ThemedText>
              <Ionicons
                name={expandedSection === 'feature_description' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={themeColors.icon}
              />
            </TouchableOpacity>
            {expandedSection === 'feature_description' && (
              <View style={[styles.expandableBody, { borderTopColor: border }]}>
                <ThemedText style={[styles.descriptionText, { color: themeColors.textSecondary }]}>{product.feature_description.replace(/<[^>]*>/g, '')}</ThemedText>
              </View>
            )}
          </View>
        ): <></>}

        {/* Specifications */}
        {product.specifications && product.specifications.length > 0 && (
          <View style={[styles.expandableSection, { backgroundColor: surface, borderColor: border }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: expandedSection === 'specifications' }} style={styles.expandableHeader} onPress={() => toggleSection('specifications')}>
              <ThemedText style={styles.expandableTitle}>Specifications</ThemedText>
              <Ionicons
                name={expandedSection === 'specifications' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={themeColors.icon}
              />
            </TouchableOpacity>
            {expandedSection === 'specifications' && (
              <View style={[styles.expandableBody, { borderTopColor: border }]}>
                {product.specifications.map((spec: any, idx: number) => (
                  <View key={idx} style={[styles.specRow, { borderBottomColor: border }]}>
                    <ThemedText style={[styles.specKey, { color: themeColors.textSecondary }]}>{spec.key || spec.name}:</ThemedText>
                    <ThemedText style={styles.specValue}>{spec.value}</ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Shipping and Return */}
        {product.shipping_and_return && (
          <View style={[styles.expandableSection, { backgroundColor: surface, borderColor: border }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: expandedSection === 'shipping' }} style={styles.expandableHeader} onPress={() => toggleSection('shipping')}>
              <ThemedText style={styles.expandableTitle}>Shipping & Return</ThemedText>
              <Ionicons
                name={expandedSection === 'shipping' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={themeColors.icon}
              />
            </TouchableOpacity>
            {expandedSection === 'shipping' && (
              <View style={[styles.expandableBody, { borderTopColor: border }]}>
                <ThemedText style={[styles.descriptionText, { color: themeColors.textSecondary }]}>{product.shipping_and_return.replace(/<[^>]*>/g, '')}</ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={[styles.bottomSpacer, { height: bottomBarHeight + 12 }]} />
      </ScrollView>

      {/* One-row purchase controls; price stays with the product information. */}
      <View onLayout={event => setBottomBarHeight(event.nativeEvent.layout.height)} style={[styles.bottomBar, { backgroundColor: surface, borderTopColor: border, paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.purchaseContent}>
          {isLoadingDetails ? <View style={{ flex: 1 }}><ProductDetailSkeleton variant="purchase" /></View> : <>
            <View style={[styles.quantitySelector, { backgroundColor: themeColors.background, borderColor: border }]}>
              <IconButton label="Decrease quantity" disabled={quantity <= 1 || getCurrentStock() === 0} style={[styles.quantityButton, quantity <= 1 && { opacity: 0.35 }]} onPress={decrementQuantity}>
                <Ionicons name="remove" size={17} color={accent} />
              </IconButton>
              <ThemedText style={styles.quantityValue}>{quantity}</ThemedText>
              <IconButton label="Increase quantity" disabled={quantity >= quantityLimit} style={[styles.quantityButton, quantity >= quantityLimit && { opacity: 0.35 }]} onPress={incrementQuantity}>
                <Ionicons name="add" size={17} color={accent} />
              </IconButton>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Add to cart" accessibilityState={{ disabled: !enableAddToCart }}
              style={[styles.addToCartButton, { backgroundColor: enableAddToCart ? accent : (dark ? '#34434e' : '#e2e8ed') }]}
              onPress={handleAddToCart} disabled={!enableAddToCart}>
              <Ionicons name={justAdded ? 'checkmark' : 'bag-add-outline'} size={19} color={enableAddToCart ? onAccent : themeColors.textSecondary} />
              <Text accessibilityLiveRegion="polite" style={[styles.addToCartText, { color: enableAddToCart ? onAccent : themeColors.textSecondary }]}>
                {justAdded ? 'Added to cart' : !currentVariation && variations.length > 0 ? 'Select options' : getCurrentStock() === 0 ? 'Out of stock' : 'Add to cart'}
              </Text>
            </TouchableOpacity>
          </>}
        </View>
      </View>    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { width: '100%', maxWidth: 760, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 0 },
  glassHeader: { position: 'absolute', left: 0, right: 0, zIndex: 10, overflow: 'hidden', borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center', paddingHorizontal: 8 },
  scrollView: { flex: 1 },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  carouselContainer: { paddingTop: 44, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' },
  carouselImage: { backgroundColor: '#ffffff' },
  paginationDots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 3 },
  dotActive: { width: 18 },
  infoSection: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 2 },
  offerBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 },
  sku: { fontSize: 11, lineHeight: 17 },
  stock: { fontSize: 11, lineHeight: 17, fontWeight: '600' },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 },
  priceValue: { fontSize: 23, lineHeight: 29, fontWeight: '700', letterSpacing: -0.6 },
  oldPriceValue: { fontSize: 13, lineHeight: 20, textDecorationLine: 'line-through' },
  variantSection: { padding: 14, marginTop: 12, marginHorizontal: 16, borderRadius: 18, borderWidth: 1 },
  variantLabel: { fontSize: 13, lineHeight: 20, fontWeight: '600', marginBottom: 10 },
  variationRow: { flexDirection: 'row', gap: 8 },
  variationChip: { minHeight: 44, minWidth: 64, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  variationText: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  expandableSection: { marginTop: 12, marginHorizontal: 16, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  expandableHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, minHeight: 48, gap: 10 },
  expandableTitle: { flex: 1, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  expandableBody: { paddingHorizontal: 16, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth },
  descriptionText: { fontSize: 14, lineHeight: 22, marginTop: 12 },
  specRow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  specKey: { flex: 1, fontSize: 12, lineHeight: 20, fontWeight: '500' },
  specValue: { flex: 2, fontSize: 12, lineHeight: 20 },
  bottomSpacer: { height: 72 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, boxShadow: '0px -3px 16px rgba(0, 0, 0, 0.04)', elevation: 6 },
  purchaseContent: { width: '100%', maxWidth: 728, alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  quantitySelector: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  quantityButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  quantityValue: { fontSize: 14, lineHeight: 20, fontWeight: '600', minWidth: 24, paddingHorizontal: 2, textAlign: 'center' },
  addToCartButton: { flex: 1, minWidth: 140, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12 },
  addToCartText: { fontSize: 14, lineHeight: 20, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
});
