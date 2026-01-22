import { useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { fetchCategoryTree } from '@/utils/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Category = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  status: number;
  parent_id: number | null;
  thumb: string;
  cover: string;
  children?: Category[];
};

function getAllChildren(category: Category): Category[] {
  let allChildren: Category[] = [];
  
  if (category.children && category.children.length > 0) {
    for (const child of category.children) {
      allChildren.push(child);
      // Recursively get children of children
      allChildren = allChildren.concat(getAllChildren(child));
    }
  }
  
  return allChildren;
}

export default function CategoryScreen() {
  const router = useRouter();
  const themeContext = useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await fetchCategoryTree();
      // Filter only parent categories (parent_id is null)
      const parentCategories = data.filter((cat: Category) => cat.parent_id === null);
      setCategories(parentCategories);
      
      // Set first category as active
      if (parentCategories.length > 0) {
        const firstCategory = parentCategories[0];
        setActiveCategory(firstCategory.id);
        setSubcategories(getAllChildren(firstCategory));
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCategory !== null) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const category = categories.find(cat => cat.id === activeCategory);
      if (category) {
        setSubcategories(getAllChildren(category));
      }
    }
  }, [activeCategory]);

  const renderMainCategory = ({ item }: { item: Category }) => {
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
        <Image source={{ uri: item.cover }} style={styles.mainCategoryImage} />
        <ThemedText style={[styles.mainCategoryText, isActive && styles.mainCategoryTextActive]}>{item.name}</ThemedText>
      </TouchableOpacity>
    );
  };

  const renderSubCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[styles.subCategoryCard, { backgroundColor: themeColors.card }]}
      onPress={() => router.push(`/ProductList?category=${item.slug}`)}
    >
      <Image source={{ uri: item.cover }} style={styles.subCategoryImage} />
      <ThemedText style={styles.subCategoryText}>{item.name}</ThemedText>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#1E88E5" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.borderColor }]}>
        <ThemedText style={styles.headerTitle}>Category</ThemedText>
      </View>

      <View style={styles.container}>
        <View style={[styles.leftColumn, { backgroundColor: themeColors.card }]}>
          <FlatList
            data={categories}
            renderItem={renderMainCategory}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <View style={[styles.dividerShadow, { backgroundColor: themeColors.borderColor }]} />

        <View style={[styles.rightColumn, { backgroundColor: themeColors.card }]}>
          <FlatList
            data={subcategories}
            renderItem={renderSubCategory}
            keyExtractor={(item) => item.id.toString()}
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mainCategoryItemActive: {},
  mainCategoryImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginBottom: 6,
    resizeMode: 'cover',
  },
  mainCategoryText: {
    fontSize: 12,
    textAlign: 'center',
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
