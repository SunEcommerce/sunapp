import { useCart } from '@/contexts/cart-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

const PRODUCT = {
  name: 'Smartphone Pro Max',
  brand: 'NextGen Electronics',
  sku: 'NGE-SPM-256-BLK',
  stock: 12,
  price: 1099.0,
  images: [
    'https://placehold.co/800x800/png?text=Product+Image+1',
    'https://placehold.co/800x800/png?text=Product+Image+2',
    'https://placehold.co/800x800/png?text=Product+Image+3',
  ],
  colors: [
    { id: 'black', name: 'Black', hex: '#000000' },
    { id: 'blue', name: 'Blue', hex: '#1E88E5' },
    { id: 'white', name: 'White', hex: '#F5F5F5' },
    { id: 'red', name: 'Red', hex: '#E53935' },
  ],
  storage: ['128GB', '256GB', '512GB'],
  features: [
    '6.7" Super Retina XDR Display',
    '5G Connectivity',
    'Triple Camera System',
    'All-Day Battery Life',
    'Face ID',
  ],
  description:
    'Experience the next level of smartphone technology with the Smartphone Pro Max. Featuring cutting-edge performance, stunning display, and professional-grade camera capabilities, this device is designed to exceed your expectations.',
  specifications: {
    Display: '6.7" OLED, 2778 x 1284 pixels',
    Processor: 'A16 Bionic chip',
    RAM: '8GB',
    Camera: '48MP main + 12MP ultra-wide + 12MP telephoto',
    Battery: '4323 mAh',
    OS: 'iOS 17',
  },
};

export default function ProductDetailScreen() {
  const router = useRouter();
  const { addToCart } = useCart();
  const [favorite, setFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(PRODUCT.colors[0].id);
  const [selectedStorage, setSelectedStorage] = useState(PRODUCT.storage[1]);
  const [quantity, setQuantity] = useState(1);
  const [expandedSection, setExpandedSection] = useState<string>('description');

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? '' : section));
  };

  const incrementQuantity = () => setQuantity((prev) => Math.min(prev + 1, PRODUCT.stock));
  const decrementQuantity = () => setQuantity((prev) => Math.max(prev - 1, 1));

  const handleAddToCart = () => {
    const selectedColorObj = PRODUCT.colors.find(c => c.id === selectedColor);
    addToCart({
      productId: PRODUCT.sku,
      name: PRODUCT.name,
      price: PRODUCT.price,
      quantity: quantity,
      image: PRODUCT.images[0],
      variant: {
        color: selectedColorObj?.name,
        storage: selectedStorage,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {PRODUCT.name}
        </Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => setFavorite(!favorite)}>
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={24} color={favorite ? '#E53935' : '#111'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
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
            {PRODUCT.images.map((img, idx) => (
              <Image key={idx} source={{ uri: img }} style={styles.carouselImage} />
            ))}
          </ScrollView>
          {/* Pagination Dots */}
          <View style={styles.paginationDots}>
            {PRODUCT.images.map((_, idx) => (
              <View key={idx} style={[styles.dot, currentImageIndex === idx && styles.dotActive]} />
            ))}
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <Text style={styles.brand}>{PRODUCT.brand}</Text>
          <Text style={styles.productName}>{PRODUCT.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.sku}>SKU: {PRODUCT.sku}</Text>
            <Text style={styles.stock}>In Stock: {PRODUCT.stock} pcs</Text>
          </View>
        </View>

        {/* Color Picker */}
        <View style={styles.variantSection}>
          <Text style={styles.variantLabel}>Color</Text>
          <View style={styles.colorRow}>
            {PRODUCT.colors.map((color) => {
              const isSelected = selectedColor === color.id;
              return (
                <TouchableOpacity
                  key={color.id}
                  style={[styles.colorSwatch, isSelected && styles.colorSwatchSelected]}
                  onPress={() => setSelectedColor(color.id)}
                >
                  <View style={[styles.colorInner, { backgroundColor: color.hex }]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Storage Options */}
        <View style={styles.variantSection}>
          <Text style={styles.variantLabel}>Storage</Text>
          <View style={styles.storageRow}>
            {PRODUCT.storage.map((storage) => {
              const isSelected = selectedStorage === storage;
              return (
                <TouchableOpacity
                  key={storage}
                  style={[styles.storageChip, isSelected && styles.storageChipSelected]}
                  onPress={() => setSelectedStorage(storage)}
                >
                  <Text style={[styles.storageText, isSelected && styles.storageTextSelected]}>{storage}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Features */}
        <View style={styles.expandableSection}>
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
              {PRODUCT.features.map((feature, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#1E88E5" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Description */}
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
              <Text style={styles.descriptionText}>{PRODUCT.description}</Text>
            </View>
          )}
        </View>

        {/* Specifications */}
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
              {Object.entries(PRODUCT.specifications).map(([key, value]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specKey}>{key}:</Text>
                  <Text style={styles.specValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.priceValue}>${PRODUCT.price.toFixed(2)}</Text>
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

        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <Ionicons name="cart" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.addToCartText}>Add to Cart</Text>
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
