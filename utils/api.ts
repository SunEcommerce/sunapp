import AsyncStorage from '@react-native-async-storage/async-storage';

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
  includeAuth: boolean = true
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
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry the request with new token
        return apiRequest(path, method, body, includeAuth);
      }
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
  await AsyncStorage.setItem('access_token', accessToken);
  if (refreshToken) {
    await AsyncStorage.setItem('refresh_token', refreshToken);
  }
}

/**
 * Get access token from storage
 */
export async function getAccessToken(): Promise<string | null> {
  return await AsyncStorage.getItem('access_token');
}

/**
 * Get refresh token from storage
 */
export async function getRefreshToken(): Promise<string | null> {
  return await AsyncStorage.getItem('refresh_token');
}

/**
 * Clear all authentication tokens
 */
export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
}

/**
 * Refresh the access token using the refresh token
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    const data = await apiRequest(
      '/api/auth/refresh-token',
      'POST',
      { refresh_token: refreshToken },
      false // Don't include auth header for refresh
    );

    if (data?.access_token) {
      await storeTokens(data.access_token, data.refresh_token);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    await clearTokens();
    return false;
  }
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
  
  if (data?.access_token) {
    await storeTokens(data.access_token, data.refresh_token);
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
  
  if (data?.access_token) {
    await storeTokens(data.access_token, data.refresh_token);
  }
  
  return data;
}

/**
 * Reset password
 */
export async function resetPassword(
  email: string,
  otp: string,
  password: string,
  passwordConfirmation: string
): Promise<any> {
  return await apiRequest(
    '/api/auth/forgot-password/reset-password',
    'POST',
    {
      email,
      otp,
      password,
      password_confirmation: passwordConfirmation,
    },
    false
  );
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  await clearTokens();
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
 * Fetch products with optional filters
 */
export async function fetchProducts(params?: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<any> {
  const queryParams = new URLSearchParams();
  
  if (params?.category) queryParams.append('category', params.category);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const query = queryParams.toString();
  const path = `/api/frontend/products${query ? `?${query}` : ''}`;
  
  return await apiRequest(path, 'GET', undefined, false);
}

/**
 * Fetch product details by ID
 */
export async function fetchProductDetails(productId: string): Promise<any> {
  return await apiRequest(`/api/frontend/products/${productId}`, 'GET', undefined, false);
}

/**
 * Fetch featured brands
 */
export async function fetchBrands(): Promise<any> {
  return await apiRequest('/api/frontend/brands', 'GET', undefined, false);
}
