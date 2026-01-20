import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { Ionicons } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import React, { useContext, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import Modal from 'react-native-modal';

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

const CATEGORY_CHIPS = ['All', 'Mobiles', 'Tablets', 'Laptops'];
const BRANDS = ['Samsung', 'OPPO', 'Apple', 'Dell', 'Sony'];
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
            {CATEGORY_CHIPS.map((chip) => {
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
          <ThemedText style={styles.sectionTitle}>Price Range</ThemedText>
          <View style={styles.sliderContainer}>
            <MultiSlider
              values={[priceRange[0], priceRange[1]]}
              onValuesChangeFinish={(vals) => setPriceRange([vals[0], vals[1]] as [number, number])}
              min={100}
              max={2000}
              step={10}
              sliderLength={280}
              selectedStyle={{ backgroundColor: '#1E88E5' }}
              unselectedStyle={{ backgroundColor: themeColors.borderColor }}
              markerStyle={{ backgroundColor: '#1E88E5', width: 20, height: 20, borderRadius: 10 }}
            />
            <View style={styles.sliderLabels}>
              <ThemedText style={styles.sliderLabel}>$100</ThemedText>
              <ThemedText style={styles.sliderLabel}>$2000</ThemedText>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: themeColors.borderColor }]} />

          {/* Brand Selection */}
          <ThemedText style={styles.sectionTitle}>Brand</ThemedText>
          <View style={styles.brandList}>
            {BRANDS.map((b) => {
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
  sliderContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  sliderLabels: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontSize: 12,
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
