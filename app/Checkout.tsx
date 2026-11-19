import { HomeSkeleton } from '@/components/HomeSkeleton';
import { SlideToConfirm } from '@/components/slide-to-confirm';
import { TextInput } from '@/components/ui/text-input';
import { IconButton } from '@/components/ui/icon-button';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { buildCouponCart } from '../utils/coupon';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useCart } from '@/contexts/cart-context';
import { ThemeContext } from '@/contexts/theme-context';
import {
  createOrder,
  fetchAddresses,
  fetchOrderAreas,
  fetchOrderQuote,
  fetchPaymentGateways,
  validateCoupon,
  type OrderQuote,
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
  id: number;
  discount: number;
  message?: string;
};

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, totalAmount, clearCart } = useCart();
  const themeContext = React.useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  const dark = colorScheme === 'dark';
  const surface = dark ? '#1b252c' : '#ffffff';
  const border = dark ? '#30414c' : '#e2e8ed';
  const accent = dark ? '#8bd8ed' : '#086b83';
  const softAccent = dark ? '#253b46' : '#eaf4f8';
  const onAccent = dark ? '#10232b' : '#ffffff';
  const insets = useSafeAreaInsets();
  
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
  const [appliedCouponId, setAppliedCouponId] = useState<number | undefined>();
  const couponRequest = React.useRef(0);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState<string>('');

  // Order note
  const [orderNote, setOrderNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const { items: couponItems, signature: cartSignature } = buildCouponCart(items);
  const orderProducts = React.useMemo(() => {
    const snapshot = buildCouponCart(items).items;
    return items.map((item, index) => ({
      product_id: parseInt(item.productId) || 0,
      variation_id: snapshot[index].variation_id,
      variation_names: item.variation_names || '', sku: item.sku || '',
      price: item.price, quantity: item.quantity, discount: item.discount || 0,
      total_tax: item.tax || 0, subtotal: item.price * item.quantity,
      total: item.price * item.quantity, taxes: [],
    }));
  }, [items]);
  const quoteKey = JSON.stringify([cartSignature, selectedAddress, appliedCouponId]);
  const [quote, setQuote] = useState<{ key: string; data: OrderQuote } | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const currentQuote = quote?.key === quoteKey ? quote.data : null;
  React.useEffect(() => {
    let active = true;
    setQuoteError('');
    if (selectedAddress && orderProducts.length) {
      fetchOrderQuote({ order_type: 5, shipping_id: selectedAddress, billing_id: selectedAddress,
        coupon_id: appliedCouponId, products: orderProducts })
        .then(response => { if (active) setQuote({ key: quoteKey, data: response.data }); })
        .catch(error => { if (active) setQuoteError(error.message || 'Unable to calculate order total'); });
    }
    return () => { active = false; };
  }, [quoteKey, selectedAddress, appliedCouponId, orderProducts, quoteAttempt]);
  const subtotal = currentQuote?.subtotal ?? totalAmount;
  const deliveryFee = currentQuote?.shipping_charge ?? 0;
  const tax = currentQuote?.tax ?? 0;
  const total = currentQuote?.total ?? subtotal - couponDiscount;
  const latestCartSignature = React.useRef(cartSignature);
  latestCartSignature.current = cartSignature;
  React.useEffect(() => {
    couponRequest.current++;
    setAppliedCoupon('');
    setAppliedCouponId(undefined);
    setCouponDiscount(0);
    setCouponError('');
    setIsValidatingCoupon(false);
  }, [cartSignature]);
  React.useEffect(() => () => { couponRequest.current++; }, []);

  const loadCheckoutData = useCallback(async () => {
    setIsLoading(true);
    setCheckoutError('');
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

      const activePayments = payments.filter((p: PaymentMethod) => p.status === 5);
      setPaymentMethods(activePayments);
      setOrderAreas(areas.filter((a: OrderArea) => a.activity === 1));
      setAddresses(addressList);

      const savedAddressId = await AsyncStorage.getItem('selected_address_id');
      const address = addressList.find((a: Address) => a.id === Number(savedAddressId))
        || addressList.find((a: Address) => a.isDefault);
      setSelectedAddress(address?.id ?? null);
      if (address) await AsyncStorage.setItem('selected_address_id', String(address.id));
      setSelectedPayment(previous => activePayments.some((p: PaymentMethod) => p.id === previous)
        ? previous : (activePayments.find((p: PaymentMethod) => p.id === 1) || activePayments[0])?.id || 0);

      if (areas.length > 0) {
        const defaultArea = areas.find((a: OrderArea) => a.activity === 1);
        if (defaultArea) {
          setSelectedArea(defaultArea.id);
        }
      }
    } catch (error) {
      console.error('Failed to load checkout data:', error);
      setCheckoutError('Could not load checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleApplyCoupon = async () => {
    if (!promoCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    const request = ++couponRequest.current;
    const signature = cartSignature;
    setIsValidatingCoupon(true);
    setCouponError('');

    try {
      const response = await validateCoupon(promoCode.trim(), subtotal, couponItems);
      if (request !== couponRequest.current || signature !== latestCartSignature.current) return;
      
      if (response?.data) {
        const validationData: CouponValidation = response.data;
        setCouponDiscount(validationData.discount || 0);
        setAppliedCoupon(promoCode.trim());
        setAppliedCouponId(validationData.id);

      } else {
        setCouponError('Invalid coupon code');
      }
    } catch (error: any) {
      if (request !== couponRequest.current) return;
      const errorMessage = error.message || 'Failed to validate coupon';
      setCouponError(errorMessage);

    } finally {
      if (request === couponRequest.current) setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setPromoCode('');
    couponRequest.current++;
    setIsValidatingCoupon(false);
    setAppliedCoupon('');
    setAppliedCouponId(undefined);
    setCouponDiscount(0);
    setCouponError('');
  };

  const handlePlaceOrder = async () => {
    if (!confirmationOpen || isPlacingOrder || !currentQuote) return;
    // Validation
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }
    if (!selectedPayment) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }
    if (!currentQuote) {
      Alert.alert('Order total', quoteError || 'Please wait for the order total to finish calculating.');
      if (quoteError) setQuoteAttempt(attempt => attempt + 1);
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
        coupon_id: appliedCouponId,
        subtotal: subtotal,
        discount: currentQuote.discount,
        shipping_charge: deliveryFee,
        tax: tax,
        total: total,
        note: orderNote || undefined,
        products: currentQuote.products,
      };

      const response = await createOrder(orderData);

      if (response?.data) {
        setConfirmationOpen(false);
        
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
      setQuote(null);
      setQuoteAttempt(attempt => attempt + 1);
      Alert.alert('Error', error.message || 'Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleChooseAddress = () => {
    router.push('/Address?fromCheckout=true');
  };

  // Reload addresses when screen gains focus (after returning from Address screen)
  useFocusEffect(
    useCallback(() => {
      loadCheckoutData();
    }, [loadCheckoutData])
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
    return Object.entries(iconMap).find(([word]) => key.includes(word))?.[1] || 'card-outline';
  };

  const address = addresses.find(item => item.id === selectedAddress);
  const itemCount = items.reduce((count, item) => count + item.quantity, 0);
  const canPlaceOrder = Boolean(address && selectedPayment && currentQuote && !isValidatingCoupon && !isPlacingOrder);
  const openConfirmation = () => { if (canPlaceOrder) setConfirmationOpen(true); };
  const closeConfirmation = () => { if (!isPlacingOrder) setConfirmationOpen(false); };
  const openPolicy = (slug: 'terms-and-conditions' | 'privacy-policy') => {
    setConfirmationOpen(false);
    router.push({ pathname: '/PageView', params: { slug } });
  };
  React.useEffect(() => { if (!canPlaceOrder && !isPlacingOrder) setConfirmationOpen(false); }, [canPlaceOrder, isPlacingOrder]);
  const totalLabel = currentQuote ? `$${total.toFixed(2)}` : quoteError ? 'Unavailable' : address ? 'Calculating…' : 'Select address';
  const panelStyle = [styles.section, { backgroundColor: surface, borderColor: border }];
  const header = <View style={[styles.header, { backgroundColor: surface, borderBottomColor: border }]}>
    <View style={styles.headerContent}>
      <IconButton label="Go back" disabled={isPlacingOrder} onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="chevron-back" size={23} color={themeColors.text} />
      </IconButton>
      <ThemedText style={styles.headerTitle}>Checkout</ThemedText>
      <View style={styles.headerRight}><Ionicons name="bag-handle-outline" size={20} color={themeColors.icon} /></View>
    </View>
  </View>;
  const heading = (icon: React.ComponentProps<typeof Ionicons>['name'], title: string) => <View style={styles.sectionHeader}>
    <Ionicons name={icon} size={18} color={accent} />
    <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
  </View>;
  const statusBar = <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />;

  if (showThankYou) return <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
    {statusBar}
    <View style={styles.centerState}>
      <View style={[styles.stateIcon, { backgroundColor: softAccent }]}><Ionicons name="checkmark" size={36} color={accent} /></View>
      <ThemedText style={styles.stateTitle}>Thank you!</ThemedText>
      <ThemedText style={[styles.stateMessage, { color: themeColors.textSecondary }]}>Your order has been placed successfully.</ThemedText>
      <ThemedText style={[styles.caption, { color: themeColors.textSecondary }]}>Returning to the store…</ThemedText>
    </View>
  </SafeAreaView>;

  if (!items.length) return <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
    {statusBar}{header}
    <View style={styles.centerState}>
      <View style={[styles.stateIcon, { backgroundColor: softAccent }]}><Ionicons name="bag-outline" size={32} color={accent} /></View>
      <ThemedText style={styles.stateTitle}>Your cart is empty</ThemedText>
      <ThemedText style={[styles.stateMessage, { color: themeColors.textSecondary }]}>Find something you love to get started.</ThemedText>
      <TouchableOpacity accessibilityRole="button" style={[styles.stateButton, { backgroundColor: accent }]} onPress={() => router.push('/')}>
        <ThemedText style={[styles.buttonText, { color: onAccent }]}>Continue shopping</ThemedText>
      </TouchableOpacity>
    </View>
  </SafeAreaView>;

  if (isLoading || checkoutError) return <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
    {statusBar}{header}
    {checkoutError ? <View style={styles.centerState}>
      <Ionicons name="cloud-offline-outline" size={36} color={themeColors.icon} />
      <ThemedText style={[styles.stateMessage, { color: themeColors.textSecondary }]}>{checkoutError}</ThemedText>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry checkout" style={[styles.stateButton, { backgroundColor: accent }]} onPress={loadCheckoutData}>
        <ThemedText style={[styles.buttonText, { color: onAccent }]}>Try again</ThemedText>
      </TouchableOpacity>
    </View> : <View style={styles.loadingContent}>
      {[108, 132, 220].map((height, index) => <View key={index} style={[styles.loadingCard, { backgroundColor: surface }]}>
        <HomeSkeleton variant="banner" height={height} label="Loading checkout" />
      </View>)}
    </View>}
  </SafeAreaView>;

  return <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
    {statusBar}{header}
    <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.intro}>
          <ThemedText style={styles.introTitle}>Review your order</ThemedText>
          <ThemedText style={[styles.caption, { color: themeColors.textSecondary }]}>{itemCount} {itemCount === 1 ? 'item' : 'items'} · Confirm your delivery and payment</ThemedText>
        </View>

        <View style={panelStyle}>
          {heading('location-outline', 'Delivery address')}
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={address ? 'Change delivery address' : 'Choose delivery address'}
            onPress={handleChooseAddress} disabled={isPlacingOrder} style={styles.addressRow}>
            <View style={styles.addressBody}>
              {address ? <>
                <View style={styles.addressNameRow}>
                  <ThemedText style={styles.addressName}>{address.full_name}</ThemedText>
                  {address.isDefault && <ThemedText style={[styles.defaultBadge, { backgroundColor: softAccent, color: accent }]}>Default</ThemedText>}
                </View>
                <ThemedText style={[styles.addressText, { color: themeColors.textSecondary }]}>{address.country_code} {address.phone}</ThemedText>
                <ThemedText style={[styles.addressText, { color: themeColors.textSecondary }]}>{[address.address, address.apartment, address.city, address.state, address.zip_code, address.country].filter(Boolean).join(', ')}</ThemedText>
              </> : <>
                <ThemedText style={[styles.addressName, { color: accent }]}>Choose a delivery address</ThemedText>
                <ThemedText style={[styles.addressText, { color: themeColors.textSecondary }]}>Select a saved address or add a new one</ThemedText>
              </>}
            </View>
            <Ionicons name="chevron-forward" size={18} color={accent} />
          </TouchableOpacity>
        </View>

        {orderAreas.length > 0 && <View style={panelStyle}>
          {heading('map-outline', 'Delivery area')}
          <View style={styles.optionList}>{orderAreas.map(area => <TouchableOpacity key={area.id} accessibilityRole="radio" accessibilityState={{ checked: selectedArea === area.id }}
            disabled={isPlacingOrder} onPress={() => setSelectedArea(area.id)}
            style={[styles.optionRow, { borderColor: selectedArea === area.id ? accent : border, backgroundColor: selectedArea === area.id ? softAccent : surface }]}>
            <ThemedText style={styles.optionText}>{area.name}</ThemedText>
            <ThemedText style={[styles.caption, { color: themeColors.textSecondary }]}>${area.shipping_charge.toFixed(2)}</ThemedText>
            <Ionicons name={selectedArea === area.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={selectedArea === area.id ? accent : themeColors.icon} />
          </TouchableOpacity>)}</View>
        </View>}

        <View style={panelStyle}>
          {heading('wallet-outline', 'Payment')}
          {paymentMethods.length ? <View accessibilityRole="radiogroup" style={styles.optionList}>{paymentMethods.map(method => {
            const selected = selectedPayment === method.id;
            return <TouchableOpacity key={method.id} accessibilityRole="radio" accessibilityLabel={method.name} accessibilityState={{ checked: selected }}
              disabled={isPlacingOrder} onPress={() => setSelectedPayment(method.id)}
              style={[styles.optionRow, { borderColor: selected ? accent : border, backgroundColor: selected ? softAccent : surface }]}>
              <Ionicons name={getPaymentIcon(method.name)} size={21} color={selected ? accent : themeColors.icon} />
              <ThemedText style={[styles.optionText, { color: selected ? accent : themeColors.text }]}>{method.name}</ThemedText>
              <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? accent : themeColors.icon} />
            </TouchableOpacity>;
          })}</View> : <ThemedText style={[styles.addressText, { color: themeColors.textSecondary }]}>No payment methods available. Please try again later.</ThemedText>}
        </View>

        <View style={panelStyle}>
          {heading('receipt-outline', 'Order summary')}
          <View style={styles.products}>{items.map(item => <View key={item.id} style={styles.productRow}>
            <Image source={{ uri: item.image }} style={[styles.productImage, { backgroundColor: themeColors.background }]} resizeMode="contain" />
            <View style={styles.productBody}>
              <ThemedText style={styles.productName} numberOfLines={2}>{item.name}</ThemedText>
              {!!item.variation_names && <ThemedText style={[styles.caption, { color: themeColors.textSecondary }]}>{item.variation_names}</ThemedText>}
              <ThemedText style={[styles.caption, { color: themeColors.textSecondary }]}>{item.quantity} × ${item.price.toFixed(2)}</ThemedText>
            </View>
            <ThemedText style={styles.linePrice}>${(item.price * item.quantity).toFixed(2)}</ThemedText>
          </View>)}</View>
          <View style={[styles.breakdown, { borderTopColor: border }]}>
            <View style={styles.priceRow}><ThemedText style={[styles.priceLabel, { color: themeColors.textSecondary }]}>Subtotal</ThemedText><ThemedText style={styles.priceValue}>${subtotal.toFixed(2)}</ThemedText></View>
            {(currentQuote?.discount ?? couponDiscount) > 0 && <View style={styles.priceRow}><ThemedText style={[styles.priceLabel, { color: themeColors.textSecondary }]}>Coupon discount</ThemedText><ThemedText style={[styles.priceValue, { color: themeColors.success }]}>-${(currentQuote?.discount ?? couponDiscount).toFixed(2)}</ThemedText></View>}
            <View style={styles.priceRow}><ThemedText style={[styles.priceLabel, { color: themeColors.textSecondary }]}>Delivery</ThemedText><ThemedText style={[styles.priceValue, { color: currentQuote && deliveryFee === 0 ? themeColors.success : themeColors.textSecondary }]}>{currentQuote ? deliveryFee === 0 ? 'Free' : `$${deliveryFee.toFixed(2)}` : '—'}</ThemedText></View>
            {tax > 0 && <View style={styles.priceRow}><ThemedText style={[styles.priceLabel, { color: themeColors.textSecondary }]}>Tax</ThemedText><ThemedText style={styles.priceValue}>${tax.toFixed(2)}</ThemedText></View>}
            <View style={[styles.priceRow, styles.totalRow, { borderTopColor: border }]}><ThemedText style={styles.totalLabel}>Total</ThemedText><ThemedText accessibilityLiveRegion="polite" style={styles.totalValue}>{totalLabel}</ThemedText></View>
            {!!quoteError && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry order total" onPress={() => setQuoteAttempt(attempt => attempt + 1)} style={styles.retryRow}>
              <Ionicons name="refresh-outline" size={16} color={accent} /><ThemedText style={[styles.caption, { color: accent }]}>{quoteError} · Retry</ThemedText>
            </TouchableOpacity>}
          </View>
        </View>

        <View style={panelStyle}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Promo code" accessibilityState={{ expanded: promoOpen }}
            disabled={isPlacingOrder} style={styles.extraRow} onPress={() => setPromoOpen(open => !open)}>
            <Ionicons name="pricetag-outline" size={18} color={accent} />
            <ThemedText style={styles.extraLabel}>{appliedCoupon ? `Promo: ${appliedCoupon}` : 'Add promo code'}</ThemedText>
            <Ionicons name={promoOpen ? 'chevron-up' : 'chevron-down'} size={17} color={themeColors.icon} />
          </TouchableOpacity>
          {promoOpen && <View style={styles.extraBody}>
            {appliedCoupon ? <View style={[styles.appliedCoupon, { backgroundColor: softAccent }]}>
              <View style={styles.productBody}><ThemedText style={[styles.optionText, { color: accent }]}>{appliedCoupon}</ThemedText><ThemedText style={[styles.caption, { color: themeColors.textSecondary }]}>${couponDiscount.toFixed(2)} saved</ThemedText></View>
              <IconButton label="Remove coupon" disabled={isPlacingOrder} onPress={handleRemoveCoupon}><Ionicons name="close" size={20} color={themeColors.icon} /></IconButton>
            </View> : <View style={styles.promoRow}>
              <TextInput accessibilityLabel="Enter promo code" style={[styles.promoInput, { borderColor: border, backgroundColor: themeColors.background, color: themeColors.text }]}
                placeholder="Enter code" placeholderTextColor={themeColors.icon} autoCapitalize="characters" autoCorrect={false}
                value={promoCode} onChangeText={text => { setPromoCode(text); setCouponError(''); }} editable={!isValidatingCoupon && !isPlacingOrder} />
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Apply promo code" disabled={isValidatingCoupon || isPlacingOrder} onPress={handleApplyCoupon}
                style={[styles.applyButton, { backgroundColor: softAccent }]}>
                {isValidatingCoupon ? <ActivityIndicator size="small" color={accent} /> : <ThemedText style={[styles.buttonText, { color: accent }]}>Apply</ThemedText>}
              </TouchableOpacity>
            </View>}
            {!!couponError && <ThemedText accessibilityRole="alert" style={[styles.caption, { color: dark ? '#ffada5' : '#b42318', marginTop: 8 }]}>{couponError}</ThemedText>}
          </View>}
          <View style={[styles.extraDivider, { backgroundColor: border }]} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Order note" accessibilityState={{ expanded: noteOpen }} disabled={isPlacingOrder}
            style={styles.extraRow} onPress={() => setNoteOpen(open => !open)}>
            <Ionicons name="create-outline" size={18} color={accent} />
            <ThemedText style={styles.extraLabel}>{orderNote ? 'Edit order note' : 'Add order note'}</ThemedText>
            <ThemedText style={[styles.caption, { color: themeColors.textSecondary }]}>Optional</ThemedText>
            <Ionicons name={noteOpen ? 'chevron-up' : 'chevron-down'} size={17} color={themeColors.icon} />
          </TouchableOpacity>
          {noteOpen && <View style={styles.extraBody}>
            <TextInput accessibilityLabel="Order instructions" style={[styles.noteInput, { borderColor: border, backgroundColor: themeColors.background, color: themeColors.text }]}
              placeholder="Anything we should know about your delivery?" placeholderTextColor={themeColors.icon}
              value={orderNote} onChangeText={setOrderNote} editable={!isPlacingOrder} multiline numberOfLines={3} />
          </View>}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: surface, borderTopColor: border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.footerContent}>
          <View style={styles.footerTotal}><ThemedText style={[styles.caption, { color: themeColors.textSecondary }]}>Total to pay</ThemedText><ThemedText style={styles.footerAmount}>{totalLabel}</ThemedText></View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Place order" accessibilityState={{ disabled: !canPlaceOrder, busy: isPlacingOrder }}
            disabled={!canPlaceOrder} onPress={openConfirmation} style={[styles.placeOrderButton, { backgroundColor: canPlaceOrder || isPlacingOrder ? accent : (dark ? '#34434e' : '#e2e8ed') }]}>
            {isPlacingOrder ? <ActivityIndicator size="small" color={onAccent} /> : <Ionicons name="bag-check-outline" size={18} color={canPlaceOrder ? onAccent : themeColors.textSecondary} />}
            <ThemedText style={[styles.buttonText, { color: canPlaceOrder || isPlacingOrder ? onAccent : themeColors.textSecondary }]}>{isPlacingOrder ? 'Placing order…' : 'Place order'}</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
    <Modal visible={confirmationOpen} transparent animationType="slide" onRequestClose={closeConfirmation}>
      <View style={styles.modalRoot}>
        <TouchableOpacity accessibilityLabel="Close order confirmation" style={styles.modalBackdrop} activeOpacity={1} onPress={closeConfirmation} disabled={isPlacingOrder} />
        <View style={[styles.confirmSheet, { backgroundColor: surface, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.sheetHandle, { backgroundColor: border }]} />
          <View style={styles.confirmHeading}>
            <View style={[styles.confirmIcon, { backgroundColor: softAccent }]}><Ionicons name="bag-check-outline" size={20} color={accent} /></View>
            <View style={styles.confirmTitleGroup}>
              <ThemedText style={styles.confirmTitle}>Confirm order</ThemedText>
              <ThemedText style={[styles.caption, { color: themeColors.textSecondary }]}>{itemCount} {itemCount === 1 ? 'item' : 'items'} · {paymentMethods.find(method => method.id === selectedPayment)?.name}</ThemedText>
            </View>
            <IconButton label="Close confirmation" disabled={isPlacingOrder} onPress={closeConfirmation}><Ionicons name="close" size={22} color={themeColors.icon} /></IconButton>
          </View>
          <View style={[styles.confirmTotalRow, { borderColor: border }]}>
            <ThemedText style={[styles.priceLabel, { color: themeColors.textSecondary }]}>Total to pay</ThemedText>
            <ThemedText style={styles.totalValue}>{totalLabel}</ThemedText>
          </View>
          <ThemedText style={[styles.transferNote, { color: themeColors.textSecondary }]}>
            * Online transfers are accepted only to accounts under our company profile name.
          </ThemedText>
          <View style={styles.policyRow}>
            <ThemedText style={[styles.policyText, { color: themeColors.textSecondary }]}>By confirming, you acknowledge our </ThemedText>
            <TouchableOpacity accessibilityRole="link" accessibilityLabel="Terms and Conditions" onPress={() => openPolicy('terms-and-conditions')}><ThemedText style={[styles.policyLink, { color: accent }]}>T&C</ThemedText></TouchableOpacity>
            <ThemedText style={[styles.policyText, { color: themeColors.textSecondary }]}> and </ThemedText>
            <TouchableOpacity accessibilityRole="link" accessibilityLabel="Privacy Policy" onPress={() => openPolicy('privacy-policy')}><ThemedText style={[styles.policyLink, { color: accent }]}>Privacy Policy</ThemedText></TouchableOpacity>
            <ThemedText style={[styles.policyText, { color: themeColors.textSecondary }]}>.</ThemedText>
          </View>
          <SlideToConfirm disabled={isPlacingOrder || !canPlaceOrder} onConfirm={handlePlaceOrder} accent={accent} onAccent={onAccent} trackColor={softAccent} textColor={accent} />
          {isPlacingOrder && <View style={styles.placingStatus}><ActivityIndicator size="small" color={accent} /><ThemedText style={[styles.caption, { color: themeColors.textSecondary }]}>Placing your order…</ThemedText></View>}
        </View>
      </View>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  body: { flex: 1 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth },
  headerContent: { width: '100%', maxWidth: 680, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, minHeight: 48 },
  headerTitle: { flex: 1, fontSize: 15, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerRight: { width: 44, alignItems: 'center' },
  scrollView: { flex: 1 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 20, gap: 12 },
  intro: { gap: 4, marginBottom: 4 },
  introTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.5 },
  caption: { fontSize: 12, lineHeight: 18 },
  section: { borderRadius: 18, borderWidth: 1, padding: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  addressBody: { flex: 1, gap: 3 },
  addressNameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  addressName: { fontSize: 14, lineHeight: 21, fontWeight: '600', flexShrink: 1 },
  addressText: { fontSize: 13, lineHeight: 19 },
  defaultBadge: { fontSize: 10, lineHeight: 16, fontWeight: '600', paddingHorizontal: 6, borderRadius: 5 },
  optionList: { gap: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 48, paddingVertical: 10 },
  optionText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  products: { gap: 12 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productImage: { width: 44, height: 48, borderRadius: 8 },
  productBody: { flex: 1, gap: 2 },
  productName: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  linePrice: { fontSize: 13, lineHeight: 20, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  breakdown: { marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  priceLabel: { fontSize: 13, lineHeight: 20 },
  priceValue: { fontSize: 13, lineHeight: 20, fontWeight: '500' },
  totalRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 2 },
  totalLabel: { fontSize: 14, lineHeight: 22, fontWeight: '600' },
  totalValue: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  retryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  extraRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  extraLabel: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '500' },
  extraBody: { paddingTop: 8, paddingBottom: 4 },
  extraDivider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  promoRow: { flexDirection: 'row', gap: 8 },
  promoInput: { flex: 1, minWidth: 0, height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  applyButton: { minHeight: 44, paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  appliedCoupon: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10 },
  noteInput: { minHeight: 84, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, lineHeight: 20, textAlignVertical: 'top' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, paddingHorizontal: 16 },
  footerContent: { width: '100%', maxWidth: 648, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12 },
  footerTotal: { flex: 1 },
  footerAmount: { fontSize: 20, lineHeight: 27, fontWeight: '700', letterSpacing: -0.4 },
  placeOrderButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, paddingHorizontal: 20, borderRadius: 12 },
  buttonText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 16 },
  stateIcon: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center' },
  stateTitle: { fontSize: 24, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  stateMessage: { fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 340 },
  stateButton: { minHeight: 48, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  loadingContent: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: 16, gap: 12 },
  loadingCard: { padding: 14, borderRadius: 18, overflow: 'hidden' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 24, 32, 0.54)' },
  confirmSheet: { width: '100%', maxWidth: 680, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, gap: 14 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 2 },
  confirmHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  confirmIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmTitleGroup: { flex: 1, gap: 2 },
  confirmTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  confirmTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  transferNote: { fontSize: 12, lineHeight: 18 },
  policyRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 2 },
  policyText: { fontSize: 12, lineHeight: 19 },
  policyLink: { fontSize: 12, lineHeight: 19, fontWeight: '700', textDecorationLine: 'underline' },
  placingStatus: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
});
