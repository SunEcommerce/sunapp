import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useCart } from '@/contexts/cart-context';
import { ThemeContext } from '@/contexts/theme-context';
import {
  createOrder,
  fetchAddresses,
  fetchOrderAreas,
  fetchPaymentGateways,
  validateCoupon,
} from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Address = {
  id: number;
  label: string;
  full_name: string;
  address: string;
  apartment?: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  country_code: string;
  phone: string;
  latitude?: string;
  longitude?: string;
  isDefault?: boolean;
};

type PaymentMethod = {
  id: number;
  name: string;
  image: string;
  slug: string;
  status: number;
};

type OrderArea = {
  id: number;
  name: string;
  shipping_charge: number;
  activity: number;
};

type CouponValidation = {
  discount: number;
  message?: string;
};

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, totalAmount, clearCart } = useCart();
  const themeContext = React.useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  
  // Data states
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [orderAreas, setOrderAreas] = useState<OrderArea[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);

  // Selection states
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<number>(0);
  const [selectedArea, setSelectedArea] = useState<number>(0);

  // Coupon states
  const [promoCode, setPromoCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string>('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string>('');

  // Order note
  const [orderNote, setOrderNote] = useState('');

  // Calculate totals
  const subtotal = totalAmount;
  const selectedAreaData = orderAreas.find(area => area.id === selectedArea);
  const deliveryFee = selectedAreaData?.shipping_charge || 0;
  const tax = 0; // You can calculate tax based on your business logic
  const total = subtotal - couponDiscount + deliveryFee + tax;

  const loadCheckoutData = async () => {

  // Calculate totals
  const subtotal = totalAmount;
    setIsLoading(true);
    try {
      // Load payment gateways, order areas, and addresses in parallel
      const [paymentResponse, areasResponse, addressResponse] = await Promise.all([
        fetchPaymentGateways(),
        fetchOrderAreas(),
        fetchAddresses(),
      ]);

      const payments = paymentResponse?.data || [];
      const areas = areasResponse?.data || [];
      const addressList = addressResponse?.data || [];

      setPaymentMethods(payments.filter((p: PaymentMethod) => p.status === 5));
      setOrderAreas(areas.filter((a: OrderArea) => a.activity === 1));
      setAddresses(addressList);

      // Load selected address from storage
      const savedAddressId = await AsyncStorage.getItem('selected_address_id');
      if (savedAddressId) {
        const addressId = parseInt(savedAddressId);
        // Verify address still exists
        if (addressList.find((a: Address) => a.id === addressId)) {
          setSelectedAddress(addressId);
        }
      } else {
        // Auto-select default address if available
        const defaultAddr = addressList.find((a: Address) => a.isDefault);
        if (defaultAddr) {
          setSelectedAddress(defaultAddr.id);
          await AsyncStorage.setItem('selected_address_id', defaultAddr.id.toString());
        }
      }

      // Set default selections
      if (payments.length > 0) {
        const defaultPayment = payments.find((p: PaymentMethod) => p.id === 1);
        if (defaultPayment) {
          setSelectedPayment(defaultPayment.id);
        }
      }

      if (areas.length > 0) {
        const defaultArea = areas.find((a: OrderArea) => a.activity === 1);
        if (defaultArea) {
          setSelectedArea(defaultArea.id);
        }
      }
    } catch (error) {
      console.error('Failed to load checkout data:', error);
      Alert.alert('Error', 'Failed to load checkout data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!promoCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError('');

    try {
      const response = await validateCoupon(promoCode, subtotal);
      
      if (response?.data) {
        const validationData: CouponValidation = response.data;
        setCouponDiscount(validationData.discount || 0);
        setAppliedCoupon(promoCode);
        Alert.alert('Success', validationData.message || 'Coupon applied successfully!');
      } else {
        setCouponError('Invalid coupon code');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to validate coupon';
      setCouponError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setPromoCode('');
    setAppliedCoupon('');
    setCouponDiscount(0);
    setCouponError('');
  };

  const handlePlaceOrder = async () => {
    // Validation
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }
    if (!selectedPayment) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }
    // if (!selectedArea) {
    //   Alert.alert('Error', 'Please select a delivery area');
    //   return;
    // }

    setIsPlacingOrder(true);

    try {
      // Prepare order data
      const orderData = {
        address_id: selectedAddress,
        shipping_id: selectedAddress, // Same as address_id for DELIVERY
        billing_id: selectedAddress, // Same as address_id for DELIVERY
        delivery_type: 1, // Standard delivery
        order_type: 5, // DELIVERY order type
        source: 5, // DELIVERY source
        payment_method: selectedPayment,
        coupon_code: appliedCoupon || undefined,
        subtotal: subtotal,
        discount: couponDiscount,
        shipping_charge: deliveryFee,
        tax: tax,
        total: total,
        note: orderNote || undefined,
        products: items.map(item => ({
          product_id: parseInt(item.productId) || 0,
          item_type: item.item_type,
          item_id: item.item_id,
          variation_names: item.variation_names || '',
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          discount: item.discount,
          total_tax: item.tax,
          subtotal: item.subtotal,
          total: item.total,
          taxes: [],
          variation_id: item.item_id ? parseInt(item.item_id.toString()): 0,
        })),
      };

      const response = await createOrder(orderData);

      if (response?.data) {
        
        // Show thank you page
        setShowThankYou(true);
        
        // Auto redirect to home after 3 seconds
        setTimeout(() => {
          setShowThankYou(false);
          clearCart();
          router.push('/');
        }, 3000);
      }
    } catch (error: any) {
      console.error('Failed to place order:', error);
      Alert.alert('Error', error.message || 'Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleSelectAddress = async (addressId: number) => {
    setSelectedAddress(addressId);
    // Save to storage
    await AsyncStorage.setItem('selected_address_id', addressId.toString());
  };

  const handleChooseAddress = () => {
    router.push('/Address?fromCheckout=true');
  };

  // Reload addresses when screen gains focus (after returning from Address screen)
  useFocusEffect(
    useCallback(() => {
      loadCheckoutData();
    }, [])
  );

  const getPaymentIcon = (name: string): any => {
    const iconMap: Record<string, any> = {
      'cash': 'cash-outline',
      'card': 'card-outline',
      'kbz': 'phone-portrait-outline',
      'wave': 'wallet-outline',
      'paypal': 'logo-paypal',
      'stripe': 'card-outline',
    };
    
    const key = name.toLowerCase();
    return iconMap[key] || 'card-outline';
  };

  // Check if cart is empty
  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['left', 'right']}>
        <StatusBar 
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
        />
        <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.borderColor }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>Your cart is empty</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['left', 'right']}>
        <StatusBar 
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
        />
        <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.borderColor }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <ThemedText style={styles.loadingText}>Loading checkout...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // Thank You page
  if (showThankYou) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['left', 'right', 'bottom']}>
        <StatusBar 
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
        />
        <View style={[styles.thankYouContainer, { backgroundColor: themeColors.background }]}>
          <View style={styles.thankYouIconContainer}>
            <Ionicons name="checkmark-circle" size={120} color="#4CAF50" />
          </View>
          <ThemedText style={styles.thankYouTitle}>Thank You!</ThemedText>
          <ThemedText style={styles.thankYouMessage}>
            Your order has been placed successfully
          </ThemedText>
          <View style={styles.thankYouSubtext}>
            <ActivityIndicator size="small" color="#2196F3" style={{ marginRight: 8 }} />
            <ThemedText style={styles.redirectText}>
              Redirecting to home...
            </ThemedText>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Delivery Address Section */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="location-outline" size={20} color="#2196F3" />
              <ThemedText style={styles.sectionTitle}>Delivery Address</ThemedText>
            </View>
          </View>

          {!selectedAddress ? (
            <TouchableOpacity
              style={[styles.chooseAddressCard, { backgroundColor: themeColors.background, borderColor: '#2196F3' }]}
              onPress={handleChooseAddress}
            >
              <Ionicons name="location-outline" size={48} color="#2196F3" />
              <ThemedText style={styles.chooseAddressText}>
                Choose an Address
              </ThemedText>
              <ThemedText style={styles.chooseAddressSubtext}>
                Select or add a delivery address
              </ThemedText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.selectedAddressCard, { backgroundColor: themeColors.background, borderColor: '#2196F3' }]}
              onPress={handleChooseAddress}
            >
              {(() => {
                const addr = addresses.find(a => a.id === selectedAddress);
                if (!addr) return null;
                return (
                  <>
                    <View style={styles.selectedAddressHeader}>
                      <View style={styles.addressHeaderLeft}>
                        <ThemedText style={styles.addressName}>{addr.full_name}</ThemedText>
                        {addr.isDefault && (
                          <View style={styles.defaultBadge}>
                            <ThemedText style={styles.defaultText}>Default</ThemedText>
                          </View>
                        )}
                      </View>
                      <Ionicons name="create-outline" size={20} color="#2196F3" />
                    </View>
                    <View style={styles.selectedAddressBody}>
                      <ThemedText style={[styles.addressText, { fontWeight: '600' }]}>
                        {addr.country_code} {addr.phone}
                      </ThemedText>
                      <ThemedText style={styles.addressText}>
                        {addr.address}
                        {addr.apartment ? `, ${addr.apartment}` : ''}
                        {addr.city}, {addr.state} {addr.zip_code} {addr.country}
                      </ThemedText>
                    </View>
                  </>
                );
              })()}
            </TouchableOpacity>
          )}
        </View>

        {/* Delivery Area Section */}
        {orderAreas.length > 0 && (
          <View style={[styles.section, { backgroundColor: themeColors.card }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="map-outline" size={20} color="#2196F3" />
                <ThemedText style={styles.sectionTitle}>Delivery Area</ThemedText>
              </View>
            </View>

            <ScrollView 
              style={styles.paymentMethodsContainer} 
              contentContainerStyle={styles.paymentMethodList}
              nestedScrollEnabled={true} 
              showsVerticalScrollIndicator={false}
            >
              {orderAreas.map((area) => (
                <TouchableOpacity
                  key={area.id}
                  style={[
                    styles.paymentMethod,
                    { backgroundColor: themeColors.background, borderColor: themeColors.borderColor },
                    selectedArea === area.id && styles.paymentMethodSelected,
                  ]}
                  onPress={() => setSelectedArea(area.id)}
                >
                  <View style={styles.paymentMethodContent}>
                    <ThemedText
                      style={[
                        styles.paymentMethodText,
                        selectedArea === area.id && styles.paymentMethodTextSelected,
                      ]}
                    >
                      {area.name}
                    </ThemedText>
                    <ThemedText style={styles.shippingCharge}>
                      ${area.shipping_charge.toFixed(2)}
                    </ThemedText>
                  </View>
                  <View style={styles.radioButton}>
                    {selectedArea === area.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Payment Method Section */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="card-outline" size={20} color="#2196F3" />
              <ThemedText style={styles.sectionTitle}>Payment Method</ThemedText>
            </View>
          </View>

          <ScrollView 
            style={styles.paymentMethodsContainer} 
            contentContainerStyle={styles.paymentMethodList}
            nestedScrollEnabled={true} 
            showsVerticalScrollIndicator={false}
          >
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethod,
                  { backgroundColor: themeColors.background, borderColor: themeColors.borderColor },
                  selectedPayment === method.id && styles.paymentMethodSelected,
                ]}
                onPress={() => setSelectedPayment(method.id)}
              >
                <View style={styles.paymentMethodContent}>
                  <Ionicons
                    name={getPaymentIcon(method.name)}
                    size={24}
                    color={selectedPayment === method.id ? '#2196F3' : themeColors.icon}
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
          </ScrollView>
        </View>

        {/* Order Note Section */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="create-outline" size={20} color="#2196F3" />
              <ThemedText style={styles.sectionTitle}>Order Note (Optional)</ThemedText>
            </View>
          </View>
          <View style={styles.noteContainer}>
            <TextInput
              style={[styles.noteInput, { backgroundColor: themeColors.background, borderColor: themeColors.borderColor, color: themeColors.text }]}
              placeholder="Add any special instructions for your order..."
              placeholderTextColor="#999"
              value={orderNote}
              onChangeText={setOrderNote}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Promo Code Section */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="pricetag-outline" size={20} color="#2196F3" />
              <ThemedText style={styles.sectionTitle}>Promo Code</ThemedText>
            </View>
          </View>

          {appliedCoupon ? (
            <View style={styles.appliedCouponContainer}>
              <View style={styles.appliedCouponContent}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <View style={styles.appliedCouponText}>
                  <ThemedText style={styles.appliedCouponCode}>{appliedCoupon}</ThemedText>
                  <ThemedText style={styles.appliedCouponDiscount}>
                    -${couponDiscount.toFixed(2)} discount applied
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon}>
                <Ionicons name="close-circle" size={24} color="#999" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.promoContainer}>
              <TextInput
                style={[styles.promoInput, { backgroundColor: themeColors.background, borderColor: themeColors.borderColor, color: themeColors.text }]}
                placeholder="Enter promo code"
                placeholderTextColor="#999"
                value={promoCode}
                onChangeText={(text) => {
                  setPromoCode(text);
                  setCouponError('');
                }}
                editable={!isValidatingCoupon}
              />
              <TouchableOpacity
                style={[styles.applyButton, isValidatingCoupon && styles.applyButtonDisabled]}
                onPress={handleApplyCoupon}
                disabled={isValidatingCoupon}
              >
                {isValidatingCoupon ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <ThemedText style={styles.applyButtonText}>Apply</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          )}
          {couponError ? (
            <ThemedText style={styles.couponError}>{couponError}</ThemedText>
          ) : null}
        </View>

        {/* Order Summary Section */}
        <View style={[styles.section, { backgroundColor: themeColors.card }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="receipt-outline" size={20} color="#2196F3" />
              <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>
            </View>
          </View>

          {/* Products */}
          <View style={styles.productsContainer}>
            {items.map((item) => (
              <View key={item.id} style={[styles.productItem, { borderBottomColor: themeColors.borderColor }]}>
                <Image source={{ uri: item.image }} style={styles.productImage} />
                <View style={styles.productDetails}>
                  <ThemedText style={styles.productName} numberOfLines={2}>
                    {item.name}
                  </ThemedText>
                  {item.variation_names && (
                    <ThemedText style={styles.productVariant}>
                      {item.variation_names}
                    </ThemedText>
                  )}
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
            
            {couponDiscount > 0 && (
              <View style={styles.priceRow}>
                <ThemedText style={styles.priceLabel}>Coupon Discount</ThemedText>
                <ThemedText style={styles.discountValue}>
                  -${couponDiscount.toFixed(2)}
                </ThemedText>
              </View>
            )}
            
            <View style={styles.priceRow}>
              <ThemedText style={styles.priceLabel}>Delivery Fee</ThemedText>
              <ThemedText style={deliveryFee === 0 ? styles.freeValue : styles.priceValue}>
                {deliveryFee === 0 ? 'Free' : `$${deliveryFee.toFixed(2)}`}
              </ThemedText>
            </View>

            {tax > 0 && (
              <View style={styles.priceRow}>
                <ThemedText style={styles.priceLabel}>Tax</ThemedText>
                <ThemedText style={styles.priceValue}>${tax.toFixed(2)}</ThemedText>
              </View>
            )}
            
            <View style={[styles.priceRow, styles.totalPriceRow, { borderTopColor: themeColors.borderColor }]}>
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
      <View style={[styles.placeOrderContainer, { backgroundColor: themeColors.card, borderTopColor: themeColors.borderColor }]}>
        <TouchableOpacity
          style={[styles.placeOrderButton, isPlacingOrder && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder}
        >
          {isPlacingOrder ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <ThemedText style={styles.placeOrderText}>Placing Order...</ThemedText>
            </>
          ) : (
            <>
              <ThemedText style={styles.placeOrderText}>Place Order</ThemedText>
              <ThemedText style={styles.placeOrderAmount}>${total.toFixed(2)}</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  thankYouContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  thankYouIconContainer: {
    marginBottom: 24,
  },
  thankYouTitle: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  thankYouMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  thankYouSubtext: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redirectText: {
    fontSize: 14,
    color: '#2196F3',
  },
  section: {
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
  },
  addButton: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  // Address styles
  chooseAddressCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  chooseAddressText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2196F3',
    marginTop: 8,
  },
  chooseAddressSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  selectedAddressCard: {
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedAddressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedAddressBody: {
    gap: 4,
  },
  addressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
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
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2196F3',
  },
  // Payment method styles
  paymentMethodsContainer: {
    paddingHorizontal: 16,
    maxHeight: 200,
  },
  paymentMethodList: {
    gap: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
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
  shippingCharge: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  // Order note styles
  noteContainer: {
    paddingHorizontal: 16,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Promo code styles
  promoContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
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
    minWidth: 80,
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  appliedCouponContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  appliedCouponContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  appliedCouponText: {
    flex: 1,
  },
  appliedCouponCode: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
  },
  appliedCouponDiscount: {
    fontSize: 12,
    color: '#2E7D32',
  },
  couponError: {
    fontSize: 12,
    color: '#FF3B30',
    paddingHorizontal: 16,
    marginTop: 4,
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
    marginTop: 4,
  },
  totalPriceLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  totalPriceValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 80,
  },
  // Sticky button styles
  placeOrderContainer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
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
    gap: 12,
  },
  placeOrderButtonDisabled: {
    opacity: 0.6,
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
