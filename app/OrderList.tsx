import { ThemedText } from '@/components/themed-text';
import { IconButton } from '@/components/ui/icon-button';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchOrders } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface OrderUser {
  id: number;
  name: string;
  phone: string;
  email: string;
}

interface Order {
  id: number;
  order_serial_no: string;
  user_id: number;
  total_amount_price: string;
  total_currency_price: string;
  payment_status: number;
  status: number;
  status_name: string;
  order_items: number;
  order_datetime: string;
  user: OrderUser;
}

type OrderPalette = {
  background: string;
  surface: string;
  elevated: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  border: string;
  onAccent: string;
  danger: string;
  dangerSoft: string;
};

const getStatusTone = (status: number, dark: boolean) => {
  switch (status) {
    case 1:
      return { foreground: dark ? '#f6c96b' : '#8a5600', background: dark ? '#3a2d17' : '#fff3d6', icon: 'time-outline' as const };
    case 5:
      return { foreground: dark ? '#7ec8ff' : '#075a99', background: dark ? '#17344b' : '#e4f3ff', icon: 'checkmark-circle-outline' as const };
    case 10:
      return { foreground: dark ? '#7de0ad' : '#087443', background: dark ? '#163b2b' : '#e4f7ed', icon: 'bag-check-outline' as const };
    case 15:
      return { foreground: dark ? '#ff9b98' : '#b42318', background: dark ? '#49211f' : '#ffebe9', icon: 'close-circle-outline' as const };
    default:
      return { foreground: dark ? '#c1cbd1' : '#52626c', background: dark ? '#2a343a' : '#edf1f3', icon: 'ellipse-outline' as const };
  }
};

