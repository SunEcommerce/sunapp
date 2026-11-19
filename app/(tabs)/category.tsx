import { useRouter } from 'expo-router';
import { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Platform,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { CategoryThumbnail } from '@/components/category-thumbnail';
import { categoryDescendants, categoryImageSources } from '@/utils/category-images';
import { useTabContentInset } from '@/hooks/use-tab-content-inset';
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

export default function CategoryScreen() {
  const tabContentInset = useTabContentInset();
  const router = useRouter();
  const themeContext = useContext(ThemeContext);
  const colorScheme = themeContext?.colorScheme ?? 'light';
  const themeColors = Colors[colorScheme];
  const dark = colorScheme === 'dark';
  const border = dark ? '#30404b' : '#e0e6ec';
  const accent = dark ? '#94ddee' : '#086b83';
  const surface = dark ? '#1b252c' : '#ffffff';

  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [subcategories, setSubcategories] = useState<(Category & { imageSources: string[] })[]>([]);
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
        setSubcategories(categoryDescendants(firstCategory));
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
        setSubcategories(categoryDescendants(category));
      }
    }
  }, [activeCategory, categories]);

  const renderMainCategory = ({ item }: { item: Category }) => {
    const isActive = item.id === activeCategory;
    return (
      <TouchableOpacity
        style={[
          styles.mainCategoryItem,
          { borderColor: isActive ? accent : 'transparent', backgroundColor: isActive ? (dark ? '#213c49' : '#eaf5f9') : 'transparent' },
        ]}
        accessibilityRole="button"
        accessibilityLabel={item.name}
        accessibilityState={{ selected: isActive }}
        onPress={() => setActiveCategory(item.id)}
      >
        <CategoryThumbnail sources={categoryImageSources(item)} size={40} color={accent} background={surface} />
        <ThemedText numberOfLines={1} ellipsizeMode="tail" style={[styles.mainCategoryText, isActive && { color: accent, fontWeight: '700' }]}>{item.name}</ThemedText>
      </TouchableOpacity>
    );
  };

  const renderSubCategory = ({ item }: { item: Category & { imageSources: string[] } }) => (
    <TouchableOpacity
      style={[styles.subCategoryCard, { backgroundColor: surface, borderColor: border }]}
      accessibilityRole="button"
      accessibilityLabel={item.name}
      onPress={() => router.push(`/ProductList?category=${item.slug}`)}
    >
      <CategoryThumbnail sources={item.imageSources} size={56} color={accent} background={themeColors.background} />
      <ThemedText numberOfLines={1} ellipsizeMode="tail" style={styles.subCategoryText}>{item.name}</ThemedText>
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
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ThemedView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.background, borderBottomColor: border }]}>
          <ThemedText style={styles.headerTitle}>Category</ThemedText>
        </View>

        <View style={styles.container}>
          <View style={[styles.leftColumn, { backgroundColor: themeColors.background }]}>
            <FlatList
              data={categories}
              contentContainerStyle={{ paddingHorizontal: 6, paddingTop: 6, paddingBottom: tabContentInset }}
              scrollIndicatorInsets={{ bottom: tabContentInset }}
              renderItem={renderMainCategory}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: border }]} />

          <View style={[styles.rightColumn, { backgroundColor: themeColors.background }]}>
            <FlatList
              data={subcategories}
              renderItem={renderSubCategory}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.subCategoryRow}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.subCategoryList, { paddingBottom: tabContentInset }]}
              scrollIndicatorInsets={{ bottom: tabContentInset }}
            />
          </View>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 18, lineHeight: 26, fontWeight: '700', textAlign: 'center' },
  container: { flex: 1, flexDirection: 'row' },
  leftColumn: { width: '28%', minWidth: 96, maxWidth: 152 },
  rightColumn: { flex: 1, minWidth: 0 },
  divider: { width: StyleSheet.hairlineWidth },
  mainCategoryItem: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 4, borderWidth: 1, borderRadius: 12, marginBottom: 4, gap: 5, minHeight: 76 },
  mainCategoryText: { width: '100%', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  subCategoryList: { paddingHorizontal: 10, paddingTop: 10 },
  subCategoryRow: { gap: 8, marginBottom: 8 },
  subCategoryCard: { flex: 1, minWidth: 0, maxWidth: '50%', borderRadius: 14, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 10, alignItems: 'center', gap: 7 },
  subCategoryText: { width: '100%', fontSize: 12, lineHeight: 18, textAlign: 'center', fontWeight: '600' },
});
