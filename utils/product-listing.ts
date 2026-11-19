import { apiRequest, fetchBrands, fetchHotSales } from './api';

export type ProductSort = 'best' | 'newest' | 'price_low_high' | 'price_high_low' | 'top_rated';

export type ProductFilters = {
  category: string;
  priceRange?: [number, number];
  brands: string[];
  sortBy: ProductSort;
};

export async function fetchFilteredProducts(filters: ProductFilters & { name?: string; page?: number; source?: string; section?: string; promotion?: string }) {
  // Keep section membership while letting the existing listing endpoint filter and sort.
  let collectionIds: Set<number> | undefined;
  if (filters.source === 'hot_sales' || (filters.source === 'section' && filters.section) || (filters.source === 'promotion' && filters.promotion)) {
    collectionIds = new Set<number>();
    let collectionPage = 1;
    let hasMoreCollection = false;
    do {
      const response = filters.source === 'hot_sales'
        ? await fetchHotSales()
        : await apiRequest(`/api/frontend/${filters.source === 'promotion' ? 'promotion' : 'product-section'}/products/${encodeURIComponent(filters.source === 'promotion' ? filters.promotion! : filters.section!)}?page=${collectionPage}`, 'GET', undefined, false);
      const products = response?.data || response?.products || response || [];
      products.forEach((product: { id: number }) => collectionIds!.add(product.id));
      hasMoreCollection = filters.source !== 'hot_sales' && response?.meta?.current_page < response?.meta?.last_page;
      collectionPage++;
    } while (hasMoreCollection);
    if (!collectionIds.size) return { products: [], hasMore: false, nextPage: 1 };
  }
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
    sort_by: filters.sortBy === 'price_low_high' ? 'price_low_to_high'
      : filters.sortBy === 'price_high_low' ? 'price_high_to_low'
      : filters.sortBy === 'best' ? '' : filters.sortBy,
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

  let page = filters.page || 1;
  // Skip pages outside the selected collection instead of showing a false empty state.
  while (true) {
    const response = await apiRequest(`/api/frontend/product/category-wise-products?page=${page}`, 'POST', body, false);
    const data = response?.data || response;
    const products = (data.products || []).filter((product: { id: number }) => !collectionIds || collectionIds.has(product.id));
    const hasMore = data.current_page < data.last_page;
    const nextPage = Number(data.current_page) + 1;
    if (products.length || !hasMore) return { products, hasMore, nextPage };
    page = nextPage;
  }
}
