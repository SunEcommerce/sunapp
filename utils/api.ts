import type { CouponCartItem } from './coupon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// [SECURITY: L2] Store auth tokens in the OS secure keystore (Keychain/Keystore) on
// native; expo-secure-store isn't available on web, so fall back to AsyncStorage there.
async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
  await AsyncStorage.removeItem(key);
}
async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  const stored = await SecureStore.getItemAsync(key);
  if (stored) return stored;
  // Upgrade installations that previously stored native tokens in AsyncStorage.
  const legacy = await AsyncStorage.getItem(key);
  if (legacy) await secureSet(key, legacy);
  return legacy;
}
async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
  await AsyncStorage.removeItem(key);
}

// API Configuration - Update these with your actual values
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost',
  API_KEY: process.env.EXPO_PUBLIC_API_KEY || '',
  LOCALE: 'en',
};

type Json = Record<string, any>;

/**
 * Makes an authenticated API request with proper headers
 */
export async function apiRequest(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Json,
  includeAuth: boolean = true,
  retryAuth: boolean = true
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add API key if available
  if (API_CONFIG.API_KEY) {
    headers['x-api-key'] = API_CONFIG.API_KEY;
  }

  // Add locale header
  if (API_CONFIG.LOCALE) {
    headers['Accept-Language'] = API_CONFIG.LOCALE;
  }

  // Add authorization token if required
  if (includeAuth) {
    const token = await getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data: any = null;
  
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    // If unauthorized, try to refresh token
    if (response.status === 401 && includeAuth) {
      if (retryAuth && await refreshAccessToken()) {
        // Retry the request with new token
        return apiRequest(path, method, body, includeAuth, false);
      }
      await clearTokens();
    }

    const msg = data?.message || data?.error || `Request failed (${response.status})`;
    throw new Error(typeof msg === 'string' ? msg : 'Request failed');
  }

  return data;
}

/**
 * Store authentication tokens
 */
export async function storeTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await secureSet('access_token', accessToken);
  if (refreshToken) {
    await secureSet('refresh_token', refreshToken);
  } else {
    await secureDelete('refresh_token');
  }
}

/**
 * Get access token from storage
 */
export async function getAccessToken(): Promise<string | null> {
  return await secureGet('access_token');
}

/**
 * Get refresh token from storage
 */
export async function getRefreshToken(): Promise<string | null> {
  return await secureGet('refresh_token');
}

/**
 * Clear all authentication tokens
 */
export async function clearTokens(): Promise<void> {
  await secureDelete('access_token');
  await secureDelete('refresh_token');
}

/**
 * Refresh the access token using the refresh token
 */
let refreshInFlight: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return false;
        const data = await apiRequest('/api/auth/refresh-token', 'POST', { token }, false);
        // Rotation renews a valid access token. Expired sessions must log in again.
        if (typeof data?.token === 'string' && data.token) {
          await storeTokens(data.token);
          return true;
        }
      } catch {
        // A rejected rotation must not leave stale credentials behind.
      }
      await clearTokens();
      return false;
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getAccessToken();
  return !!token;
}

/**
 * Login user
 */
export async function login(email: string, password: string): Promise<any> {
  const data = await apiRequest('/api/auth/login', 'POST', { email, password }, false);
  
  if (data?.token) {
    await storeTokens(data.token);
  }
  
  return data;
}

/**
 * Register new user
 */
export async function register(
  name: string,
  email: string,
  phone: string,
  password: string,
  passwordConfirmation: string,
  otp: string
): Promise<any> {
  const data = await apiRequest(
    '/api/auth/signup/register',
    'POST',
    {
      name,
      email,
      phone,
      password,
      password_confirmation: passwordConfirmation,
      otp,
    },
    false
  );
  
  if (data?.token) {
    await storeTokens(data.token);
  }
  
  return data;
}

/**
 * Request OTP for forgot password (email or phone)
 */
export async function requestPasswordResetOTP(
  method: 'email' | 'phone',
  email?: string,
  phone?: string,
  countryCode?: string
): Promise<any> {
  const payload: any = {};
  if (method === 'email') {
    payload.email = email;
  } else {
    payload.phone = phone;
    payload.country_code = countryCode || '+95';
  }
  return await apiRequest('/api/auth/forgot-password', 'POST', payload, false);
}

