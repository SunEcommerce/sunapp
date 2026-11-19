import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchOrderDetails } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { memo, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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
  reason?: string;
  order_address: OrderAddress[];
  order_products: OrderProduct[];
}

type OrderPalette = {
  background: string;
  surface: string;
  elevated: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
};

const STATUS_STEPS = [
  { label: 'Placed', icon: 'receipt-outline' as const },
  { label: 'Confirmed', icon: 'checkmark-outline' as const },
  { label: 'On the way', icon: 'bicycle-outline' as const },
  { label: 'Delivered', icon: 'bag-check-outline' as const },
];

const getStatusDetails = (status: number, dark: boolean) => {
  switch (status) {
    case 1:
      return { name: 'Pending', stage: 0, icon: 'time-outline' as const, foreground: dark ? '#f6c96b' : '#8a5600', background: dark ? '#3a2d17' : '#fff3d6' };
    case 5:
      return { name: 'Confirmed', stage: 1, icon: 'checkmark-circle-outline' as const, foreground: dark ? '#7ec8ff' : '#075a99', background: dark ? '#17344b' : '#e4f3ff' };
    case 7:
      return { name: 'On the way', stage: 2, icon: 'bicycle-outline' as const, foreground: dark ? '#9bd5ff' : '#075a99', background: dark ? '#17344b' : '#e4f3ff' };
    case 10:
      return { name: 'Delivered', stage: 3, icon: 'bag-check-outline' as const, foreground: dark ? '#7de0ad' : '#087443', background: dark ? '#163b2b' : '#e4f7ed' };
    case 15:
      return { name: 'Cancelled', stage: -1, icon: 'close-circle-outline' as const, foreground: dark ? '#ff9b98' : '#b42318', background: dark ? '#49211f' : '#ffebe9' };
    case 20:
      return { name: 'Rejected', stage: -1, icon: 'ban-outline' as const, foreground: dark ? '#ff9b98' : '#b42318', background: dark ? '#49211f' : '#ffebe9' };
    default:
      return { name: 'Processing', stage: 0, icon: 'ellipse-outline' as const, foreground: dark ? '#c1cbd1' : '#52626c', background: dark ? '#2a343a' : '#edf1f3' };
  }
};