const OrderCard = memo(function OrderCard({
  item,
  palette,
  dark,
  onPress,
}: {
  item: Order;
  palette: OrderPalette;
  dark: boolean;
  onPress: (orderId: number) => void;
}) {
  const status = getStatusTone(item.status, dark);
  const itemLabel = `${item.order_items} ${item.order_items === 1 ? 'item' : 'items'}`;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Order ${item.order_serial_no}, ${item.status_name}, ${itemLabel}, total ${item.total_currency_price}`}
      accessibilityHint="Opens order details"
      activeOpacity={0.76}
      onPress={() => onPress(item.id)}
      style={[styles.orderCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
      <View style={styles.orderTopRow}>
        <View style={styles.orderIdentity}>
          <View style={[styles.receiptIcon, { backgroundColor: palette.accentSoft }]}>
            <Ionicons name="receipt-outline" size={20} color={palette.accent} />
          </View>
          <View style={styles.orderTitleBlock}>
            <ThemedText style={[styles.orderLabel, { color: palette.muted }]}>ORDER</ThemedText>
            <ThemedText numberOfLines={1} style={styles.orderNumber}>{item.order_serial_no}</ThemedText>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: status.background }]}>
          <Ionicons name={status.icon} size={14} color={status.foreground} />
          <Text numberOfLines={1} style={[styles.statusText, { color: status.foreground }]}>{item.status_name}</Text>
        </View>
      </View>

      <View style={[styles.metaPanel, { backgroundColor: palette.elevated }]}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-clear-outline" size={17} color={palette.muted} />
          <ThemedText numberOfLines={1} style={[styles.metaText, { color: palette.muted }]}>{item.order_datetime}</ThemedText>
        </View>
        <View style={[styles.metaDivider, { backgroundColor: palette.border }]} />
        <View style={styles.metaItemCompact}>
          <Ionicons name="cube-outline" size={17} color={palette.muted} />
          <ThemedText style={[styles.metaText, { color: palette.muted }]}>{itemLabel}</ThemedText>
        </View>
      </View>

      <View style={[styles.orderFooter, { borderTopColor: palette.border }]}>
        <View>
          <ThemedText style={[styles.totalLabel, { color: palette.muted }]}>Order total</ThemedText>
          <ThemedText style={[styles.totalAmount, { color: palette.text }]}>{item.total_currency_price}</ThemedText>
        </View>
        <View style={[styles.detailAction, { backgroundColor: palette.accentSoft }]}>
          <ThemedText style={[styles.detailActionText, { color: palette.accent }]}>View details</ThemedText>
          <Ionicons name="arrow-forward" size={16} color={palette.accent} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function OrderListScreen() {
  const themeContext = useContext(ThemeContext);
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  const dark = colorScheme === 'dark';
  const palette = useMemo<OrderPalette>(() => ({
    background: themeColors.background,
    surface: dark ? '#1d252a' : '#ffffff',
    elevated: dark ? '#252f35' : '#f4f7f8',
    text: themeColors.text,
    muted: themeColors.textSecondary,
    accent: dark ? '#77cee6' : '#086b83',
    accentSoft: dark ? '#193842' : '#e4f3f7',
    border: dark ? '#34434b' : '#dfe7eb',
    onAccent: dark ? '#10232b' : '#ffffff',
    danger: dark ? '#ff9b98' : '#b42318',
    dangerSoft: dark ? '#49211f' : '#ffebe9',
  }), [dark, themeColors]);

  const loadOrders = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchOrders({ page: 1, per_page: 50, order_column: 'id', order_type: 'desc' });
      if (response?.data) setOrders(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  const handleOrderPress = useCallback((orderId: number) => {
    router.push(`/OrderDetail?orderId=${orderId}`);
  }, [router]);

  const renderOrderItem = useCallback(({ item }: { item: Order }) => (
    <OrderCard item={item} palette={palette} dark={dark} onPress={handleOrderPress} />
  ), [dark, handleOrderPress, palette]);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} colors={[palette.accent]} />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { backgroundColor: palette.background, borderBottomColor: palette.border }]}>
        <IconButton label="Go back" onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </IconButton>
        <ThemedText style={styles.headerTitle}>My Orders</ThemedText>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.centerContainer} accessibilityLiveRegion="polite">
          <View style={[styles.loadingIcon, { backgroundColor: palette.accentSoft }]}>
            <ActivityIndicator size="small" color={palette.accent} />
          </View>
          <ThemedText style={styles.stateTitle}>Loading your orders</ThemedText>
          <ThemedText style={[styles.stateDescription, { color: palette.muted }]}>Your latest purchases will be here shortly.</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.centerContainer} accessibilityRole="alert">
          <View style={[styles.stateIcon, { backgroundColor: palette.dangerSoft }]}>
            <Ionicons name="cloud-offline-outline" size={34} color={palette.danger} />
          </View>
          <ThemedText style={styles.stateTitle}>Couldn&apos;t load orders</ThemedText>
          <ThemedText style={[styles.stateDescription, { color: palette.muted }]}>{error}</ThemedText>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry loading orders" activeOpacity={0.78} style={[styles.primaryButton, { backgroundColor: palette.accent }]} onPress={loadOrders}>
            <Ionicons name="refresh" size={18} color={palette.onAccent} />
            <Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyContainer} refreshControl={refreshControl}>
          <View style={[styles.emptyArtwork, { backgroundColor: palette.accentSoft, borderColor: palette.border }]}>
            <Ionicons name="receipt-outline" size={52} color={palette.accent} />
            <View style={[styles.emptyArtworkBadge, { backgroundColor: palette.surface, borderColor: palette.background }]}>
              <Ionicons name="sparkles" size={16} color={palette.accent} />
            </View>
          </View>
          <ThemedText style={styles.stateTitle}>No orders yet</ThemedText>
          <ThemedText style={[styles.stateDescription, { color: palette.muted }]}>When you place an order, you can track its progress and details here.</ThemedText>
          <TouchableOpacity accessibilityRole="button" activeOpacity={0.78} style={[styles.primaryButton, { backgroundColor: palette.accent }]} onPress={() => router.push('/(tabs)/category')}>
            <Ionicons name="grid-outline" size={18} color={palette.onAccent} />
            <Text style={[styles.primaryButtonText, { color: palette.onAccent }]}>Browse products</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={(
            <View style={styles.listIntro}>
              <View>
                <ThemedText style={styles.listTitle}>Order history</ThemedText>
                <ThemedText style={[styles.listSubtitle, { color: palette.muted }]}>Track and review your purchases</ThemedText>
              </View>
              <View style={[styles.countBadge, { backgroundColor: palette.accentSoft }]}>
                <ThemedText style={[styles.countText, { color: palette.accent }]}>{orders.length}</ThemedText>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  headerButton: { width: 44, height: 44 },
  headerTitle: { fontSize: 19, lineHeight: 26, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 28 },
  listIntro: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 2 },
  listTitle: { fontSize: 22, lineHeight: 29, fontWeight: '700' },
  listSubtitle: { fontSize: 14, lineHeight: 21, marginTop: 2 },
  countBadge: { minWidth: 36, height: 36, borderRadius: 18, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  orderCard: { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 14, shadowColor: '#07151b', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  orderTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  orderIdentity: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  receiptIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  orderTitleBlock: { minWidth: 0, flex: 1 },
  orderLabel: { fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 1.2 },
  orderNumber: { fontSize: 16, lineHeight: 22, fontWeight: '700', marginTop: 1 },
  statusBadge: { maxWidth: '42%', minHeight: 32, borderRadius: 16, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  statusText: { flexShrink: 1, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  metaPanel: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginTop: 15, paddingHorizontal: 12, paddingVertical: 10 },
  metaItem: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaItemCompact: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaText: { minWidth: 0, fontSize: 13, lineHeight: 19, fontWeight: '500' },
  metaDivider: { width: 1, height: 18, marginHorizontal: 10 },
  orderFooter: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 15, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  totalLabel: { fontSize: 12, lineHeight: 17 },
  totalAmount: { fontSize: 19, lineHeight: 25, fontWeight: '800', marginTop: 1 },
  detailAction: { minHeight: 40, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  detailActionText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingBottom: 58 },
  loadingIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stateIcon: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stateTitle: { fontSize: 21, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  stateDescription: { maxWidth: 330, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 7 },
  primaryButton: { minHeight: 50, borderRadius: 15, paddingHorizontal: 20, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 22 },
  primaryButtonText: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingBottom: 58 },
  emptyArtwork: { width: 128, height: 128, borderRadius: 42, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 24, transform: [{ rotate: '-3deg' }] },
  emptyArtworkBadge: { position: 'absolute', right: 8, bottom: 8, width: 36, height: 36, borderRadius: 18, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
});
