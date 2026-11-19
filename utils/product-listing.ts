import { apiRequest, fetchBrands } from './api';

export type ProductSort = 'best' | 'newest' | 'price_low_high' | 'top_rated';

export type ProductFilters = {
  category: string;
  priceRange?: [number, number];
  brands: string[];
  sortBy: ProductSort;
};

export async function fetchFilteredProducts(filters: ProductFilters & { name?: string; page?: number }) {
  let brandIds = filters.brands;
  if (brandIds.some(id => !/^\d+$/.test(id))) {
    const response = await fetchBrands();
    const brands = response?.data || response?.brands || response || [];
    brandIds = brandIds.map(id => {
      if (/^\d+$/.test(id)) return id;
      const brand = brands.find((item: { slug: string }) => item.slug === id);
      if (!brand) throw new Error('Brand not found');
      return String(brand.id);
    });
  }

  const body: Record<string, unknown> = {
    name: filters.name?.trim() || '',
    brand: JSON.stringify(brandIds),
    sort_by: filters.sortBy === 'price_low_high' ? 'price_low_to_high' : filters.sortBy === 'best' ? '' : filters.sortBy,
    per_page: 30,
  };
  if (filters.category && filters.category !== 'all') body.category = filters.category;
  if (filters.priceRange) {
    const [min, max] = filters.priceRange;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
      throw new Error('Enter a valid price range');
    }
    body.min_price = min;
    body.max_price = max;
  }

  const response = await apiRequest(`/api/frontend/product/category-wise-products?page=${filters.page || 1}`, 'POST', body, false);
  const data = response?.data || response;
  return { products: data.products || [], hasMore: data.current_page < data.last_page };
}