const ProductCard = memo(function ProductCard({
  product,
  palette,
  onOpen,
}: {
  product: OrderProduct;
  palette: OrderPalette;
  onOpen: (slug: string) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const quantity = product.order_quantity || product.quantity || 1;
  const canOpen = Boolean(product.product_slug);

  return (
    <Pressable
      accessibilityRole={canOpen ? 'button' : undefined}
      accessibilityLabel={`${product.product_name}, quantity ${quantity}, total ${product.total_currency_price}`}
      accessibilityHint={canOpen ? 'Opens product details' : undefined}
      disabled={!canOpen}
      onPress={() => onOpen(product.product_slug)}
      style={({ pressed }) => [styles.productCard, { backgroundColor: palette.elevated }, pressed && styles.pressed]}
    >
      <View style={[styles.productImageWell, { backgroundColor: palette.surface }]}>
        {!imageFailed && product.product_image ? (
          <Image source={{ uri: product.product_image }} style={styles.productImage} contentFit="contain"
            accessibilityLabel={product.product_name} onError={() => setImageFailed(true)} />
        ) : (
          <Ionicons name="image-outline" size={30} color={palette.muted} />
        )}
      </View>
      <View style={styles.productInfo}>
        <ThemedText style={styles.productName} numberOfLines={2}>{product.product_name}</ThemedText>
        {product.variation_names ? (
          <View style={[styles.variationPill, { backgroundColor: palette.surface }]}>
            <ThemedText numberOfLines={1} style={[styles.variationText, { color: palette.muted }]}>{product.variation_names}</ThemedText>
          </View>
        ) : product.category_name ? (
          <ThemedText numberOfLines={1} style={[styles.categoryText, { color: palette.muted }]}>{product.category_name}</ThemedText>
        ) : null}
        <View style={styles.productMeta}>
          <ThemedText style={[styles.unitPrice, { color: palette.muted }]}>{product.currency_price}</ThemedText>
          <View style={[styles.quantityBadge, { backgroundColor: palette.surface }]}>
            <ThemedText style={[styles.quantityText, { color: palette.muted }]}>× {quantity}</ThemedText>
          </View>
        </View>
      </View>
      <View style={styles.productTotalBlock}>
        <ThemedText style={styles.productTotal}>{product.total_currency_price}</ThemedText>
        {canOpen && <Ionicons name="chevron-forward" size={17} color={palette.muted} />}
      </View>
    </Pressable>
  );
});

function AddressCard({ title, icon, address, palette }: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  address: OrderAddress;
  palette: OrderPalette;
}) {
  const location = [address.address, address.city, address.state, address.zip_code, address.country].filter(Boolean).join(', ');
  return (
    <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: palette.accentSoft }]}>
          <Ionicons name={icon} size={19} color={palette.accent} />
        </View>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      </View>
      <View style={[styles.addressPanel, { backgroundColor: palette.elevated }]}>
        <ThemedText style={styles.addressName}>{address.full_name}</ThemedText>
        <View style={styles.addressLine}>
          <Ionicons name="navigate-outline" size={16} color={palette.muted} />
          <ThemedText style={[styles.addressText, { color: palette.muted }]}>{location}</ThemedText>
        </View>
        <View style={styles.addressLine}>
          <Ionicons name="call-outline" size={16} color={palette.muted} />
          <ThemedText style={[styles.addressText, { color: palette.muted }]}>{address.country_code} {address.phone}</ThemedText>
        </View>
        {address.email ? (
          <View style={styles.addressLine}>
            <Ionicons name="mail-outline" size={16} color={palette.muted} />
            <ThemedText style={[styles.addressText, { color: palette.muted }]}>{address.email}</ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function OrderDetailScreen() {
  const themeContext = useContext(ThemeContext);
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const orderId = params.orderId;
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  const dark = colorScheme === 'dark';
  const palette = useMemo<OrderPalette>(() => ({
    background: themeColors.background,
    surface: dark ? '#1d252a' : '#ffffff',
    elevated: dark ? '#252f35' : '#f3f6f7',
    text: themeColors.text,
    muted: themeColors.textSecondary,
    border: dark ? '#34434b' : '#dfe7eb',
    accent: dark ? '#77cee6' : '#086b83',
    accentSoft: dark ? '#193842' : '#e4f3f7',
    onAccent: dark ? '#10232b' : '#ffffff',
    success: dark ? '#7de0ad' : '#087443',
    successSoft: dark ? '#163b2b' : '#e4f7ed',
    danger: dark ? '#ff9b98' : '#b42318',
    dangerSoft: dark ? '#49211f' : '#ffebe9',
  }), [dark, themeColors]);

  const loadOrderDetail = useCallback(async () => {
    if (!orderId) {
      setError('Order not found');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetchOrderDetails(orderId);
      if (!response?.data) throw new Error('Order not found');
      setOrderDetail(response.data);
    } catch (requestError) {
      console.error('Error fetching order details:', requestError);
      setError(requestError instanceof Error ? requestError.message : 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  const openProduct = useCallback((slug: string) => {
    router.push(`/ProductDetail?slug=${slug}`);
  }, [router]);

  const header = (
    <View style={[styles.header, { backgroundColor: palette.background, borderBottomColor: palette.border }]}>
      <IconButton label="Go back" onPress={() => router.back()} style={styles.headerButton}>
        <Ionicons name="chevron-back" size={24} color={palette.text} />
      </IconButton>
      <ThemedText style={styles.headerTitle}>Order Details</ThemedText>
      <View style={styles.headerButton} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        {header}
        <View style={styles.stateContainer} accessibilityLiveRegion="polite">
          <View style={[styles.loadingIcon, { backgroundColor: palette.accentSoft }]}>
            <ActivityIndicator size="small" color={palette.accent} />
          </View>
          <ThemedText style={styles.stateTitle}>Loading order details</ThemedText>
          <ThemedText style={[styles.stateDescription, { color: palette.muted }]}>Preparing your receipt and delivery progress.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !orderDetail) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        {header}
        <View style={styles.stateContainer} accessibilityRole="alert">
          <View style={[styles.stateIcon, { backgroundColor: palette.dangerSoft }]}>
            <Ionicons name="receipt-outline" size={34} color={palette.danger} />
          </View>
          <ThemedText style={styles.stateTitle}>Couldn&apos;t load this order</ThemedText>
          <ThemedText style={[styles.stateDescription, { color: palette.muted }]}>{error || 'Order not found'}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="Retry loading order" onPress={loadOrderDetail}
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: palette.accent }, pressed && styles.pressed]}>
            <Ionicons name="refresh" size={19} color={palette.onAccent} />
            <Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>Try again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const status = getStatusDetails(orderDetail.status, dark);
  const paymentPaid = orderDetail.payment_status === 5;
  const deliveryAddress = orderDetail.order_address?.find(address => address.address_type === 10);
  const billingAddress = orderDetail.order_address?.find(address => address.address_type === 5);
  const itemCount = orderDetail.order_products.reduce((total, product) => total + (product.order_quantity || product.quantity || 1), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
      {header}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.orderIdentity}>
              <ThemedText style={[styles.eyebrow, { color: palette.muted }]}>ORDER</ThemedText>
              <ThemedText style={styles.orderNumber}>#{orderDetail.order_serial_no}</ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
              <Ionicons name={status.icon} size={15} color={status.foreground} />
              <Text style={[styles.statusText, { color: status.foreground }]}>{status.name}</Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaItem}>
              <Ionicons name="calendar-clear-outline" size={17} color={palette.muted} />
              <ThemedText style={[styles.heroMetaText, { color: palette.muted }]}>{orderDetail.order_datetime}</ThemedText>
            </View>
            <View style={[styles.itemCountBadge, { backgroundColor: palette.elevated }]}>
              <Ionicons name="cube-outline" size={15} color={palette.muted} />
              <ThemedText style={[styles.itemCountText, { color: palette.muted }]}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</ThemedText>
            </View>
          </View>

          {status.stage >= 0 ? (
            <View accessibilityRole="progressbar" accessibilityLabel={`Order progress, ${status.name}`}
              accessibilityValue={{ min: 0, max: STATUS_STEPS.length - 1, now: status.stage }} style={styles.timeline}>
              {STATUS_STEPS.map((step, index) => {
                const complete = index <= status.stage;
                return (
                  <View key={step.label} style={styles.timelineStep}>
                    {index < STATUS_STEPS.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: index < status.stage ? palette.accent : palette.border }]} />
                    )}
                    <View style={[styles.timelineCircle, { backgroundColor: complete ? palette.accent : palette.elevated, borderColor: complete ? palette.accent : palette.border }]}>
                      <Ionicons name={complete && index < status.stage ? 'checkmark' : step.icon} size={15} color={complete ? palette.onAccent : palette.muted} />
                    </View>
                    <ThemedText numberOfLines={2} style={[styles.timelineLabel, { color: complete ? palette.text : palette.muted }]}>{step.label}</ThemedText>
                  </View>
                );
              })}
            </View>
          ) : (
            <View accessibilityRole="alert" style={[styles.statusNotice, { backgroundColor: status.background }]}>
              <Ionicons name={status.icon} size={19} color={status.foreground} />
              <View style={styles.statusNoticeCopy}>
                <ThemedText style={[styles.statusNoticeTitle, { color: status.foreground }]}>Order {status.name.toLowerCase()}</ThemedText>
                {orderDetail.reason ? <ThemedText style={[styles.statusNoticeText, { color: status.foreground }]}>{orderDetail.reason}</ThemedText> : null}
              </View>
            </View>
          )}

          <View style={[styles.heroTotalRow, { borderTopColor: palette.border }]}>
            <ThemedText style={[styles.heroTotalLabel, { color: palette.muted }]}>Order total</ThemedText>
            <ThemedText style={styles.heroTotal}>{orderDetail.total_currency_price}</ThemedText>
          </View>
        </View>

        <View style={styles.paymentGrid}>
          <View style={[styles.paymentCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.paymentIcon, { backgroundColor: palette.accentSoft }]}>
              <Ionicons name="card-outline" size={19} color={palette.accent} />
            </View>
            <ThemedText style={[styles.paymentLabel, { color: palette.muted }]}>Payment method</ThemedText>
            <ThemedText numberOfLines={2} style={styles.paymentValue}>{orderDetail.payment_method_name || 'Not available'}</ThemedText>
          </View>
          <View style={[styles.paymentCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <View style={[styles.paymentIcon, { backgroundColor: paymentPaid ? palette.successSoft : palette.dangerSoft }]}>
              <Ionicons name={paymentPaid ? 'checkmark-circle-outline' : 'time-outline'} size={19} color={paymentPaid ? palette.success : palette.danger} />
            </View>
            <ThemedText style={[styles.paymentLabel, { color: palette.muted }]}>Payment status</ThemedText>
            <ThemedText style={[styles.paymentValue, { color: paymentPaid ? palette.success : palette.danger }]}>{paymentPaid ? 'Paid' : 'Unpaid'}</ThemedText>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: palette.accentSoft }]}>
              <Ionicons name="bag-handle-outline" size={19} color={palette.accent} />
            </View>
            <View style={styles.sectionHeaderCopy}>
              <ThemedText style={styles.sectionTitle}>Order items</ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>{itemCount} {itemCount === 1 ? 'item' : 'items'} in this order</ThemedText>
            </View>
          </View>
          <View style={styles.productList}>
            {orderDetail.order_products.map(product => (
              <ProductCard key={product.id} product={product} palette={palette} onOpen={openProduct} />
            ))}
          </View>
        </View>

        {deliveryAddress && <AddressCard title="Delivery address" icon="location-outline" address={deliveryAddress} palette={palette} />}
        {billingAddress && billingAddress.id !== deliveryAddress?.id && (
          <AddressCard title="Billing address" icon="document-text-outline" address={billingAddress} palette={palette} />
        )}

        <View style={[styles.sectionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: palette.accentSoft }]}>
              <Ionicons name="receipt-outline" size={19} color={palette.accent} />
            </View>
            <ThemedText style={styles.sectionTitle}>Payment summary</ThemedText>
          </View>
          <View style={styles.summaryRows}>
            {[
              ['Subtotal', orderDetail.subtotal_currency_price],
              ['Discount', orderDetail.discount_currency_price],
              ['Tax', orderDetail.tax_currency_price],
              ['Shipping', orderDetail.shipping_charge_currency_price],
            ].map(([label, value]) => (
              <View key={label} style={styles.summaryRow}>
                <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>{label}</ThemedText>
                <ThemedText style={styles.summaryValue}>{value}</ThemedText>
              </View>
            ))}
          </View>
          <View style={[styles.summaryTotal, { backgroundColor: palette.elevated, borderColor: palette.border }]}>
            <View>
              <ThemedText style={[styles.summaryTotalLabel, { color: palette.muted }]}>{paymentPaid ? 'Total paid' : 'Order total'}</ThemedText>
              <ThemedText style={[styles.summaryTotalHint, { color: palette.muted }]}>{paymentPaid ? 'Payment completed' : 'Payment pending'}</ThemedText>
            </View>
            <ThemedText style={styles.summaryTotalValue}>{orderDetail.total_currency_price}</ThemedText>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: 44, height: 44 },
  headerTitle: { fontSize: 19, lineHeight: 26, fontWeight: '700' },
  pressed: { opacity: 0.78 },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 58 },
  loadingIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stateIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stateTitle: { fontSize: 21, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  stateDescription: { maxWidth: 340, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 7 },
  primaryButton: { minHeight: 50, borderRadius: 15, marginTop: 22, paddingHorizontal: 20, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryButtonText: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  scrollContent: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 34 },
  heroCard: { borderWidth: 1, borderRadius: 22, padding: 17, marginBottom: 14, shadowColor: '#07151b', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  orderIdentity: { minWidth: 0, flex: 1 },
  eyebrow: { fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 1.2 },
  orderNumber: { fontSize: 21, lineHeight: 28, fontWeight: '800', marginTop: 1 },
  statusBadge: { maxWidth: '46%', minHeight: 34, borderRadius: 17, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  statusText: { flexShrink: 1, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14 },
  heroMetaItem: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroMetaText: { minWidth: 0, flex: 1, fontSize: 13, lineHeight: 19 },
  itemCountBadge: { minHeight: 32, borderRadius: 16, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  itemCountText: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  timeline: { flexDirection: 'row', marginTop: 22, paddingHorizontal: 2 },
  timelineStep: { flex: 1, alignItems: 'center', position: 'relative' },
  timelineLine: { position: 'absolute', top: 16, left: '50%', right: '-50%', height: 2 },
  timelineCircle: { zIndex: 1, width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timelineLabel: { width: '100%', fontSize: 10, lineHeight: 14, fontWeight: '600', textAlign: 'center', marginTop: 6 },
  statusNotice: { borderRadius: 14, padding: 12, marginTop: 18, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  statusNoticeCopy: { minWidth: 0, flex: 1 },
  statusNoticeTitle: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  statusNoticeText: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  heroTotalRow: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 18, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTotalLabel: { fontSize: 13, lineHeight: 19 },
  heroTotal: { fontSize: 21, lineHeight: 28, fontWeight: '800' },
  paymentGrid: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  paymentCard: { minWidth: 0, flex: 1, borderWidth: 1, borderRadius: 18, padding: 14 },
  paymentIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  paymentLabel: { fontSize: 11, lineHeight: 16 },
  paymentValue: { fontSize: 14, lineHeight: 20, fontWeight: '700', marginTop: 2 },
  sectionCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 14 },
  sectionHeader: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sectionHeaderCopy: { minWidth: 0, flex: 1 },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12, lineHeight: 18, marginTop: 1 },
  productList: { gap: 10 },
  productCard: { minHeight: 102, borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11 },
  productImageWell: { width: 78, height: 82, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImage: { width: '100%', height: '100%' },
  productInfo: { minWidth: 0, flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  productName: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  variationPill: { alignSelf: 'flex-start', maxWidth: '100%', minHeight: 23, borderRadius: 8, paddingHorizontal: 7, justifyContent: 'center', marginTop: 5 },
  variationText: { fontSize: 10, lineHeight: 15 },
  categoryText: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  productMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
  unitPrice: { fontSize: 12, lineHeight: 17 },
  quantityBadge: { minHeight: 24, borderRadius: 12, paddingHorizontal: 7, justifyContent: 'center' },
  quantityText: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
  productTotalBlock: { maxWidth: '28%', alignItems: 'flex-end', justifyContent: 'center', gap: 7 },
  productTotal: { fontSize: 14, lineHeight: 20, fontWeight: '800', textAlign: 'right' },
  addressPanel: { borderRadius: 14, padding: 13, gap: 8 },
  addressName: { fontSize: 15, lineHeight: 21, fontWeight: '700', marginBottom: 1 },
  addressLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addressText: { minWidth: 0, flex: 1, fontSize: 13, lineHeight: 20 },
  summaryRows: { gap: 11 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { fontSize: 13, lineHeight: 19 },
  summaryValue: { fontSize: 13, lineHeight: 19, fontWeight: '600', textAlign: 'right' },
  summaryTotal: { borderWidth: 1, borderRadius: 15, marginTop: 15, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryTotalLabel: { fontSize: 12, lineHeight: 17 },
  summaryTotalHint: { fontSize: 10, lineHeight: 15, marginTop: 1 },
  summaryTotalValue: { fontSize: 19, lineHeight: 25, fontWeight: '800', textAlign: 'right' },
});