/**
 * Verify OTP for password reset
 */
export async function verifyPasswordResetOTP(
  method: 'email' | 'phone',
  token: string,
  email?: string,
  phone?: string,
  countryCode?: string
): Promise<any> {
  const endpoint = method === 'email'
    ? '/api/auth/forgot-password/verify-email'
    : '/api/auth/forgot-password/verify-phone';
  
  const payload: any = { token };
  if (method === 'email') {
    payload.email = email;
  } else {
    payload.phone = phone;
    payload.country_code = countryCode || '+95';
  }
  
  return await apiRequest(endpoint, 'POST', payload, false);
}

/**
 * Reset password after OTP verification
 */
export async function resetPassword(
  method: 'email' | 'phone',
  token: string,
  password: string,
  passwordConfirmation: string,
  email?: string,
  phone?: string,
  countryCode?: string
): Promise<any> {
  const payload: any = {
    token,
    password,
    password_confirmation: passwordConfirmation,
  };
  
  if (method === 'email') {
    payload.email = email;
  } else {
    payload.phone = phone;
    payload.country_code = countryCode || '+95';
  }
  return await apiRequest('/api/auth/forgot-password/reset-password', 'POST', payload, false);
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  try {
    if (await getAccessToken()) await apiRequest('/api/auth/logout', 'POST', undefined, true, false);
  } catch {
    // Local logout must still work when the API cannot be reached.
  } finally {
    await clearTokens();
    await Promise.all(['user_profile', 'wishlist_products', 'selected_address_id', 'default_address_id']
      .map(key => AsyncStorage.removeItem(key)));
  }
}

// ==================== Frontend API Endpoints ====================

/**
 * Fetch slider/banner data for home screen
 */
export async function fetchSlider(): Promise<any> {
  return await apiRequest('/api/frontend/slider', 'GET', undefined, false);
}

/**
 * Fetch categories
 */
export async function fetchCategories(): Promise<any> {
  return await apiRequest('/api/frontend/categories', 'GET', undefined, false);
}

/**
 * Fetch category tree
 */
export async function fetchCategoryTree(): Promise<any> {
  return await apiRequest('/api/frontend/product-category/tree', 'GET', undefined, false);
}

/**
 * Fetch products with optional filters
 */
export async function fetchProducts(params?: {
  category?: string;
  name?: string;
  page?: number;
  limit?: number;
}): Promise<any> {
  const queryParams = new URLSearchParams();
  
  if (params?.category) queryParams.append('category', params.category);
  if (params?.name) queryParams.append('name', params.name);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const query = queryParams.toString();
  const path = `/api/frontend/product${query ? `?${query}` : ''}`;
  
  return await apiRequest(path, 'GET', undefined, false);
}

/**
 * Fetch product details by ID
 */
export async function fetchProductDetails(productSlug: string): Promise<any> {
  return await apiRequest(`/api/frontend/product/show/${productSlug}`, 'GET', undefined, true);
}

/**
 * Fetch featured brands
 */
export async function fetchBrands(): Promise<any> {
  return await apiRequest('/api/frontend/product-brand', 'GET', undefined, false);
}

export async function fetchHotSales(): Promise<any> {
  return await apiRequest('/api/frontend/product/flash-sale-products', 'GET', undefined, false);
}

export async function fetchNewArrivals(): Promise<any> {
  return await apiRequest('/api/frontend/product?order_column=id&order_type=desc&status=5', 'GET', undefined, false);
}

/**
 * Fetch product variations
 */
export async function fetchProductVariations(productId: string | number): Promise<any> {
  return await apiRequest(`/api/frontend/product/variation/${productId}`, 'GET', undefined, false);
}

/**
 * Fetch initial product variations (root level)
 */
export async function fetchInitialVariations(productId: string | number): Promise<any> {
  return await apiRequest(`/api/frontend/product/initial-variation/${productId}`, 'GET', undefined, false);
}

/**
 * Fetch children variations for a parent
 */
