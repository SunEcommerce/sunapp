import { TextInput } from '@/components/ui/text-input';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { selectParentCategories } from '@/store/categoriesSlice';
import { fetchBrands } from '@/utils/api';
import type { ProductFilters } from '@/utils/product-listing';
import { Ionicons } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import Modal from 'react-native-modal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';

export type Filters = ProductFilters;

type Props = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: Filters) => void;
  onReset: () => void;
  initial?: Partial<Filters>;
};

const DEFAULTS: Filters = {
  category: 'all',
  priceRange: [0, 5000],
  brands: [],
  sortBy: 'best',
};

export default function FilterBottomSheet({ visible, onClose, onApply, onReset, initial }: Props) {
  const themeContext = useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  const accent = colorScheme === 'dark' ? '#77d8f2' : '#076783';
  const softAccent = colorScheme === 'dark' ? '#173640' : '#e2f2f7';
  const subtleBorder = colorScheme === 'dark' ? '#35434a' : '#dce3e7';
  const [sliderWidth, setSliderWidth] = useState(240);
  const mergedDefaults = useMemo(() => ({ ...DEFAULTS, ...(initial || {}) }), [initial]);

  // Get categories from Redux
  const parentCategories = useSelector(selectParentCategories);
  const categoryChips = useMemo(() => [
    { value: 'all', label: 'All' },
    ...parentCategories.map(cat => ({ value: cat.slug, label: cat.name || cat.name_mm || 'Category' }))
  ], [parentCategories]);

  // Fetch brands from API
  const [availableBrands, setAvailableBrands] = useState<{ id: number; name: string; slug: string; cover?: string; thumb?: string }[]>([]);
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await fetchBrands();
        const brandsList = response?.data || response?.brands || response || [];
        setAvailableBrands(Array.isArray(brandsList) ? brandsList : []);
      } catch (error) {
        console.error('Failed to fetch brands:', error);
        setAvailableBrands([]);
      }
    };
    loadBrands();
  }, []);

  const [failedLogos, setFailedLogos] = useState<string[]>([]);

  const [category, setCategory] = useState<string>(mergedDefaults.category);
  const [priceRange, setPriceRange] = useState<[number, number]>(mergedDefaults.priceRange || [0, 5000]);
  const [priceChanged, setPriceChanged] = useState(Boolean(initial?.priceRange));
  const [brands, setBrands] = useState<string[]>(mergedDefaults.brands);
  const [sortBy, setSortBy] = useState<Filters['sortBy']>(mergedDefaults.sortBy);

  useEffect(() => {
    if (!visible) return;
    setCategory(mergedDefaults.category);
    setPriceRange(mergedDefaults.priceRange || [0, 5000]);
    setPriceChanged(Boolean(initial?.priceRange));
    setBrands(mergedDefaults.brands);
    setSortBy(mergedDefaults.sortBy);
  }, [visible, mergedDefaults, initial?.priceRange]);

  const validPriceRange = Number.isFinite(priceRange[0]) && Number.isFinite(priceRange[1]) && priceRange[0] >= 0 && priceRange[1] >= priceRange[0];

  const clearAll = () => {
    setCategory('all');
    setPriceRange([0, 5000]);
    setPriceChanged(false);
    setBrands([]);
    setSortBy('best');
    onReset?.();
  };

  const toggleBrand = (brand: { id: number; slug: string }) => {
    const id = String(brand.id);
    setBrands(prev => prev.includes(id) || prev.includes(brand.slug)
      ? prev.filter(value => value !== id && value !== brand.slug)
      : [...prev, id]);
  };

  const apply = () => {
    if (!validPriceRange) return;
    onApply({ category, priceRange: priceChanged ? priceRange : undefined, brands, sortBy });
    onClose();
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      swipeDirection={['down']}
      onSwipeComplete={onClose}
      backdropOpacity={0.4}
      useNativeDriver
      propagateSwipe
    >
      <SafeAreaView edges={['bottom']} style={[styles.sheet, { backgroundColor: themeColors.card }]}>
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.headerTitle}>Refine your search</ThemedText>
            <ThemedText style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>Find the right product for you</ThemedText>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose}
            style={[styles.closeButton, { backgroundColor: themeColors.background }]}>
            <Ionicons name="close" size={22} color={themeColors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Brand logos stay in one swipeable row above categories. */}
          {availableBrands.length > 0 && <>
            <ThemedText style={styles.sectionTitle}>Brand</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              accessibilityLabel="Brands" contentContainerStyle={styles.brandList}>
              {availableBrands.map((brand) => {
                const checked = brands.includes(String(brand.id)) || brands.includes(brand.slug);
                const logo = [brand.cover, brand.thumb].find(uri => uri && !failedLogos.includes(uri));
                return (
                  <TouchableOpacity key={brand.id} accessibilityRole="checkbox"
                    accessibilityLabel={brand.name} accessibilityState={{ checked }}
                    onPress={() => toggleBrand(brand)} activeOpacity={0.8}
                    style={[styles.brandCard, { backgroundColor: checked ? softAccent : themeColors.background,
                      borderColor: checked ? accent : subtleBorder }]}>
                    <View style={styles.brandLogoWell}>
                      {logo ? <Image source={{ uri: logo }} resizeMode="contain" style={styles.brandLogo}
                        accessible={false} onError={() => setFailedLogos(prev => prev.includes(logo) ? prev : [...prev, logo])} />
                        : <ThemedText style={styles.brandInitials}>{brand.name.trim().split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase()}</ThemedText>}
                    </View>
                    <ThemedText numberOfLines={1} style={[styles.brandName, { color: checked ? accent : themeColors.text }]}>{brand.name}</ThemedText>
                    {checked && <View style={[styles.brandCheck, { backgroundColor: accent }]}>
                      <Ionicons name="checkmark" size={12} color={themeColors.card} />
                    </View>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={[styles.divider, { backgroundColor: subtleBorder }]} />
          </>}

          {/* Category Chips */}
          <ThemedText style={styles.sectionTitle}>Category</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            accessibilityLabel="Categories" contentContainerStyle={styles.categoryRows}>
            {[categoryChips.slice(0, Math.ceil(categoryChips.length / 2)), categoryChips.slice(Math.ceil(categoryChips.length / 2))]
              .filter(row => row.length > 0).map((row, rowIndex) => (
              <View key={rowIndex} style={styles.chipsRow}>
            {row.map((chip) => {
              const active = chip.value === category;
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={chip.value}
                  style={[
                    styles.chip,
                    { backgroundColor: active ? softAccent : themeColors.background, borderColor: active ? accent : subtleBorder }
                  ]}
                  onPress={() => setCategory(chip.value)}
                >
                  {active && <Ionicons name="checkmark" size={15} color={accent} />}
                  <ThemedText style={[styles.chipText, { color: active ? accent : themeColors.text }]}>
                    {chip.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
              </View>
            ))}
          </ScrollView>

          <View style={[styles.divider, { backgroundColor: subtleBorder }]} />

          {/* Price Range Slider */}
          <ThemedText style={styles.sectionTitle}>Price range</ThemedText>
          <View style={styles.priceContainer}>
            <View style={styles.priceInputsRow}>

              {/* Min Price Input */}
              <View style={[styles.priceInputContainer, { borderColor: subtleBorder }]}>
                <ThemedText style={[styles.priceLabel, { color: themeColors.textSecondary }]}>Min</ThemedText>
                <ThemedText style={styles.priceInputLabel}>$</ThemedText>
                <TextInput
                  accessibilityLabel="Minimum price"
                  style={[styles.priceInput, { color: themeColors.text }]}
                  // value ကို string အဖြစ်ပြပေးရုံတင်မကဘဲ user ရိုက်နေချိန်မှာ ပျောက်မသွားအောင် handle လုပ်ရပါမယ်
                  value={priceRange[0].toString()}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    setPriceChanged(true);
                    // စာသားကို နံပါတ်ပြောင်းပါ၊ အလွတ်ဖြစ်နေရင် 0 လို့သတ်မှတ်ပါ
                    const val = text === '' ? 0 : parseInt(text.replace(/[^0-9]/g, ''));
                    // Min value သည် Max ထက်မကျော်စေရန် check လုပ်နိုင်သည် (optional)
                    setPriceRange([val, priceRange[1]]);
                  }}
                  placeholderTextColor={themeColors.textSecondary}
                />
              </View>

              <ThemedText style={styles.priceSeparator}>—</ThemedText>

              {/* Max Price Input */}
              <View style={[styles.priceInputContainer, { borderColor: subtleBorder }]}>
                <ThemedText style={[styles.priceLabel, { color: themeColors.textSecondary }]}>Max</ThemedText>
                <ThemedText style={styles.priceInputLabel}>$</ThemedText>
                <TextInput
                  accessibilityLabel="Maximum price"
                  style={[styles.priceInput, { color: themeColors.text }]}
                  value={priceRange[1].toString()}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    setPriceChanged(true);
                    const val = text === '' ? 0 : parseInt(text.replace(/[^0-9]/g, ''));
                    setPriceRange([priceRange[0], val]);
                  }}
                  placeholderTextColor={themeColors.textSecondary}
                />
              </View>
            </View>

            {/* Dual-Thumb Slider */}
            <View style={styles.sliderContainer} onLayout={event => setSliderWidth(Math.max(0, event.nativeEvent.layout.width - 28))}>
              <MultiSlider
                values={validPriceRange ? priceRange : [0, 0]}
                onValuesChange={(values) => { setPriceChanged(true); setPriceRange([values[0], values[1]]); }}
                min={0}
                max={Math.max(5000, ...priceRange.filter(Number.isFinite))}
                step={1} // Step ကို သေးပေးထားရင် Input ရိုက်ရတာ ပိုမှန်ပါလိမ့်မယ်
                sliderLength={sliderWidth}
                selectedStyle={{ ...styles.sliderSelected, backgroundColor: accent }}
                unselectedStyle={{ ...styles.sliderUnselected, backgroundColor: subtleBorder }}
                markerStyle={{ ...styles.sliderMarker, backgroundColor: accent }}
                pressedMarkerStyle={{ ...styles.sliderMarkerPressed, backgroundColor: accent }}
                trackStyle={styles.sliderTrack}
                containerStyle={styles.sliderInnerContainer}
              // Slider ရွှေ့ပြီးမှ state update လုပ်ချင်ရင် onValuesChangeFinish ကို သုံးနိုင်ပါတယ်
              />
            </View>
          </View>

          {!validPriceRange && <ThemedText style={{ paddingHorizontal: 16, color: '#E53935' }}>Enter a valid minimum and maximum price.</ThemedText>}

          <View style={[styles.divider, { backgroundColor: subtleBorder }]} />

          {/* Sort By */}
          <ThemedText style={styles.sectionTitle}>Sort By</ThemedText>
          <View style={styles.sortList}>
            {[
              { key: 'best', label: 'Best Match' },
              { key: 'newest', label: 'Newest' },
              { key: 'price_low_high', label: 'Price Low → High' },
              { key: 'price_high_low', label: 'Price High → Low' },
              { key: 'top_rated', label: 'Top Rated' },
            ].map((opt) => {
              const active = sortBy === (opt.key as Filters['sortBy']);
              return (
                <TouchableOpacity
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  key={opt.key}
                  style={[styles.sortRow, { backgroundColor: active ? softAccent : themeColors.background, borderColor: active ? accent : subtleBorder }]}
                  onPress={() => setSortBy(opt.key as Filters['sortBy'])}
                >
                  <View style={[styles.radioOuter, { borderColor: active ? accent : themeColors.icon }]}>
                    {active && <View style={[styles.radioInner, { backgroundColor: accent }]} />}
                  </View>
                  <ThemedText style={styles.sortLabel}>{opt.label}</ThemedText>
                  {(opt.key === 'price_low_high' || opt.key === 'price_high_low') && (
                    <Ionicons name={opt.key === 'price_low_high' ? 'arrow-up-outline' : 'arrow-down-outline'}
                      size={20} color={active ? accent : themeColors.textSecondary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={[styles.footerBar, { backgroundColor: themeColors.card, borderTopColor: subtleBorder }]}>
          <TouchableOpacity accessibilityRole="button" style={styles.resetBtn} onPress={clearAll}>
            <ThemedText style={[styles.resetText, { color: accent }]}>Reset</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !validPriceRange }} style={[styles.applyBtn, { backgroundColor: accent }, !validPriceRange && { opacity: 0.5 }]} onPress={apply} disabled={!validPriceRange}>
            <ThemedText style={[styles.applyText, { color: themeColors.background }]}>Show products</ThemedText>
            <Ionicons name="arrow-forward" size={18} color={themeColors.background} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
    alignItems: 'center',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    width: '100%',
    maxWidth: 640,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#D0D4DA',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: { fontSize: 13, marginTop: 4 },
  closeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  priceLabel: { fontSize: 12, fontWeight: '500', marginRight: 8 },
  content: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
  },
  categoryRows: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },

  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },


  priceContainer: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  priceInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 0,
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 4,
  },
  priceInput: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    padding: 0,
    textAlign: 'left',
  },
  priceSeparator: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  sliderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  sliderInnerContainer: {
    height: 44,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
  sliderSelected: {
    backgroundColor: '#3d629a',
    height: 6,
    borderRadius: 3,
  },
  sliderUnselected: {
    backgroundColor: '#E0E0E0',
    height: 4,
    borderRadius: 2,
  },
  sliderMarker: {
    backgroundColor: '#0D47A1',
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.2)',
    elevation: 4,
    top: 1.5,
  },
  sliderMarkerPressed: {
    backgroundColor: '#1565C0',
    height: 26,
    width: 26,
    borderRadius: 13,
  },
  brandList: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 2, gap: 10 },
  brandCard: { width: 88, padding: 8, borderWidth: 1, borderRadius: 16, alignItems: 'center', gap: 6 },
  brandLogoWell: { width: 56, height: 44, borderRadius: 10, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  brandLogo: { width: 46, height: 32 },
  brandInitials: { fontSize: 18, fontWeight: '700', color: '#355564' },
  brandName: { fontSize: 12, lineHeight: 18, fontWeight: '600', width: '100%', textAlign: 'center' },
  brandCheck: { position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  sortList: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  sortRow: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9AA4B2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E88E5',
  },
  sortLabel: {
    flex: 1,
    fontSize: 14,
  },
  divider: {
    height: 1,
    marginTop: 14,
    marginBottom: 10,
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  resetBtn: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  resetText: {
    fontSize: 14,
    color: '#1E88E5',
    fontWeight: '600',
  },
  applyBtn: {
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    flex: 1,
    marginLeft: 12,
    backgroundColor: '#0D47A1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
