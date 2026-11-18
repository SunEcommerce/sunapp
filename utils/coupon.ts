import type { CartItem } from '../contexts/cart-context';

export type CouponCartItem = { product_id: number; variation_id: number; quantity: number };

export function buildCouponCart(cart: CartItem[]): { items: CouponCartItem[]; signature: string } {
  const items = cart.map(item => ({
    product_id: Number(item.productId),
    variation_id: item.variant?.variationId || (item.item_type.endsWith('ProductVariation') ? Number(item.item_id) : 0),
    quantity: item.quantity,
  }));
  return { items, signature: JSON.stringify(cart.map((item, index) => [items[index], item.price])) };
}
