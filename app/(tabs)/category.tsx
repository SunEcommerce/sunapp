import { useContext, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type MainCategory = {
  id: string;
  name: string;
};

type SubCategory = {
  id: string;
  name: string;
  image: string;
};

const MAIN_CATEGORIES: MainCategory[] = [
  { id: 'electronics', name: 'Electronics' },
  { id: 'fashion', name: 'Fashion' },
  { id: 'home', name: 'Home' },
  { id: 'sports', name: 'Sports' },
  { id: 'books', name: 'Books' },
  { id: 'beauty', name: 'Beauty' },
];

const SUBCATEGORY_MAP: Record<string, SubCategory[]> = {
  electronics: [
    { id: 'phones', name: 'Smartphones', image: 'https://placehold.co/200x200?text=Phones' },
    { id: 'laptops', name: 'Laptops', image: 'https://placehold.co/200x200?text=Laptops' },
    { id: 'audio', name: 'Audio', image: 'https://placehold.co/200x200?text=Audio' },
    { id: 'cameras', name: 'Cameras', image: 'https://placehold.co/200x200?text=Cameras' },
  ],
  fashion: [
    { id: 'men', name: 'Men', image: 'https://placehold.co/200x200?text=Men' },
    { id: 'women', name: 'Women', image: 'https://placehold.co/200x200?text=Women' },
    { id: 'accessories', name: 'Accessories', image: 'https://placehold.co/200x200?text=Accessories' },
    { id: 'shoes', name: 'Shoes', image: 'https://placehold.co/200x200?text=Shoes' },
  ],
  home: [
    { id: 'kitchen', name: 'Kitchen', image: 'https://placehold.co/200x200?text=Kitchen' },
    { id: 'decor', name: 'Decor', image: 'https://placehold.co/200x200?text=Decor' },
    { id: 'furniture', name: 'Furniture', image: 'https://placehold.co/200x200?text=Furniture' },
    { id: 'bedding', name: 'Bedding', image: 'https://placehold.co/200x200?text=Bedding' },
  ],
  sports: [
    { id: 'fitness', name: 'Fitness', image: 'https://placehold.co/200x200?text=Fitness' },
    { id: 'outdoor', name: 'Outdoor', image: 'https://placehold.co/200x200?text=Outdoor' },
    { id: 'team', name: 'Team Sports', image: 'https://placehold.co/200x200?text=Team' },
    { id: 'cycling', name: 'Cycling', image: 'https://placehold.co/200x200?text=Cycling' },
  ],
  books: [
    { id: 'fiction', name: 'Fiction', image: 'https://placehold.co/200x200?text=Fiction' },
    { id: 'nonfiction', name: 'Non-fiction', image: 'https://placehold.co/200x200?text=Nonfiction' },
    { id: 'kids', name: 'Kids', image: 'https://placehold.co/200x200?text=Kids' },
    { id: 'comics', name: 'Comics', image: 'https://placehold.co/200x200?text=Comics' },
  ],
  beauty: [
    { id: 'skincare', name: 'Skincare', image: 'https://placehold.co/200x200?text=Skincare' },
    { id: 'makeup', name: 'Makeup', image: 'https://placehold.co/200x200?text=Makeup' },
    { id: 'hair', name: 'Hair Care', image: 'https://placehold.co/200x200?text=Hair' },
    { id: 'fragrance', name: 'Fragrance', image: 'https://placehold.co/200x200?text=Fragrance' },
  ],
};

export default function CategoryScreen() {
  const themeContext = useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  
  const [activeCategory, setActiveCategory] = useState<string>(MAIN_CATEGORIES[0].id);
  const [subcategories, setSubcategories] = useState<SubCategory[]>(SUBCATEGORY_MAP[MAIN_CATEGORIES[0].id]);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSubcategories(SUBCATEGORY_MAP[activeCategory] || []);
  }, [activeCategory]);

  const renderMainCategory = ({ item }: { item: MainCategory }) => {
    const isActive = item.id === activeCategory;
    return (
      <TouchableOpacity
        style={[
          styles.mainCategoryItem,
          { borderBottomColor: themeColors.borderColor },
          isActive && { backgroundColor: colorScheme === 'dark' ? '#1a2a3a' : '#F2F7FF' },
        ]}
        onPress={() => setActiveCategory(item.id)}
      >
        <View style={[styles.accentBar, isActive && styles.accentBarActive]} />
        <ThemedText style={[styles.mainCategoryText, isActive && styles.mainCategoryTextActive]}>{item.name}</ThemedText>
      </TouchableOpacity>
    );
  };

  const renderSubCategory = ({ item }: { item: SubCategory }) => (
    <View style={[styles.subCategoryCard, { backgroundColor: themeColors.card }]}>
      <Image source={{ uri: item.image }} style={styles.subCategoryImage} />
      <ThemedText style={styles.subCategoryText}>{item.name}</ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <View style={styles.container}>
        <View style={[styles.leftColumn, { backgroundColor: themeColors.card }]}>
          <FlatList
            data={MAIN_CATEGORIES}
            renderItem={renderMainCategory}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <View style={[styles.dividerShadow, { backgroundColor: themeColors.borderColor }]} />

        <View style={[styles.rightColumn, { backgroundColor: themeColors.card }]}>
          <FlatList
            data={subcategories}
            renderItem={renderSubCategory}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.subCategoryRow}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.subCategoryList}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  leftColumn: {
    width: '30%',
  },
  rightColumn: {
    flex: 1,
  },
  dividerShadow: {
    width: 1,
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  mainCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mainCategoryItemActive: {},
  accentBar: {
    width: 4,
    height: '100%',
    marginRight: 10,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  accentBarActive: {
    backgroundColor: '#1E88E5',
  },
  mainCategoryText: {
    fontSize: 15,
  },
  mainCategoryTextActive: {
    color: '#1E88E5',
    fontWeight: '700',
  },
  subCategoryList: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 24,
  },
  subCategoryRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subCategoryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  subCategoryImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginBottom: 8,
    resizeMode: 'cover',
  },
  subCategoryText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
});
