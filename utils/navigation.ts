/**
 * Navigation utilities for consistent navigation patterns
 */

import { Router } from 'expo-router';

export interface ProductPreloadData {
  name?: string;
  price?: string | number;
  image?: string;
  currency_price?: string | number;
  old_currency_price?: string | number;
  discounted_price?: string | number;
  stock?: number;
  sku?: string;
}

/**
 * Navigate to product detail with preloaded data for instant UI feedback
 * @param router - Expo router instance
 * @param slug - Product slug for API fetch
 * @param preloadData - Optional product data to show immediately
 */
export function navigateToProductDetail(
  router: Router,
  slug: string,
  preloadData?: ProductPreloadData
) {
  const params: any = { slug };
  
  if (preloadData) {
    // Serialize preload data to pass as URL parameter
    params.preloadData = JSON.stringify(preloadData);
  }
  
  router.push({
    pathname: '/ProductDetail',
    params,
  });
}
