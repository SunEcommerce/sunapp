import { Ionicons } from '@expo/vector-icons';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
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
      <SafeAreaView style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Filters</Text>
          <TouchableOpacity onPress={clearAll}>
            <Text style={styles.clearAll}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Category Chips */}
          <Text style={styles.sectionTitle}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {CATEGORY_CHIPS.map((chip) => {
              const active = chip === category;
              return (
                <TouchableOpacity
                  key={chip}
                  style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
                  onPress={() => setCategory(chip)}
                >
                  <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                    {chip}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.divider} />

          {/* Price Range Slider */}
          <Text style={styles.sectionTitle}>Price Range</Text>
          <View style={styles.sliderContainer}>
            <MultiSlider
              values={[priceRange[0], priceRange[1]]}
              onValuesChangeFinish={(vals) => setPriceRange([vals[0], vals[1]] as [number, number])}
              min={100}
              max={2000}
              step={10}
              sliderLength={280}
              selectedStyle={{ backgroundColor: '#1E88E5' }}
              unselectedStyle={{ backgroundColor: '#E5E5E5' }}
              markerStyle={{ backgroundColor: '#1E88E5', width: 20, height: 20, borderRadius: 10 }}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>$100</Text>
              <Text style={styles.sliderLabel}>$2000</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Brand Selection */}
          <Text style={styles.sectionTitle}>Brand</Text>
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
                  <Text style={styles.brandName}>{b}</Text>
                  <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                    {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.divider} />

          {/* Sort By */}
          <Text style={styles.sectionTitle}>Sort By</Text>
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
                  <Text style={styles.sortLabel}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={styles.footerBar}>
          <TouchableOpacity style={styles.resetBtn} onPress={clearAll}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn} onPress={apply}>
            <Text style={styles.applyText}>Apply Filters</Text>
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
    backgroundColor: '#FFFFFF',
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
    color: '#111',
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
    color: '#111',
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
  chipInactive: {
    backgroundColor: '#F0F2F5',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  chipTextInactive: {
    color: '#111',
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
    color: '#666',
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
    color: '#111',
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
    color: '#111',
  },
  divider: {
    height: 1,
    backgroundColor: '#ECEFF3',
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
    borderTopColor: '#ECEFF3',
    backgroundColor: '#fff',
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
