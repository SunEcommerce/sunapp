import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { selectParentCategories } from '@/store/categoriesSlice';
import { fetchBrands } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Modal from 'react-native-modal';
import { useSelector } from 'react-redux';

export type Filters = {
  category: string;
  priceRange: [number, number];
  brands: string[];
  sortBy: 'newest' | 'price_low_high';
  minPrice?: number;
  maxPrice?: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: Filters) => void;
  onReset: () => void;
  initial?: Partial<Filters>;
};

const DEFAULTS: Filters = {
  category: 'All',
  priceRange: [100, 2000],
  brands: ['Apple'],
  sortBy: 'newest',
};

export default function FilterBottomSheet({ visible, onClose, onApply, onReset, initial }: Props) {
  const themeContext = useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  const mergedDefaults = useMemo(() => ({ ...DEFAULTS, ...(initial || {}) }), [initial]);

  // Get categories from Redux
  const parentCategories = useSelector(selectParentCategories);
  const categoryChips = useMemo(() => [
    'All',
    ...parentCategories.map(cat => cat.name || cat.name_mm || 'Category')
  ], [parentCategories]);

  // Fetch brands from API
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const response = await fetchBrands();
        const brandsList = response?.data || response?.brands || response || [];
        const brandNames = brandsList.map((b: any) => b.name || 'Brand').filter(Boolean);
        setAvailableBrands(brandNames);
      } catch (error) {
        console.error('Failed to fetch brands:', error);
        setAvailableBrands([]);
      }
    };
    loadBrands();
  }, []);

  const [category, setCategory] = useState<string>(mergedDefaults.category);
  const [priceRange, setPriceRange] = useState<[number, number]>(mergedDefaults.priceRange);
  const [brands, setBrands] = useState<string[]>(mergedDefaults.brands);
  const [sortBy, setSortBy] = useState<Filters['sortBy']>(mergedDefaults.sortBy);

  const clearAll = () => {
    setCategory('All');
    setPriceRange([100, 2000]);
    setBrands([]);
    setSortBy('newest');
    onReset?.();
  };

  const toggleBrand = (b: string) => {
    setBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  };

  const apply = () => {
    onApply({ category, priceRange, brands, sortBy });
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
              const active = chip === category;
              return (
                <TouchableOpacity
                  key={chip}
                  style={[
                    styles.chip,
                    active ? styles.chipActive : { backgroundColor: themeColors.background, borderWidth: 1, borderColor: themeColors.borderColor }
                  ]}
                  onPress={() => setCategory(chip)}
                >
                  <ThemedText style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                    {chip}
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
                values={[priceRange[0], priceRange[1]]}
                onValuesChange={(values) => setPriceRange([values[0], values[1]])}
                min={0}
                max={5000}
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

          <View style={[styles.divider, { backgroundColor: themeColors.borderColor }]} />

          {/* Brand Selection */}
          <ThemedText style={styles.sectionTitle}>Brand</ThemedText>
          <View style={styles.brandList}>
            {availableBrands.map((b) => {
              const checked = brands.includes(b);
              return (
                <TouchableOpacity
                  key={b}
                  style={styles.brandRow}
                  onPress={() => toggleBrand(b)}
                  activeOpacity={0.8}
                >
                  <ThemedText style={styles.brandName}>{b}</ThemedText>
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
              { key: 'newest', label: 'Newest' },
              { key: 'price_low_high', label: 'Price Low → High' },
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
          <TouchableOpacity style={styles.applyBtn} onPress={apply}>
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
