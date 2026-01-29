import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchOrderDetails } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface OrderAddress {
  id: number;
  address_type: number;
  full_name: string;
  email: string;
  country_code: string;
  phone: string;
  address: string;
  country: string;
  state: string;
  city: string;
  zip_code: string;
}

interface ProductTax {
  tax_name: string;
  tax_rate: number;
}

interface OrderProduct {
  id: number;
  product_id: number;
  product_name: string;
  product_image: string;
  product_slug: string;
  category_name: string;
  price: string;
  currency_price: string;
  quantity: number;
  order_quantity: number;
  discount: string;
  discount_currency_price: string;
  tax: string;
  subtotal: string;
  total: string;
  subtotal_currency_price: string;
  total_currency_price: string;
  status: number;
  variation_names: string;
  product_tax: ProductTax[];
}

interface OrderDetail {
  id: number;
  order_serial_no: string;
  subtotal_currency_price: string;
  tax_currency_price: string;
  discount_currency_price: string;
  total_currency_price: string;
  shipping_charge_currency_price: string;
  order_datetime: string;
  payment_method_name: string;
  payment_status: number;
  status: number;
  order_address: OrderAddress[];
  order_products: OrderProduct[];
}

const getStatusColor = (status: number) => {
  switch (status) {
    case 1:
      return '#FFA500'; // Pending
    case 5:
      return '#2196F3'; // Confirmed
    case 10:
      return '#4CAF50'; // Delivered
    case 15:
      return '#F44336'; // Cancelled
    default:
      return '#9E9E9E';
  }
};

const getStatusName = (status: number) => {
  switch (status) {
    case 1:
      return 'Pending';
    case 5:
      return 'Confirmed';
    case 10:
      return 'Delivered';
    case 15:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
};

export default function OrderDetailScreen() {
  const themeContext = useContext(ThemeContext);
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;

  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];

  useEffect(() => {
    loadOrderDetail();
  }, [orderId]);

  const loadOrderDetail = async () => {
    try {
      setError(null);
      const response = await fetchOrderDetails(orderId);
      
      if (response?.data) {
        setOrderDetail(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order details');
      console.error('Error fetching order details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
        <StatusBar 
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
        />
        <ActivityIndicator size="large" color="#2b5fe2" />
        <ThemedText style={styles.loadingText}>Loading order details...</ThemedText>
      </SafeAreaView>
    );
  }

  if (error || !orderDetail) {
    return (
      <SafeAreaView style={[styles.centerContainer, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
        <StatusBar 
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
        />
        <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
        <ThemedText style={styles.errorText}>{error || 'Order not found'}</ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={loadOrderDetail}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const deliveryAddress = orderDetail.order_address?.find(addr => addr.address_type === 10);
  const billingAddress = orderDetail.order_address?.find(addr => addr.address_type === 5);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top', 'left', 'right']}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={[styles.header, { backgroundColor: themeColors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Order Details</ThemedText>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Status Card */}
        <View style={[styles.card, { backgroundColor: themeColors.background }]}>
          <View style={styles.statusHeader}>
            <ThemedText style={styles.orderNumber}>
              Order #{orderDetail.order_serial_no}
            </ThemedText>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(orderDetail.status) + '20' },
              ]}
            >
              <Text
                style={[styles.statusText, { color: getStatusColor(orderDetail.status) }]}
              >
                {getStatusName(orderDetail.status)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color={themeColors.icon} />
            <ThemedText style={styles.infoText}>{orderDetail.order_datetime}</ThemedText>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={16} color={themeColors.icon} />
            <ThemedText style={styles.infoText}>
              {orderDetail.payment_method_name}
            </ThemedText>
          </View>
        </View>

        {/* Products List */}
        <View style={[styles.card, { backgroundColor: themeColors.background }]}>
          <ThemedText style={styles.sectionTitle}>Order Items</ThemedText>
          {orderDetail.order_products.map((product) => (
            <View key={product.id} style={styles.productItem}>
              <Image source={{ uri: product.product_image }} style={styles.productImage} />
              <View style={styles.productInfo}>
                <ThemedText style={styles.productName} numberOfLines={2}>
                  {product.product_name}
                </ThemedText>
                {product.variation_names ? (
                  <ThemedText style={styles.productVariation}>
                    {product.variation_names}
                  </ThemedText>
                ) : null}
                <ThemedText style={styles.productCategory}>
                  {product.category_name}
                </ThemedText>
                <View style={styles.productPriceRow}>
                  <ThemedText style={styles.productPrice}>
                    {product.currency_price}
                  </ThemedText>
                  <ThemedText style={styles.productQuantity}>
                    x{product.order_quantity}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={styles.productTotal}>
                {product.total_currency_price}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        {deliveryAddress && (
          <View style={[styles.card, { backgroundColor: themeColors.background }]}>
            <ThemedText style={styles.sectionTitle}>Delivery Address</ThemedText>
            <View style={styles.addressContent}>
              <Ionicons name="location-outline" size={20} color={themeColors.icon} />
              <View style={styles.addressText}>
                <ThemedText style={styles.addressName}>
                  {deliveryAddress.full_name}
                </ThemedText>
                <ThemedText style={styles.addressDetail}>
                  {deliveryAddress.address}
                </ThemedText>
                <ThemedText style={styles.addressDetail}>
                  {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.zip_code}
                </ThemedText>
                <ThemedText style={styles.addressDetail}>
                  {deliveryAddress.country}
                </ThemedText>
                <ThemedText style={styles.addressDetail}>
                  {deliveryAddress.country_code} {deliveryAddress.phone}
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Order Summary */}
        <View style={[styles.card, { backgroundColor: themeColors.background }]}>
          <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>
          
          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {orderDetail.subtotal_currency_price}
            </ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Discount</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {orderDetail.discount_currency_price}
            </ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Tax</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {orderDetail.tax_currency_price}
            </ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={styles.summaryLabel}>Shipping</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {orderDetail.shipping_charge_currency_price}
            </ThemedText>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <ThemedText style={styles.totalLabel}>Total</ThemedText>
            <ThemedText style={styles.totalValue}>
              {orderDetail.total_currency_price}
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    opacity: 0.7,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  productItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  productVariation: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 4,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2b5fe2',
  },
  productQuantity: {
    fontSize: 12,
    marginLeft: 8,
    opacity: 0.7,
  },
  productTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2b5fe2',
  },
  addressContent: {
    flexDirection: 'row',
  },
  addressText: {
    flex: 1,
    marginLeft: 12,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  addressDetail: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2b5fe2',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
    color: '#F44336',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#2b5fe2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
