import React, { createContext, ReactNode, useContext, useState } from 'react';
import { Alert } from 'react-native';

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variant?: {
    color?: string;
    storage?: string;
    size?: string;
  };
};

type CartContextType = {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getItemById: (id: string) => CartItem | undefined;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (newItem: Omit<CartItem, 'id'>) => {
    setItems((prevItems) => {
      // Check if item with same product and variant exists
      const existingIndex = prevItems.findIndex(
        (item) =>
          item.productId === newItem.productId &&
          JSON.stringify(item.variant) === JSON.stringify(newItem.variant)
      );

      if (existingIndex >= 0) {
        // Update quantity of existing item
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + newItem.quantity,
        };
        Alert.alert('Success', 'Item quantity updated in cart!');
        return updated;
      } else {
        // Add new item
        const cartItem: CartItem = {
          ...newItem,
          id: `${newItem.productId}-${Date.now()}`,
        };
        Alert.alert('Success', 'Item added to cart!');
        return [...prevItems, cartItem];
      }
    });
  };

  const removeFromCart = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getItemById = (id: string) => {
    return items.find((item) => item.id === id);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        totalAmount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemById,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