export async function fetchChildrenVariations(productId: string | number, parentId: string | number): Promise<any> {
  return await apiRequest(`/api/frontend/product/children-variation/${parentId}`, 'GET', undefined, false);
}

/**
 * Fetch variation ancestors as string (for display purposes)
 */
export async function fetchVariationAncestorsString(productId: string | number, variationId: string | number): Promise<any> {
  return await apiRequest(`/api/frontend/product/variation/ancestors-and-self/${variationId}`, 'GET', undefined, false);
}

export async function postWishlistToggle(productId: string | number, toggle: boolean): Promise<any> {
  return await apiRequest(`/api/frontend/wishlist/toggle`, 'POST', { product_id: productId, toggle }, true);
}

export async function fetchWishlist(): Promise<any> {
  return await apiRequest('/api/frontend/wishlist', 'GET', undefined, true);
}

export async function fetchWishlistProducts(): Promise<any> {
  return await apiRequest('/api/frontend/product/wishlist-products', 'GET', undefined, true);
}

export async function fetchProductSections(): Promise<any> {
  return await apiRequest('/api/frontend/product-section', 'GET', undefined, false);
}

// ==================== Order & Checkout API Endpoints ====================

/**
 * Fetch available coupons
 */
export async function fetchCoupons(page: number = 1, perPage: number = 15): Promise<any> {
  return await apiRequest(`/api/frontend/coupon?page=${page}&per_page=${perPage}`, 'GET', undefined, false);
}

/**
 * Validate coupon code
 */
export async function validateCoupon(couponCode: string, subtotal: number, items: CouponCartItem[]): Promise<any> {
  return await apiRequest('/api/frontend/coupon/coupon-checking', 'POST', {
    code: couponCode,
    total: subtotal,
    items,
  });
}

/**
 * Fetch payment gateways
 */
export async function fetchPaymentGateways(): Promise<any> {
  return await apiRequest('/api/frontend/payment-gateway', 'GET', undefined, false);
}

/**
 * Fetch order areas (delivery zones)
 */
export async function fetchOrderAreas(): Promise<any> {
  return await apiRequest('/api/frontend/order-area', 'GET', undefined, false);
}

export type OrderQuote = {
  subtotal: number;
  discount: number;
  tax: number;
  shipping_charge: number;
  total: number;
  products: (Json & { product_id: number; quantity: number; price: number; subtotal: number })[];
};

export async function fetchOrderQuote(data: {
  order_type: number;
  shipping_id: number;
  billing_id: number;
  coupon_id?: number;
  products: Json[];
}): Promise<{ data: OrderQuote }> {
  return apiRequest('/api/frontend/order/quote', 'POST', { ...data, products: JSON.stringify(data.products) });
}

/**
 * Create order (checkout)
 */
