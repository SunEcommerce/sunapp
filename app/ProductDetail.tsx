import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useCart } from '@/contexts/cart-context';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchChildrenVariations, fetchInitialVariations, fetchProductDetails, postWishlistToggle } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const router = useRouter();
  const { slug, preloadData } = useLocalSearchParams<{ slug: string; preloadData?: string }>();
  const { addToCart } = useCart();
  const themeContext = useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  
  // Parse preloaded data for instant display
  const initialData = preloadData ? JSON.parse(preloadData as string) : null;
  
  const [product, setProduct] = useState<any>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [expandedSection, setExpandedSection] = useState<string>('description');
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedVariations, setSelectedVariations] = useState<Record<number, any>>({});
  const [currentVariation, setCurrentVariation] = useState<any>(null);
  const [availableOptions, setAvailableOptions] = useState<Record<number, any[]>>({});
  const [enableAddToCart, setEnableAddToCart] = useState(false);
  const [variationNames, setVariationNames] = useState<string>('');
  const [initProduct, setInitProduct] = useState<any>(null);

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
        if (!initialData && preloadData == null) {
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
  }, [slug]);

  // Show skeleton loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.borderColor }]}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, height: 20, backgroundColor: '#E0E0E0', borderRadius: 4, marginHorizontal: 16 }} />
          <View style={styles.headerButton} />
        </View>
        
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Skeleton Image */}
          <View style={[styles.carouselImage, { backgroundColor: '#E0E0E0' }]} />
          
          {/* Skeleton Product Info */}
          <View style={styles.infoSection}>
            <View style={{ height: 24, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 8, width: '80%' }} />
            <View style={{ height: 20, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 8, width: '60%' }} />
            <View style={{ height: 16, backgroundColor: '#E0E0E0', borderRadius: 4, width: '40%' }} />
          </View>
          
          {/* Skeleton Variations */}
          <View style={styles.variantSection}>
            <View style={{ height: 20, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 12, width: 100 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{ width: 80, height: 44, backgroundColor: '#E0E0E0', borderRadius: 8 }} />
              ))}
            </View>
          </View>
          
          {/* Skeleton Description */}
          <View style={[styles.variantSection, { marginTop: 8 }]}>
            <View style={{ height: 18, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 10, width: 120 }} />
            <View style={{ height: 14, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 6, width: '100%' }} />
            <View style={{ height: 14, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 6, width: '95%' }} />
            <View style={{ height: 14, backgroundColor: '#E0E0E0', borderRadius: 4, width: '85%' }} />
          </View>
        </ScrollView>
        
        {/* Skeleton Bottom Bar */}
        <View style={styles.bottomBar}>
          <View style={{ width: 80, height: 40, backgroundColor: '#E0E0E0', borderRadius: 8, marginRight: 12 }} />
          <View style={{ width: 100, height: 40, backgroundColor: '#E0E0E0', borderRadius: 20, marginRight: 12 }} />
          <View style={{ flex: 1, height: 44, backgroundColor: '#E0E0E0', borderRadius: 12 }} />
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error || !product) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.borderColor }]}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Error</ThemedText>
          <View style={styles.headerButton} />
        </View>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
          <Ionicons name="alert-circle-outline" size={64} color="#E53935" />
          <ThemedText style={{ marginTop: 16, fontSize: 16, textAlign: 'center' }}>
            {error || 'Product not found'}
          </ThemedText>
          <TouchableOpacity 
            style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#1E88E5', borderRadius: 8 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: '#FFF', fontWeight: '600' }}>Go Back</Text>
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
  const productImages = product.images || [];
  const mainImage = product.image || (productImages.length > 0 ? productImages[0] : '');
  const allImages = mainImage ? [mainImage, ...productImages] : productImages;

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? '' : section));
  };

  const incrementQuantity = () => {
    const maxQty = currentVariation?.maximum_purchase_quantity || initProduct?.maximum_purchase_quantity || 100;
    const currentStock = getCurrentStock();
    setQuantity((prev) => Math.min(prev + 1, Math.min(maxQty, currentStock || maxQty)));
  };
  
  const decrementQuantity = () => setQuantity((prev) => Math.max(prev - 1, 1));

  const handleVariationSelect = async (attributeIndex: number, variation: any) => {
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
    
    const finalVariation = currentVariation || product;
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
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.borderColor }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle} numberOfLines={1}>
          {product.name}
        </ThemedText>
        <TouchableOpacity style={styles.headerButton} onPress={handleToggleFavorite}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={24} color={favorite ? '#E53935' : themeColors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.scrollView, {paddingBottom: 20 }]} showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          {allImages.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(e) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  setCurrentImageIndex(index);
                }}
                scrollEventThrottle={16}
              >
                {allImages.map((img:any, idx:number) => (
                  <Image key={idx} source={{ uri: img }} style={styles.carouselImage} />
                ))}
              </ScrollView>
              {/* Pagination Dots */}
              {allImages.length > 1 && (
                <View style={styles.paginationDots}>
                  {allImages.map((_:any, idx:number) => (
                    <View key={idx} style={[styles.dot, currentImageIndex === idx && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={[styles.carouselImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.card }]}>
              <Ionicons name="image-outline" size={64} color="#CCC" />
              <ThemedText style={{ color: '#999', marginTop: 8 }}>No image available</ThemedText>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={[styles.infoSection, { backgroundColor: themeColors.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ThemedText style={styles.productName}>{product.name}</ThemedText>
            {hasOffer() && (
              <View style={{ backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>SALE</Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <ThemedText style={styles.sku}>SKU: {currentVariation?.sku || product.sku || 'N/A'}</ThemedText>
            <ThemedText style={[styles.stock, getCurrentStock() > 0 ? {} : { color: '#E53935' }]}>
              {getCurrentStock() > 0 ? `In Stock: ${getCurrentStock()} ${product.unit || 'pcs'}` : variationNames ? 'Out of Stock' : 'Please select options'}
            </ThemedText>
          </View>
          {variationNames != undefined? (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: themeColors.borderColor }}>
              <ThemedText style={{ fontSize: 13, color: '#666', fontWeight: '600' }}>Selected: {variationNames}</ThemedText>
            </View>
          ) : <></>}
        </View>

        {/* Product Variations */}
        {isLoadingDetails && Object.keys(availableOptions).length === 0 ? (
          <View style={styles.variantSection}>
            <View style={{ height: 10, backgroundColor: '#E0E0E0', borderRadius: 4, width: 100 }} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{ width: 80, height: 44, backgroundColor: '#E0E0E0', borderRadius: 8 }} />
              ))}
            </View>
          </View>
        ) : null}
        {Object.entries(availableOptions).map(([index, options]) => {
          const attributeIndex = parseInt(index);
          const firstOption = options[0];
          const attributeName = firstOption?.product_attribute?.name || firstOption.product_attribute_name;
          
          return (
            <View key={index} style={[styles.variantSection, { backgroundColor: themeColors.card }]}>
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
                          { backgroundColor: themeColors.background, borderColor: themeColors.borderColor },
                          isSelected && styles.variationChipSelected
                        ]}
                        onPress={() => handleVariationSelect(attributeIndex, variation)}
                      >
                        <Text style={[styles.variationText, isSelected && styles.variationTextSelected]}>
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
        {isLoadingDetails && !product.details ? (
          <View style={styles.expandableSection}>
            <View style={styles.expandableHeader}>
              <View style={{ height: 18, backgroundColor: '#E0E0E0', borderRadius: 4, width: 100 }} />
            </View>
          </View>
        ) : null}
        {product.details? (
          <View style={[styles.expandableSection, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor }]}>
            <TouchableOpacity style={styles.expandableHeader} onPress={() => toggleSection('description')}>
              <ThemedText style={styles.expandableTitle}>Description</ThemedText>
              <Ionicons
                name={expandedSection === 'description' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={themeColors.icon}
              />
            </TouchableOpacity>
            {expandedSection === 'description' && (
              <View style={[styles.expandableBody, { borderTopColor: themeColors.borderColor }]}>
                <ThemedText style={styles.descriptionText}>{product.details.replace(/<[^>]*>/g, '')}</ThemedText>
              </View>
            )}
          </View>
        ): <></>}

        {/* Feature Description */}
        {isLoadingDetails && !product.feature_description ? (
          <View style={styles.expandableSection}>
            <View style={styles.expandableHeader}>
              <View style={{ height: 18, backgroundColor: '#E0E0E0', borderRadius: 4, width: 140 }} />
            </View>
          </View>
        ) : null}
        {product.feature_description? (
          <View style={[styles.expandableSection, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor }]}>
            <TouchableOpacity style={styles.expandableHeader} onPress={() => toggleSection('feature_description')}>
              <ThemedText style={styles.expandableTitle}>Feature Description</ThemedText>
              <Ionicons
                name={expandedSection === 'feature_description' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={themeColors.icon}
              />
            </TouchableOpacity>
            {expandedSection === 'feature_description' && (
              <View style={[styles.expandableBody, { borderTopColor: themeColors.borderColor }]}>
                <ThemedText style={styles.descriptionText}>{product.feature_description.replace(/<[^>]*>/g, '')}</ThemedText>
              </View>
            )}
          </View>
        ): <></>}

        {/* Specifications */}
        {isLoadingDetails && (!product.specifications || product.specifications.length === 0) ? (
          <View style={styles.expandableSection}>
            <View style={styles.expandableHeader}>
              <View style={{ height: 18, backgroundColor: '#E0E0E0', borderRadius: 4, width: 120 }} />
            </View>
          </View>
        ) : null}
        {product.specifications && product.specifications.length > 0 && (
          <View style={[styles.expandableSection, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor }]}>
            <TouchableOpacity style={styles.expandableHeader} onPress={() => toggleSection('specifications')}>
              <ThemedText style={styles.expandableTitle}>Specifications</ThemedText>
              <Ionicons
                name={expandedSection === 'specifications' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={themeColors.icon}
              />
            </TouchableOpacity>
            {expandedSection === 'specifications' && (
              <View style={[styles.expandableBody, { borderTopColor: themeColors.borderColor }]}>
                {product.specifications.map((spec: any, idx: number) => (
                  <View key={idx} style={[styles.specRow, { borderBottomColor: themeColors.borderColor }]}>
                    <ThemedText style={styles.specKey}>{spec.key || spec.name}:</ThemedText>
                    <ThemedText style={styles.specValue}>{spec.value}</ThemedText>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Shipping and Return */}
        {isLoadingDetails && !product.shipping_and_return ? (
          <View style={styles.expandableSection}>
            <View style={styles.expandableHeader}>
              <View style={{ height: 18, backgroundColor: '#E0E0E0', borderRadius: 4, width: 130 }} />
            </View>
          </View>
        ) : null}
        {product.shipping_and_return && (
          <View style={[styles.expandableSection, { backgroundColor: themeColors.card, borderColor: themeColors.borderColor }]}>
            <TouchableOpacity style={styles.expandableHeader} onPress={() => toggleSection('shipping')}>
              <ThemedText style={styles.expandableTitle}>Shipping & Return</ThemedText>
              <Ionicons
                name={expandedSection === 'shipping' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={themeColors.icon}
              />
            </TouchableOpacity>
            {expandedSection === 'shipping' && (
              <View style={[styles.expandableBody, { borderTopColor: themeColors.borderColor }]}>
                <ThemedText style={styles.descriptionText}>{product.shipping_and_return.replace(/<[^>]*>/g, '')}</ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={[styles.bottomBar, { backgroundColor: themeColors.card, borderTopColor: themeColors.borderColor }]}>
        <View style={styles.priceSection}>
          <ThemedText style={styles.priceLabel}>Price</ThemedText>
          <View>
            <ThemedText style={styles.priceValue}>${getCurrentPrice().toFixed(2)}</ThemedText>
            {getCurrentOldPrice() > getCurrentPrice() && (
              <ThemedText style={styles.oldPriceValue}>${getCurrentOldPrice().toFixed(2)}</ThemedText>
            )}
          </View>
        </View>

        <View style={[styles.quantitySelector, { backgroundColor: themeColors.background }]}>
          <TouchableOpacity style={[styles.quantityButton, { backgroundColor: themeColors.card }]} onPress={decrementQuantity}>
            <Ionicons name="remove" size={18} color="#1E88E5" />
          </TouchableOpacity>
          <ThemedText style={styles.quantityValue}>{quantity}</ThemedText>
          <TouchableOpacity style={[styles.quantityButton, { backgroundColor: themeColors.card }]} onPress={incrementQuantity}>
            <Ionicons name="add" size={18} color="#1E88E5" />
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={[styles.addToCartButton, !enableAddToCart && { backgroundColor: '#CCC' }]} 
          onPress={handleAddToCart}
          disabled={!enableAddToCart}
        >
          <Ionicons name="cart" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.addToCartText}>
            {
            isLoadingDetails? 'Loading...' :
            !currentVariation && variations.length > 0 ? 'Select Options' : getCurrentStock() === 0 ? 'Out of Stock' : 'Add to Cart'
            }
          </Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  carouselContainer: {
    position: 'relative',
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    resizeMode: 'cover',
    backgroundColor: '#fff',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D4DA',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#1E88E5',
    width: 24,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  brand: {
    fontSize: 13,
    color: '#1E88E5',
    fontWeight: '600',
    marginBottom: 4,
  },
  productName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sku: {
    fontSize: 12,
    color: '#666',
  },
  stock: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  variantSection: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    marginTop: 0,
  },
  variantLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderColor: '#1E88E5',
  },
  colorInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  storageRow: {
    flexDirection: 'row',
    gap: 12,
  },
  storageChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F7F9FC',
  },
  storageChipSelected: {
    borderColor: '#1E88E5',
    backgroundColor: '#E3F2FD',
  },
  storageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  storageTextSelected: {
    color: '#1E88E5',
  },
  variationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  variationChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  variationChipSelected: {
    borderColor: '#1E88E5',
    backgroundColor: '#E3F2FD',
  },
  variationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  variationTextSelected: {
    color: '#1E88E5',
  },
  variationPrice: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  variationPriceSelected: {
    color: '#1E88E5',
  },
  expandableSection: {
    marginTop: 8,
    borderRadius: 8,
    marginHorizontal: 16,
    borderWidth: 1,
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  expandableTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  expandableBody: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderTopWidth: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#444',
  },
  descriptionText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginTop: 10,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  specKey: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  specValue: {
    fontSize: 13,
    flex: 2,
  },
  bottomSpacer: {
    height: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
  },
  priceSection: {
    marginRight: 12,
  },
  priceLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  oldPriceValue: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 4,
    marginRight: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  quantityValue: {
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 12,
    minWidth: 32,
    textAlign: 'center',
  },
  addToCartButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D47A1',
    borderRadius: 12,
    paddingVertical: 12,
  },
  addToCartText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
