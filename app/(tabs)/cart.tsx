import { IconButton } from '@/components/ui/icon-button';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useContext, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useTabContentInset } from '@/hooks/use-tab-content-inset';
import { useCart } from '@/contexts/cart-context';
import { ThemeContext } from '@/contexts/theme-context';
import { getAccessToken } from '@/utils/api';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

function EmptyCartArtwork({ dark, accent }: { dark: boolean; accent: string }) {
  return (
    <View style={styles.illustrationContainer} accessible={false} aria-hidden>
      <View style={[styles.artworkHalo, { borderColor: dark ? '#29424e' : '#dceaf0' }]} />
      <View style={[styles.artworkDisc, { backgroundColor: dark ? '#203741' : '#e7f2f6' }]}>
        <Ionicons name="bag-handle-outline" size={52} color={accent} />
      </View>
      <View style={[styles.artworkBadge, { backgroundColor: accent, borderColor: dark ? '#151718' : '#f3f3f3' }]}>
        <Ionicons name="add" size={18} color={dark ? '#10232b' : '#ffffff'} />
      </View>
    </View>
  );
}

export default function CartScreen() {
  const tabContentInset = useTabContentInset();
  const router = useRouter();
  const { items, itemCount, totalAmount, removeFromCart, updateQuantity } = useCart();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const themeContext = useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  const dark = colorScheme === 'dark';
  const accent = dark ? '#8bd8ed' : '#086b83';
  const surface = dark ? '#1b252c' : '#ffffff';
  const border = dark ? '#30414c' : '#e2e8ed';
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Calculate totals
  const subtotal = totalAmount;

  const uniqueItemCount = items.length;

  useFocusEffect(useCallback(() => {
    let active = true;
    const checkLogin = async () => {
      try {
        const token = await getAccessToken();
        if (active) setIsLoggedIn(!!token);
      } catch {
        if (active) setIsLoggedIn(false);
      }
    };
    checkLogin();
    return () => { active = false; };
  }, []));

  const handleRemoveItem = (id: string, name: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${name} from cart?`)) removeFromCart(id);
      return;
    }
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
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <View style={styles.header}>
          <View><ThemedText style={styles.eyebrow}>A little something for you</ThemedText><ThemedText style={styles.headerTitle}>My cart</ThemedText></View>
          <View style={[styles.countPill, { backgroundColor: surface, borderColor: border }]}><ThemedText style={styles.countText}>0 items</ThemedText></View>
        </View>
        <ScrollView contentContainerStyle={[styles.emptyScroll, { paddingBottom: tabContentInset + 24 }]}>
          <View style={styles.emptyContent}>
            <EmptyCartArtwork dark={dark} accent={accent} />
            <ThemedText style={[styles.emptyEyebrow, { color: accent }]}>GOOD FINDS AHEAD</ThemedText>
            <ThemedText accessibilityRole="header" style={styles.heading}>Your cart is waiting</ThemedText>
            <ThemedText style={[styles.subtitle, { color: themeColors.textSecondary }]}>Find something you love. Your next favorite is just a few taps away.</ThemedText>
            <Pressable style={({ pressed }) => [styles.cta, { backgroundColor: accent }, pressed && styles.ctaPressed]}
              onPress={() => router.push('/')} accessibilityRole="button" accessibilityLabel="Explore products">
              <ThemedText style={[styles.ctaText, { color: dark ? '#10232b' : '#ffffff' }]}>Explore products</ThemedText>
              <Ionicons name="arrow-forward" size={19} color={dark ? '#10232b' : '#ffffff'} />
            </Pressable>
            <Pressable onPress={() => router.push('/(tabs)/category')} style={styles.secondaryAction} accessibilityRole="button" accessibilityLabel="Browse categories">
              <Ionicons name="grid-outline" size={16} color={accent} /><ThemedText style={[styles.secondaryText, { color: accent }]}>Browse categories</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Cart with items
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: themeColors.background, paddingBottom: tabContentInset }]}>
      <ThemedView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerCopy}><ThemedText style={styles.eyebrow}>{itemCount} {itemCount === 1 ? 'item' : 'items'} in your selection</ThemedText><ThemedText style={styles.headerTitle}>My cart</ThemedText></View>
          <View style={styles.headerRight}>
            {selectedItems.length > 0 && (
              <IconButton label="Delete selected cart items" onPress={handleDeleteSelected} style={styles.headerButton}>
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
              </IconButton>
            )}
            <TouchableOpacity onPress={toggleEditMode} style={styles.headerButton} accessibilityRole="button" accessibilityLabel={isEditMode ? 'Finish editing cart' : 'Edit cart'}>
              <ThemedText style={[styles.editText, { color: accent }]}>{isEditMode ? 'Done' : 'Edit'}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.cartContent} showsVerticalScrollIndicator={false}>
          {/* Cart Items */}
          <View style={styles.itemsContainer}>
            {items.map((item) => (
              <View key={item.id} style={[styles.cartItem, { backgroundColor: surface, borderColor: border }]}>
                {/* Checkbox for edit mode */}
                {isEditMode && (
                  <TouchableOpacity
                    accessibilityRole="checkbox"
                    accessibilityLabel={`Select ${item.name}`}
                    accessibilityState={{ checked: selectedItems.includes(item.id) }}
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

                <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="contain" accessibilityLabel={item.name} />

                <View style={styles.itemDetails}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <ThemedText style={styles.productName}>{item.name}</ThemedText>
                      <ThemedText style={[styles.productSku, { color: themeColors.textSecondary }]}>
                        SKU: {item.sku}
                      </ThemedText>
                      {item.variation_names && (
                        <ThemedText style={[styles.productVariant, { color: accent }]}>
                          {item.variation_names}
                        </ThemedText>
                      )}
                    </View>

                    <IconButton label={`Remove ${item.name} from cart`}
                      onPress={() => handleRemoveItem(item.id, item.name)}
                      style={styles.removeButton}>
                      <Ionicons name="trash-outline" size={18} color={themeColors.textSecondary} />
                    </IconButton>
                  </View>

                  <View style={styles.itemFooter}>
                    <ThemedText style={styles.itemPrice}>${item.price.toFixed(2)}</ThemedText>

                    {!isEditMode && (
                      <View style={[styles.quantityControl, { borderColor: border, backgroundColor: themeColors.background }]}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Decrease quantity of ${item.name}`}
                          disabled={item.quantity <= 1}
                          accessibilityState={{ disabled: item.quantity <= 1 }}
                          onPress={() => handleQuantityChange(item.id, -1, item.quantity)}
                          style={[styles.quantityButton, item.quantity <= 1 && { opacity: 0.35 }]}>
                          <ThemedText style={[styles.quantityButtonText, { color: accent }]}>−</ThemedText>
                        </TouchableOpacity>

                        <ThemedText style={styles.quantity}>{item.quantity}</ThemedText>

                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Increase quantity of ${item.name}`}
                          onPress={() => handleQuantityChange(item.id, 1, item.quantity)}
                          style={styles.quantityButton}>
                          <ThemedText style={[styles.quantityButtonText, { color: accent }]}>+</ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Order Summary */}
          <View style={[styles.summarySection, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText style={styles.summaryTitle}>Order summary</ThemedText>
            <View style={styles.summaryRow}>
              <ThemedText style={[styles.summaryLabel, { color: themeColors.textSecondary }]}>Subtotal</ThemedText>
              <ThemedText style={styles.summaryValue}>${subtotal.toFixed(2)}</ThemedText>
            </View>

            <ThemedText style={{ color: themeColors.textSecondary, fontSize: 14 }}>
              Coupons and delivery fees are calculated at checkout.
            </ThemedText>
          </View>
        </ScrollView>
      </ThemedView>

        {/* Checkout Button */}
        <View style={[styles.checkoutContainer, { backgroundColor: surface, borderTopColor: border }]}>
          <View style={styles.checkoutContent}>
          <View style={styles.summaryRow}><ThemedText style={{ color: themeColors.textSecondary }}>Subtotal · {uniqueItemCount} {uniqueItemCount === 1 ? 'product' : 'products'}</ThemedText><ThemedText style={styles.checkoutAmount}>${subtotal.toFixed(2)}</ThemedText></View>
          {isLoggedIn === false ? (
            <TouchableOpacity
              style={[styles.checkoutButton, { backgroundColor: accent }]}
              accessibilityRole="button"
              onPress={() => router.push('/Auth')}>
              <ThemedText style={[styles.checkoutButtonText, { color: dark ? '#10232b' : '#ffffff' }]}>Sign in to checkout</ThemedText>
              <Ionicons name="arrow-forward" size={20} color={dark ? '#10232b' : '#ffffff'} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.checkoutButton, { backgroundColor: accent }]}
              accessibilityRole="button"
              disabled={isLoggedIn === null}
              accessibilityState={{ disabled: isLoggedIn === null }}
              onPress={() => router.push('/Checkout')}>
              <ThemedText style={[styles.checkoutButtonText, { color: dark ? '#10232b' : '#ffffff' }]}>{isLoggedIn === null ? 'Preparing checkout…' : 'Continue to checkout'}</ThemedText>
              <Ionicons name="arrow-forward" size={20} color={dark ? '#10232b' : '#ffffff'} />
            </TouchableOpacity>
          )}

          </View>
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { width: '100%', maxWidth: 760, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18, gap: 12 },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 12, lineHeight: 18, opacity: 0.75, marginBottom: 3 },
  headerTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.8 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  editText: { fontSize: 14, fontWeight: '600' },
  countPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  countText: { fontSize: 12, lineHeight: 20, fontWeight: '600' },
  emptyScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 24 },
  emptyContent: { width: '100%', maxWidth: 380, alignSelf: 'center', alignItems: 'center' },
  illustrationContainer: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  artworkHalo: { position: 'absolute', width: 166, height: 166, borderRadius: 83, borderWidth: 1 },
  artworkDisc: { width: 126, height: 126, borderRadius: 63, alignItems: 'center', justifyContent: 'center' },
  artworkBadge: { position: 'absolute', right: 22, bottom: 25, width: 32, height: 32, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  emptyEyebrow: { fontSize: 10, lineHeight: 16, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  heading: { fontSize: 27, lineHeight: 34, fontWeight: '700', textAlign: 'center', letterSpacing: -0.7 },
  subtitle: { fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 290, marginTop: 12, marginBottom: 28 },
  cta: { width: '100%', maxWidth: 290, minHeight: 52, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  ctaPressed: { opacity: 0.8 },
  ctaText: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  secondaryAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, paddingHorizontal: 16 },
  secondaryText: { fontSize: 13, lineHeight: 20, fontWeight: '600' },
  scrollView: { flex: 1 },
  cartContent: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingBottom: 20 },
  itemsContainer: { paddingHorizontal: 16, gap: 12 },
  cartItem: { flexDirection: 'row', borderRadius: 20, borderWidth: 1, padding: 12, gap: 12, alignItems: 'flex-start' },
  checkboxContainer: { minWidth: 44, minHeight: 44, justifyContent: 'center' },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#086b83', borderColor: '#086b83' },
  productImage: { width: 72, height: 84, borderRadius: 12, backgroundColor: '#f5f7f8' },
  itemDetails: { flex: 1, minWidth: 0 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  itemInfo: { flex: 1, minWidth: 0, gap: 2 },
  productName: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  productSku: { fontSize: 11, lineHeight: 17 },
  productVariant: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  removeButton: { padding: 0, marginTop: -8, marginRight: -6 },
  itemFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  itemPrice: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  quantityButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  quantityButtonText: { fontSize: 21, lineHeight: 26, fontWeight: '500' },
  quantity: { fontSize: 14, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  summarySection: { margin: 16, padding: 18, borderRadius: 20, borderWidth: 1, gap: 14 },
  summaryTitle: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 14, lineHeight: 22 },
  summaryValue: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  checkoutContainer: { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  checkoutContent: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 12 },
  checkoutAmount: { fontSize: 23, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5 },
  checkoutButton: { minHeight: 52, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  checkoutButtonText: { fontSize: 15, lineHeight: 22, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
});
