import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { selectCategoriesLoading, selectParentCategories } from '@/store/categoriesSlice';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useContext } from 'react';
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSelector } from 'react-redux';

export default function CategoriesSection() {
  const { colorScheme } = useContext(ThemeContext)!;
  const router = useRouter();
  const parentCategories = useSelector(selectParentCategories);
  const isLoadingCategories = useSelector(selectCategoriesLoading);

  const renderCategoryItem = ({ item }: { item: any }) => {
    const categoryName = item.name || item.name_mm || 'Category';
    const categoryImage = item.image || item.icon;
    const categorySlug = item.slug || '';

    return (
      <TouchableOpacity
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
        {categoryImage ? (
          <View style={styles.categoryIconContainer}>
            <Image
              source={{ uri: categoryImage }}
              style={styles.categoryIconImage}
              resizeMode="cover"
            />
          </View>
        ) : (
          <View style={[styles.categoryIconContainer, { backgroundColor: Colors[colorScheme].tint + '20' }]}>
            <Ionicons name="apps-outline" size={32} color={Colors[colorScheme].tint} />
          </View>
        )}
        <Text style={[styles.categoryText, { color: Colors[colorScheme].text }]} numberOfLines={2}>
          {categoryName}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.sectionContainer}>
      {isLoadingCategories ? (
        <View style={styles.loadingProductsContainer}>
          <Text style={{ color: Colors[colorScheme].text }}>Loading categories...</Text>
        </View>
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
    marginTop: 24,
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
    paddingHorizontal: 10,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 8,
    width: 80,
  },
  categoryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  categoryIconImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  categoryText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});