export async function createOrder(orderData: {
  address_id: number;
  delivery_type: number;
  order_type: number;
  payment_method: number;
  coupon_id?: number;
  subtotal: number;
  discount: number;
  shipping_charge: number;
  tax: number;
  total: number;
  note?: string;
  products: Array<{
    product_id: number;
    variation_id?: number | null;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
}): Promise<any> {
  // Convert products array to JSON string for backend
  const requestData = {
    ...orderData,
    products: JSON.stringify(orderData.products),
  };
  return await apiRequest('/api/frontend/order', 'POST', requestData, true);
}

/**
 * Fetch user orders
 */
export async function fetchOrders(params?: {
  page?: number;
  per_page?: number;
  order_column?: string;
  order_type?: string;
  status?: string;
}): Promise<any> {
  const queryParams = new URLSearchParams();
  
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
  // if (params?.order_column) queryParams.append('order_column', params.order_column);
  // if (params?.order_type) queryParams.append('order_type', params.order_type);
  if (params?.status) queryParams.append('status', params.status);
  
  const query = queryParams.toString();
  const path = `/api/frontend/order${query ? `?${query}` : ''}`;
  
  return await apiRequest(path, 'GET', undefined, true);
}

/**
 * Fetch order details
 */
export async function fetchOrderDetails(orderId: string | number): Promise<any> {
  return await apiRequest(`/api/frontend/order/show/${orderId}`, 'GET', undefined, true);
}

/**
 * Change order status
 */
export async function changeOrderStatus(orderId: string | number, status: number, reason?: string): Promise<any> {
  return await apiRequest(
    `/api/frontend/order/change-status/${orderId}`,
    'POST',
    { status, reason },
    true
  );
}

// ==================== Address Management API Endpoints ====================

/**
 * Fetch user addresses
 */
export async function fetchAddresses(): Promise<any> {
  return await apiRequest('/api/frontend/address', 'GET', undefined, true);
}

/**
 * Fetch specific address details
 */
export async function fetchAddressDetails(addressId: string | number): Promise<any> {
  return await apiRequest(`/api/frontend/address/show/${addressId}`, 'GET', undefined, true);
}

/**
 * Create new address
 */
export async function createAddress(addressData: {
  label: string;
  address: string;
  apartment?: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  latitude?: string;
  longitude?: string;
  full_name?: string;
  country_code?: string;
  phone?: string;
}): Promise<any> {
  // [SECURITY: L3] Send the real user-entered values (the form already collects
  // full_name / country_code / phone) instead of hardcoded placeholders.
  return await apiRequest('/api/frontend/address', 'POST', addressData, true);
}

/**
 * Update address (full update)
 */
export async function updateAddress(addressId: string | number, addressData: {
  label: string;
  address: string;
  apartment?: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  latitude?: string;
  longitude?: string;
}): Promise<any> {
  return await apiRequest(`/api/frontend/address/${addressId}`, 'PUT', addressData, true);
}

/**
 * Update address (partial update)
 */
export async function patchAddress(addressId: string | number, addressData: Partial<{
  label: string;
  address: string;
  apartment?: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  latitude?: string;
  longitude?: string;
}>): Promise<any> {
  return await apiRequest(`/api/frontend/address/${addressId}`, 'PUT', addressData, true);
}

/**
 * Delete address
 */
export async function deleteAddress(addressId: string | number): Promise<any> {
  return await apiRequest(`/api/frontend/address/${addressId}`, 'DELETE', undefined, true);
}

// ==================== Country Code API Endpoints ====================

/**
 * Fetch all country codes
 */
export async function fetchCountryCodes(): Promise<any> {
  return await apiRequest('/api/frontend/country-code', 'GET', undefined, false);
}

/**
 * Fetch specific country details
 */
export async function fetchCountryDetails(countryId: string | number): Promise<any> {
  return await apiRequest(`/api/frontend/country-code/show/${countryId}`, 'GET', undefined, false);
}

/**
 * Fetch country by calling code
 */
export async function fetchCountryByCallingCode(callingCode: string): Promise<any> {
  return await apiRequest(`/api/frontend/country-code/calling-code/${callingCode}`, 'GET', undefined, false);
}

// ==================== Settings API Endpoints ====================

/**
 * Fetch frontend settings
 */
export async function fetchSettings(): Promise<any> {
  return await apiRequest('/api/frontend/setting', 'GET', undefined, false);
}

/**
 * Fetch page content by slug
 */
export async function fetchPage(slug: string): Promise<any> {
  return await apiRequest(`/api/frontend/page/show/${slug}`, 'GET', undefined, false);
}

// ==================== Profile API Endpoints ====================

/**
 * Fetch user profile
 */
export async function fetchProfile(): Promise<any> {
  return await apiRequest('/api/profile', 'GET', undefined, true);
}

/**
 * Update user profile
 */
export async function updateProfile(profileData: FormData): Promise<any> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {};

  // Add API key if available
  if (API_CONFIG.API_KEY) {
    headers['x-api-key'] = API_CONFIG.API_KEY;
  }

  // Add locale header
  if (API_CONFIG.LOCALE) {
    headers['Accept-Language'] = API_CONFIG.LOCALE;
  }

  // Add authorization token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}/api/profile`, {
    method: 'POST',
    headers,
    body: profileData,
  });

  const text = await response.text();
  let data: any = null;
  
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const msg = data?.message || data?.error || `Request failed (${response.status})`;
    throw new Error(typeof msg === 'string' ? msg : 'Request failed');
  }

  return data;
}
