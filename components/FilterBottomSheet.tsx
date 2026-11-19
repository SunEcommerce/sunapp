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
  ScrollView,
  StyleSheet,
  TextInput,
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
  const mergedDefaults = useMemo(() => ({ ...DEFAULTS, ...(initial || {}) }), [initial]);

  // Get categories from Redux
  const parentCategories = useSelector(selectParentCategories);
  const categoryChips = useMemo(() => [
    { value: 'all', label: 'All' },
    ...parentCategories.map(cat => ({ value: cat.slug, label: cat.name || cat.name_mm || 'Category' }))
  ], [parentCategories]);

  // Fetch brands from API
  const [availableBrands, setAvailableBrands] = useState<{ id: number; name: string; slug: string }[]>([]);
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await fetchBrands();
        const brandsList = response?.data || response?.brands || response || [];
        setAvailableBrands(brandsList);
      } catch (error) {
        console.error('Failed to fetch brands:', error);
        setAvailableBrands([]);
      }
    };
    loadBrands();
  }, []);

  const [category, setCategory] = useState<string>(mergedDefaults.category);
  const [priceRange, setPriceRange] = useState<[number, number]>(mergedDefaults.priceRange || [0, 5000]);
  const [priceChanged, setPriceChanged] = useState(Boolean(mergedDefaults.priceRange));
  const [brands, setBrands] = useState<string[]>(mergedDefaults.brands);
  const [sortBy, setSortBy] = useState<Filters['sortBy']>(mergedDefaults.sortBy);

  useEffect(() => {
    if (!visible) return;
    setCategory(mergedDefaults.category);
    setPriceRange(mergedDefaults.priceRange || [0, 5000]);
    setPriceChanged(Boolean(mergedDefaults.priceRange));
    setBrands(mergedDefaults.brands);
    setSortBy(mergedDefaults.sortBy);
  }, [visible, mergedDefaults]);

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
      <SafeAreaView style={[styles.sheet, { backgroundColor: themeColors.card }]}>
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          <ThemedText style={styles.headerTitle}>Filters</ThemedText>
          <TouchableOpacity onPress={clearAll}>
            <ThemedText style={styles.clearAll}>Clear All</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Category Chips */}
          <ThemedText style={styles.sectionTitle}>Category</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {categoryChips.map((chip) => {
              const active = chip.value === category;
              return (
                <TouchableOpacity
                  key={chip.value}
                  style={[
                    styles.chip,
                    active ? styles.chipActive : { backgroundColor: themeColors.background, borderWidth: 1, borderColor: themeColors.borderColor }
                  ]}
                  onPress={() => setCategory(chip.value)}
                >
                  <ThemedText style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                    {chip.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.divider, { backgroundColor: themeColors.borderColor }]} />

          {/* Price Range Slider */}
          <ThemedText style={styles.sectionTitle}>Price</ThemedText>
          <View style={styles.priceContainer}>
            <View style={styles.priceInputsRow}>

              {/* Min Price Input */}
              <View style={[styles.priceInputContainer, { borderColor: themeColors.borderColor }]}>
                <ThemedText style={styles.priceInputLabel}>$</ThemedText>
                <TextInput
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
              <View style={[styles.priceInputContainer, { borderColor: themeColors.borderColor }]}>
                <ThemedText style={styles.priceInputLabel}>$</ThemedText>
                <TextInput
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
            <View style={styles.sliderContainer}>
              <MultiSlider
                values={validPriceRange ? priceRange : [0, 0]}
                onValuesChange={(values) => { setPriceChanged(true); setPriceRange([values[0], values[1]]); }}
                min={0}
                max={Math.max(5000, ...priceRange.filter(Number.isFinite))}
                step={1} // Step ကို သေးပေးထားရင် Input ရိုက်ရတာ ပိုမှန်ပါလိမ့်မယ်
                sliderLength={280}
                selectedStyle={styles.sliderSelected}
                unselectedStyle={styles.sliderUnselected}
                markerStyle={styles.sliderMarker}
                pressedMarkerStyle={styles.sliderMarkerPressed}
                trackStyle={styles.sliderTrack}
                containerStyle={styles.sliderInnerContainer}
              // Slider ရွှေ့ပြီးမှ state update လုပ်ချင်ရင် onValuesChangeFinish ကို သုံးနိုင်ပါတယ်
              />
            </View>
          </View>

          {!validPriceRange && <ThemedText style={{ paddingHorizontal: 16, color: '#E53935' }}>Enter a valid minimum and maximum price.</ThemedText>}

          <View style={[styles.divider, { backgroundColor: themeColors.borderColor }]} />

          {/* Brand Selection */}
          <ThemedText style={styles.sectionTitle}>Brand</ThemedText>
          <View style={styles.brandList}>
            {availableBrands.map((b) => {
              const checked = brands.includes(String(b.id)) || brands.includes(b.slug);
              return (
                <TouchableOpacity
                  key={b.id}
                  style={styles.brandRow}
                  onPress={() => toggleBrand(b)}
                  activeOpacity={0.8}
                >
                  <ThemedText style={styles.brandName}>{b.name}</ThemedText>
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.divider, { backgroundColor: themeColors.borderColor }]} />

          {/* Sort By */}
          <ThemedText style={styles.sectionTitle}>Sort By</ThemedText>
          <View style={styles.sortList}>
            {[
              { key: 'best', label: 'Best Match' },
              { key: 'newest', label: 'Newest' },
              { key: 'price_low_high', label: 'Price Low → High' },
              { key: 'top_rated', label: 'Top Rated' },
            ].map((opt) => {
              const active = sortBy === (opt.key as Filters['sortBy']);
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.sortRow}
                  onPress={() => setSortBy(opt.key as Filters['sortBy'])}
                >
                  <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                    {active && <View style={styles.radioInner} />}
                  </View>
                  <ThemedText style={styles.sortLabel}>{opt.label}</ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={[styles.footerBar, { backgroundColor: themeColors.card, borderTopColor: themeColors.borderColor }]}>
          <TouchableOpacity style={styles.resetBtn} onPress={clearAll}>
            <ThemedText style={styles.resetText}>Reset</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.applyBtn, !validPriceRange && { opacity: 0.5 }]} onPress={apply} disabled={!validPriceRange}>
            <ThemedText style={styles.applyText}>Apply Filters</ThemedText>
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
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
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
    fontSize: 18,
    fontWeight: '700',
  },
  clearAll: {
    fontSize: 14,
    color: '#1E88E5',
    fontWeight: '600',
  },
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
  chipsRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: '#0D47A1',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  chipTextInactive: {
    fontWeight: '600',
  },
  priceContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  priceInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 120,
    flex: 1,
  },
  priceInputLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 4,
  },
  priceInput: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    padding: 0,
    textAlign: 'left',
  },
  priceSeparator: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  sliderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  sliderInnerContainer: {
    height: 40,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    top: 1.5,
  },
  sliderMarkerPressed: {
    backgroundColor: '#1565C0',
    height: 26,
    width: 26,
    borderRadius: 13,
  },
  brandList: {
    paddingHorizontal: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brandName: {
    fontSize: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#1E88E5',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#1E88E5',
  },
  sortList: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  sortRow: {
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
  radioOuterActive: {
    borderColor: '#1E88E5',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E88E5',
  },
  sortLabel: {
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
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  resetText: {
    fontSize: 14,
    color: '#1E88E5',
    fontWeight: '600',
  },
  applyBtn: {
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
