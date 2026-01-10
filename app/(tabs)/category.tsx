import { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

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
        style={[styles.mainCategoryItem, isActive && styles.mainCategoryItemActive]}
        onPress={() => setActiveCategory(item.id)}
      >
        <View style={[styles.accentBar, isActive && styles.accentBarActive]} />
        <Text style={[styles.mainCategoryText, isActive && styles.mainCategoryTextActive]}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderSubCategory = ({ item }: { item: SubCategory }) => (
    <View style={styles.subCategoryCard}>
      <Image source={{ uri: item.image }} style={styles.subCategoryImage} />
      <Text style={styles.subCategoryText}>{item.name}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.leftColumn}>
          <FlatList
            data={MAIN_CATEGORIES}
            renderItem={renderMainCategory}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <View style={styles.dividerShadow} />

        <View style={styles.rightColumn}>
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
    backgroundColor: '#F7F7F7',
  },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  leftColumn: {
    width: '30%',
    backgroundColor: '#FFFFFF',
  },
  rightColumn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  dividerShadow: {
    width: 1,
    backgroundColor: '#E5E5E5',
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
    borderBottomColor: '#F0F0F0',
  },
  mainCategoryItemActive: {
    backgroundColor: '#F2F7FF',
  },
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
    color: '#444',
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
    backgroundColor: '#FAFAFA',
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
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
});
