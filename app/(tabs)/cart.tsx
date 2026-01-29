import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useCart } from '@/contexts/cart-context';
import { ThemeContext } from '@/contexts/theme-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

function InlineCartIllustration() {
  return (
    <View style={styles.illustrationContainer} accessible accessibilityRole="image" accessibilityLabel="Empty cart illustration">
      <View style={styles.cartOutline}>
        <View style={styles.cartGrid} />
      </View>

      <View style={[styles.wheel, styles.wheelLeft]} />
      <View style={[styles.wheel, styles.wheelRight]} />

      <View style={styles.plusBadge}>
        <ThemedText style={styles.plusText}>+</ThemedText>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const { items, itemCount, totalAmount, removeFromCart, updateQuantity } = useCart();
  const [promoCode, setPromoCode] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const themeContext = useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Calculate totals
  const subtotal = totalAmount;
  const discount = 40.00; // You can make this dynamic based on promo code
  const deliveryFee = 0; // Free delivery
  const total = subtotal - discount + deliveryFee;

  const uniqueItemCount = items.length;

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token'); // adjust key to your auth token key
        setIsLoggedIn(!!token);
      } catch (e) {
        setIsLoggedIn(false);
      }
    };
    checkLogin();
  }, []);

  const handleRemoveItem = (id: string, name: string) => {
    removeFromCart(id)
    Alert.alert(
      'Remove Item',
      `Remove ${name} from cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeFromCart(id) },
      ]
    );
  };

  const handleQuantityChange = (id: string, delta: number, currentQuantity: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity > 0) {
      updateQuantity(id, newQuantity);
    }
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setSelectedItems([]); // Clear selection when toggling
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev =>
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = () => {
    Alert.alert(
      'Delete Items',
      `Delete ${selectedItems.length} selected item(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            selectedItems.forEach(id => removeFromCart(id));
            setSelectedItems([]);
            setIsEditMode(false);
          }
        },
      ]
    );
  };

  // Empty cart state
  if (itemCount === 0) {
    return (
      <ThemedView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <ThemedView style={[styles.container]}>
          <InlineCartIllustration />

          <ThemedText type="title" style={styles.heading}>
            Ohhh... Your cart is empty
          </ThemedText>

          <ThemedText type="default" style={styles.subtitle}>
            but it doesn't have to be.
          </ThemedText>

          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={() => router.push('/')}
            accessibilityRole="button"
            accessibilityLabel="Shop now">
            <ThemedText style={styles.ctaText}>SHOP NOW</ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    );
  }

  // Cart with items
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ThemedView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.background, borderBottomColor: (themeColors as any).borderColor || '#e0e0e0' }]}>
          <View style={styles.headerLeft} />
          <ThemedText style={styles.headerTitle}>Cart ({uniqueItemCount})</ThemedText>
          <View style={styles.headerRight}>
            {selectedItems.length > 0 && (
              <TouchableOpacity onPress={handleDeleteSelected} style={styles.headerButton}>
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={toggleEditMode} style={styles.headerButton}>
              <ThemedText style={styles.editText}>{isEditMode ? 'Done' : 'Edit'}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Cart Items */}
          <View style={styles.itemsContainer}>
            {items.map((item) => (
              <View key={item.id} style={[styles.cartItem, { backgroundColor: themeColors.background }]}>
                {/* Checkbox for edit mode */}
                {isEditMode && (
                  <TouchableOpacity
                    onPress={() => toggleSelectItem(item.id)}
                    style={styles.checkboxContainer}>
                    <View style={[
                      styles.checkbox,
                      { backgroundColor: themeColors.background, borderColor: (themeColors as any).borderColor || '#e0e0e0' },
                      selectedItems.includes(item.id) && styles.checkboxChecked
                    ]}>
                      {selectedItems.includes(item.id) && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                  </TouchableOpacity>
                )}

                <Image source={{ uri: item.image }} style={styles.productImage} />

                <View style={styles.itemDetails}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <ThemedText style={styles.productName}>{item.name}</ThemedText>
                      <ThemedText style={styles.productSku}>
                        SKU: {item.sku}
                      </ThemedText>
                      {item.variation_names && (
                        <ThemedText style={styles.productVariant}>
                          {item.variation_names}
                        </ThemedText>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={() => handleRemoveItem(item.id, item.name)}
                      style={styles.removeButton}>
                      <Ionicons name="trash-outline" size={20} color="#999" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.itemFooter}>
                    <ThemedText style={styles.itemPrice}>${item.price.toFixed(2)}</ThemedText>

                    {!isEditMode && (
                      <View style={styles.quantityControl}>
                        <TouchableOpacity
                          onPress={() => handleQuantityChange(item.id, -1, item.quantity)}
                          style={[styles.quantityButton, { backgroundColor: themeColors.background, borderColor: (themeColors as any).borderColor || '#e0e0e0' }]}>
                          <ThemedText style={styles.quantityButtonText}>-</ThemedText>
                        </TouchableOpacity>

                        <ThemedText style={styles.quantity}>{item.quantity}</ThemedText>

                        <TouchableOpacity
                          onPress={() => handleQuantityChange(item.id, 1, item.quantity)}
                          style={[styles.quantityButton, { backgroundColor: themeColors.background, borderColor: (themeColors as any).borderColor || '#e0e0e0' }]}>
                          <ThemedText style={styles.quantityButtonText}>+</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Promo Code */}
          <View style={styles.promoSection}>
            <TextInput
              style={[styles.promoInput, { backgroundColor: themeColors.background, borderColor: (themeColors as any).borderColor || '#e0e0e0', color: themeColors.text }]}
              placeholder="Enter promo code"
              placeholderTextColor="#999"
              value={promoCode}
              onChangeText={setPromoCode}
            />
            <TouchableOpacity style={styles.applyButton}>
              <ThemedText style={styles.applyButtonText}>Apply</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Order Summary */}
          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
              <ThemedText style={styles.summaryValue}>${subtotal.toFixed(2)}</ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Discount</ThemedText>
              <ThemedText style={styles.discountValue}>-${discount.toFixed(2)}</ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Delivery Fee</ThemedText>
              <ThemedText style={styles.freeValue}>Free</ThemedText>
            </View>

            <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: (themeColors as any).borderColor || '#e0e0e0' }]}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>${total.toFixed(2)}</ThemedText>
            </View>
          </View>
        </ScrollView>
      </ThemedView>

        {/* Checkout Button */}
        <View style={[styles.checkoutContainer, { backgroundColor: themeColors.background, borderTopColor: (themeColors as any).borderColor || '#e0e0e0' }]}>
          {isLoggedIn === false ? (
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={() => router.push('/Auth')}>
              <ThemedText style={styles.checkoutButtonText}>Please login to Checkout</ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={() => router.push('/Checkout')}>
              <ThemedText style={styles.checkoutButtonText}>Proceed to Checkout</ThemedText>
            </TouchableOpacity>
          )}

        </View>
    </SafeAreaView>
  );
}

const ILLUSTRATION_SIZE = 220;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  editText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  itemsContainer: {
    padding: 16,
    gap: 16,
  },
  cartItem: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  checkboxContainer: {
    paddingRight: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
  },
  productSku: {
    fontSize: 12,
    color: '#666',
  },
  productVariant: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  stockStatus: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2196F3',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2196F3',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
  promoSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  promoInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  applyButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  summarySection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  freeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4CAF50',
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  checkoutContainer: {
    padding: 16,
    paddingBottom: 2,
    borderTopWidth: 1,
  },
  checkoutButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2196F3',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  // Empty cart styles
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingTop: 0,
    paddingHorizontal: 24,
    gap: 18,
  },
  illustrationContainer: {
    width: ILLUSTRATION_SIZE,
    height: ILLUSTRATION_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartOutline: {
    width: '82%',
    height: '52%',
    borderWidth: 3,
    borderColor: '#9aa6b2',
    borderRadius: 6,
    transform: [{ translateY: -10 }, { rotate: '-6deg' }],
    backgroundColor: 'rgba(240,243,248,0.8)',
    overflow: 'hidden',
  },
  cartGrid: {
    flex: 1,
    backgroundColor: 'transparent',
    borderLeftWidth: 0,
  },
  wheel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e9aeb0',
    position: 'absolute',
    bottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  wheelLeft: {
    left: '22%',
  },
  wheelRight: {
    right: '22%',
  },
  plusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#bfe1ff',
    position: 'absolute',
    top: 6,
    right: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  plusText: {
    fontSize: 22,
    lineHeight: 22,
    color: '#ffffff',
    fontWeight: '700',
  },
  heading: {
    textAlign: 'center',
    maxWidth: 300,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  cta: {
    marginTop: 12,
    backgroundColor: '#67A8FF',
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: 28,
    shadowColor: '#67A8FF',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaPressed: {
    opacity: 0.9,
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
  },
});
