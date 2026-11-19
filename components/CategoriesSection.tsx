import { Colors } from '@/constants/theme';
import { HomeSkeleton } from '@/components/HomeSkeleton';
import { ThemeContext } from '@/contexts/theme-context';
import { selectCategoriesLoading, selectParentCategories } from '@/store/categoriesSlice';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext, useState } from 'react';
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSelector } from 'react-redux';

function CategoryImage({ item, colorScheme }: {
  item: { thumb?: string; cover?: string; image?: string; icon?: string };
  colorScheme: 'light' | 'dark';
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  // The tree API appends cover; other category responses also include thumb.
  const image = [item.thumb, item.cover, item.image, item.icon].find(value =>
    typeof value === 'string' && value.trim() &&
    !/\/images\/default\/category\/(?:thumb|cover)\.png(?:[?#].*)?$/.test(value)
  )?.trim();

  return (
    <View style={[styles.categoryIconContainer, { backgroundColor: Colors[colorScheme].tint + '20' }]}>
      {image && image !== failedImage ? (
        <Image source={{ uri: image }} style={styles.categoryIconImage} resizeMode="cover"
          onError={() => setFailedImage(image)} />
      ) : (
        <Ionicons name="apps-outline" size={25} color={Colors[colorScheme].tint} />
      )}
    </View>
  );
}

export default function CategoriesSection() {
  const { colorScheme } = useContext(ThemeContext)!;
  const router = useRouter();
  const parentCategories = useSelector(selectParentCategories);
  const isLoadingCategories = useSelector(selectCategoriesLoading);

  const renderCategoryItem = ({ item }: { item: any }) => {
    const categoryName = item.name || item.name_mm || 'Category';
    const categorySlug = item.slug || '';

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={categoryName}
        style={styles.categoryItem}
        onPress={() => router.push({
          pathname: '/ProductList',
          params: {
            category: categorySlug,
            name: '',
            source: 'category',
          },
        })}
      >
        <CategoryImage item={item} colorScheme={colorScheme} />
        <Text style={[styles.categoryText, { color: Colors[colorScheme].text }]} numberOfLines={2}>
          {categoryName}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sectionContainer}>
      {isLoadingCategories ? (
        <HomeSkeleton variant="categories" label="Loading categories" />
      ) : parentCategories.length > 0 ? (
        <FlatList
          data={parentCategories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        />
      ) : (
        <View style={styles.emptyProductsContainer}>
          <Text style={{ color: Colors[colorScheme].text, fontSize: 14 }}>No categories available</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 10,
  },
  loadingProductsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 120,
    paddingHorizontal: 16,
  },
  emptyProductsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 120,
    paddingHorizontal: 16,
  },
  categoryList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    columnGap: 4,
  },
  categoryItem: {
    alignItems: 'center',
    width: 76,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  categoryIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    overflow: 'hidden',
  },
  categoryIconImage: {
    width: '100%',
    height: '100%',
  },
  categoryText: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
});
