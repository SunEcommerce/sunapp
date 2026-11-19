import { apiRequest } from './api';

export type Promotion = {
  id: number;
  name: string;
  slug: string;
  type: number;
  status: number;
  cover: string;
  preview: string;
};

export async function fetchPromotions(type: 5 | 10): Promise<Promotion[]> {
  const response = await apiRequest(`/api/frontend/promotion?paginate=0&order_column=id&order_type=asc&type=${type}&status=5`, 'GET', undefined, false);
  const promotions: Promotion[] = response?.data || response || [];
  return promotions.filter(item => Number(item.status) === 5 && Number(item.type) === type && item.slug && (item.cover || item.preview));
}
