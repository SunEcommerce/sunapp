import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCart } from '@/contexts/cart-context';

type Address = {
  id: string;
  name: string;
  phone: string;
  address: string;
  isDefault: boolean;
};

type PaymentMethod = {
  id: string;
  name: string;
  icon: string;
};

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, totalAmount, clearCart } = useCart();
  
  // Sample addresses (in real app, fetch from user profile)
  const [addresses] = useState<Address[]>([
    {
      id: '1',
      name: 'John Doe',
      phone: '+95 9 123 456 789',
      address: '123 Main Street, Yangon, Myanmar',
      isDefault: true,
    },
  ]);

  const [selectedAddress, setSelectedAddress] = useState<string>(
    addresses.find(a => a.isDefault)?.id || ''
  );

  const paymentMethods: PaymentMethod[] = [
    { id: 'cod', name: 'Cash on Delivery', icon: 'cash-outline' },
    { id: 'card', name: 'Credit/Debit Card', icon: 'card-outline' },
    { id: 'kbz', name: 'KBZ Pay', icon: 'phone-portrait-outline' },
    { id: 'wave', name: 'Wave Money', icon: 'wallet-outline' },
  ];

  const [selectedPayment, setSelectedPayment] = useState<string>('cod');

  // Calculate totals
  const subtotal = totalAmount;
  const discount = 40.0;
  const deliveryFee = 0;
  const total = subtotal - discount + deliveryFee;

  const handlePlaceOrder = () => {
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }
    if (!selectedPayment) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    Alert.alert(
      'Order Placed',
      'Your order has been placed successfully!',
      [
        {
          text: 'OK',
          onPress: () => {
            clearCart();
            router.push('/');
          },
        },
      ]
    );
  };

  const handleAddAddress = () => {
    // Navigate to Address page
    router.push('/Address?fromCheckout=true');
  };

  // Check if cart is empty
  if (items.length === 0) {
    return (
      <ThemedView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>Your cart is empty</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Delivery Address Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="location-outline" size={20} color="#2196F3" />
              <ThemedText style={styles.sectionTitle}>Delivery Address</ThemedText>
            </View>
            <TouchableOpacity onPress={handleAddAddress}>
              <ThemedText style={styles.addButton}>+ Add</ThemedText>
            </TouchableOpacity>
          </View>

          {addresses.length > 0 ? (
            <View>
              {addresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[
                    styles.addressCard,
                    selectedAddress === addr.id && styles.addressCardSelected,
                  ]}
                  onPress={() => router.push('/Address?fromCheckout=true')}
                >
                  <View style={styles.radioButton}>
                    {selectedAddress === addr.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <View style={styles.addressContent}>
                    <View style={styles.addressHeader}>
                      <ThemedText style={styles.addressName}>{addr.name}</ThemedText>
                      {addr.isDefault && (
                        <View style={styles.defaultBadge}>
                          <ThemedText style={styles.defaultText}>Default</ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText style={styles.addressPhone}>{addr.phone}</ThemedText>
                    <ThemedText style={styles.addressText}>{addr.address}</ThemedText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addAddressCard}
              onPress={handleAddAddress}
            >
              <Ionicons name="add-circle-outline" size={48} color="#2196F3" />
              <ThemedText style={styles.addAddressText}>
                Add Delivery Address
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Method Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="card-outline" size={20} color="#2196F3" />
              <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
            </View>
          </View>

          <View style={styles.paymentMethodsContainer}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  selectedPayment === method.id && styles.paymentMethodSelected,
                ]}
                onPress={() => setSelectedPayment(method.id)}
              >
                <View style={styles.paymentMethodContent}>
                  <Ionicons
                    name={method.icon as any}
                    size={24}
                    color={selectedPayment === method.id ? '#2196F3' : '#666'}
                  />
                  <ThemedText
                    style={[
                      styles.paymentMethodText,
                      selectedPayment === method.id && styles.paymentMethodTextSelected,
                    ]}
                  >
                    {method.name}
                  </ThemedText>
                </View>
                <View style={styles.radioButton}>
                  {selectedPayment === method.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Order Summary Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="receipt-outline" size={20} color="#2196F3" />
              <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>
            </View>
          </View>

          {/* Products */}
          <View style={styles.productsContainer}>
            {items.map((item) => (
              <View key={item.id} style={styles.productItem}>
                <Image source={{ uri: item.image }} style={styles.productImage} />
                <View style={styles.productDetails}>
                  <ThemedText style={styles.productName} numberOfLines={2}>
                    {item.name}
                  </ThemedText>
                  <ThemedText style={styles.productVariant}>
                    {item.variant?.color && `${item.variant.color}`}
                    {item.variant?.storage && ` • ${item.variant.storage}`}
                  </ThemedText>
                  <View style={styles.productPriceRow}>
                    <ThemedText style={styles.productPrice}>
                      ${item.price.toFixed(2)}
                    </ThemedText>
                    <ThemedText style={styles.productQuantity}>
                      x {item.quantity}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.productTotal}>
                  ${(item.price * item.quantity).toFixed(2)}
                </ThemedText>
              </View>
            ))}
          </View>

          {/* Price Breakdown */}
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <ThemedText style={styles.priceLabel}>Subtotal</ThemedText>
              <ThemedText style={styles.priceValue}>${subtotal.toFixed(2)}</ThemedText>
            </View>
            <View style={styles.priceRow}>
              <ThemedText style={styles.priceLabel}>Coupon Discount</ThemedText>
              <ThemedText style={styles.discountValue}>
                -${discount.toFixed(2)}
              </ThemedText>
            </View>
            <View style={styles.priceRow}>
              <ThemedText style={styles.priceLabel}>Delivery Fee</ThemedText>
              <ThemedText style={styles.freeValue}>Free</ThemedText>
            </View>
            <View style={[styles.priceRow, styles.totalPriceRow]}>
              <ThemedText style={styles.totalPriceLabel}>Total</ThemedText>
              <ThemedText style={styles.totalPriceValue}>
                ${total.toFixed(2)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Bottom spacing for sticky button */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Sticky Place Order Button */}
      <View style={styles.placeOrderContainer}>
        <TouchableOpacity
          style={styles.placeOrderButton}
          onPress={handlePlaceOrder}
        >
          <ThemedText style={styles.placeOrderText}>Place Order</ThemedText>
          <ThemedText style={styles.placeOrderAmount}>${total.toFixed(2)}</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  addButton: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  // Address styles
  addressCard: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  addressCardSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196F3',
  },
  addressContent: {
    flex: 1,
    gap: 4,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  addressPhone: {
    fontSize: 14,
    color: '#666',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  addAddressCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  addAddressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    marginTop: 8,
  },
  // Payment method styles
  paymentMethodsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  paymentMethodSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  paymentMethodTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  // Order summary styles
  productsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  productItem: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  productDetails: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  productVariant: {
    fontSize: 12,
    color: '#666',
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  productQuantity: {
    fontSize: 12,
    color: '#666',
  },
  productTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  // Price breakdown styles
  priceBreakdown: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
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
  totalPriceRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 4,
  },
  totalPriceLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  totalPriceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  bottomSpacer: {
    height: 80,
  },
  // Sticky button styles
  placeOrderContainer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  placeOrderButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  placeOrderAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
