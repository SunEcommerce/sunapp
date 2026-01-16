import { useCart } from '@/contexts/cart-context';
import { fetchChildrenVariations, fetchInitialVariations, fetchProductDetails, fetchVariationAncestorsString, postWishlistToggle } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { addToCart } = useCart();
  
  const [product, setProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
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
        setIsLoading(true);
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
      }
    };
    loadProduct();
  }, [slug]);

  // Show loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Loading...</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={{ marginTop: 16, color: '#666' }}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
          <Ionicons name="alert-circle-outline" size={64} color="#E53935" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#333', textAlign: 'center' }}>
            {error || 'Product not found'}
          </Text>
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
        
        // Fetch and set variation names for display
        try {
          const namesResponse = await fetchVariationAncestorsString(product.id, variation.id);
          const names = namesResponse?.data || '';
          setVariationNames(names);
        } catch (err) {
          console.error('Failed to fetch variation names:', err);
        }
        
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.name}
        </Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleToggleFavorite}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={24} color={favorite ? '#E53935' : '#111'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
            <View style={[styles.carouselImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' }]}>
              <Ionicons name="image-outline" size={64} color="#CCC" />
              <Text style={{ color: '#999', marginTop: 8 }}>No image available</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Text style={styles.productName}>{product.name}</Text>
            {hasOffer() && (
              <View style={{ backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>SALE</Text>
              </View>
            )}
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.sku}>SKU: {currentVariation?.sku || product.sku || 'N/A'}</Text>
            <Text style={[styles.stock, getCurrentStock() > 0 ? {} : { color: '#E53935' }]}>
              {getCurrentStock() > 0 ? `In Stock: ${getCurrentStock()} ${product.unit || 'pcs'}` : variationNames ? 'Out of Stock' : 'Please select options'}
            </Text>
          </View>
          {variationNames != undefined? (
            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E5E5' }}>
              <Text style={{ fontSize: 13, color: '#666', fontWeight: '600' }}>Selected: {variationNames}</Text>
            </View>
          ) : <></>}
        </View>

        {/* Product Variations */}
        {Object.entries(availableOptions).map(([index, options]) => {
          const attributeIndex = parseInt(index);
          const firstOption = options[0];
          const attributeName = firstOption?.product_attribute?.name || firstOption.product_attribute_name;
          
          return (
            <View key={index} style={styles.variantSection}>
              <Text style={styles.variantLabel}>{attributeName}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.variationRow}>
                  {options.map((variation: any) => {
                    const isSelected = selectedVariations[attributeIndex]?.id === variation.id;
                    const optionName = variation.product_attribute_option_name;
                    return (
                      <TouchableOpacity
                        key={variation.id}
                        style={[styles.variationChip, isSelected && styles.variationChipSelected]}
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

        {/* Quantity Selector */}
        <View style={styles.variantSection}>
          <TouchableOpacity style={styles.expandableHeader} onPress={() => toggleSection('features')}>
            <Text style={styles.expandableTitle}>Features</Text>
            <Ionicons
              name={expandedSection === 'features' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#666"
            />
          </TouchableOpacity>
          {expandedSection === 'features' && (
            <View style={styles.expandableBody}>
              <Text style={styles.descriptionText}>{product.feature_description.replace(/<[^>]*>/g, '')}</Text>
            </View>
          )}
        </View>

        {/* Description */}
        {product.details && (
          <View style={styles.expandableSection}>
            <TouchableOpacity style={styles.expandableHeader} onPress={() => toggleSection('description')}>
              <Text style={styles.expandableTitle}>Description</Text>
              <Ionicons
                name={expandedSection === 'description' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
            {expandedSection === 'description' && (
              <View style={styles.expandableBody}>
                <Text style={styles.descriptionText}>{product.details.replace(/<[^>]*>/g, '')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Specifications */}
        {product.specifications && product.specifications.length > 0 && (
          <View style={styles.expandableSection}>
            <TouchableOpacity style={styles.expandableHeader} onPress={() => toggleSection('specifications')}>
              <Text style={styles.expandableTitle}>Specifications</Text>
              <Ionicons
                name={expandedSection === 'specifications' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
            {expandedSection === 'specifications' && (
              <View style={styles.expandableBody}>
                {product.specifications.map((spec: any, idx: number) => (
                  <View key={idx} style={styles.specRow}>
                    <Text style={styles.specKey}>{spec.key || spec.name}:</Text>
                    <Text style={styles.specValue}>{spec.value}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Shipping and Return */}
        {product.shipping_and_return && (
          <View style={styles.expandableSection}>
            <TouchableOpacity style={styles.expandableHeader} onPress={() => toggleSection('shipping')}>
              <Text style={styles.expandableTitle}>Shipping & Return</Text>
              <Ionicons
                name={expandedSection === 'shipping' ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
            {expandedSection === 'shipping' && (
              <View style={styles.expandableBody}>
                <Text style={styles.descriptionText}>{product.shipping_and_return.replace(/<[^>]*>/g, '')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Price</Text>
          <View>
            <Text style={styles.priceValue}>${getCurrentPrice().toFixed(2)}</Text>
            {getCurrentOldPrice() > getCurrentPrice() && (
              <Text style={styles.oldPriceValue}>${getCurrentOldPrice().toFixed(2)}</Text>
            )}
          </View>
        </View>

        <View style={styles.quantitySelector}>
          <TouchableOpacity style={styles.quantityButton} onPress={decrementQuantity}>
            <Ionicons name="remove" size={18} color="#1E88E5" />
          </TouchableOpacity>
          <Text style={styles.quantityValue}>{quantity}</Text>
          <TouchableOpacity style={styles.quantityButton} onPress={incrementQuantity}>
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
            { !variationNames && variations.length > 0 ? 'Select Options' : getCurrentStock() === 0 ? 'Out of Stock' : 'Add to Cart' }
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
    color: '#111',
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
    backgroundColor: '#fff',
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
    color: '#111',
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  variantLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
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
    borderColor: '#E5E5E5',
    backgroundColor: '#F7F9FC',
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
    backgroundColor: '#fff',
    marginTop: 8,
    borderRadius: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
    color: '#111',
  },
  expandableBody: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
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
    borderBottomColor: '#F0F0F0',
  },
  specKey: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  specValue: {
    fontSize: 13,
    color: '#111',
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
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
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
    color: '#111',
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
    backgroundColor: '#F7F9FC',
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
    backgroundColor: '#fff',
  },
  quantityValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
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
