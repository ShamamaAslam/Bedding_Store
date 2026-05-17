import React, { createContext, useState, useContext, useEffect } from 'react';
import { getEffectivePrice } from '../utils/pricing';
import { trackCartEvent } from '../utils/behaviorTracker';

const CartContext = createContext();

const CART_KEY = 'wf_cart';
const CART_UPDATED_AT_KEY = 'wf_cart_updated_at';

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync to localStorage whenever cart changes
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
    localStorage.setItem(CART_UPDATED_AT_KEY, new Date().toISOString());
  }, [cartItems]);

  const addToCart = (product) => {
    trackCartEvent({
      action: 'add_to_cart',
      productId: product?._id,
      quantity: product?.quantity || 1,
      metadata: {
        source: 'cart_context',
        selectedSize: product?.selectedSize || '',
        selectedColor: product?.selectedColor || ''
      }
    });

    setCartItems(prev => {
      const exists = prev.find(
        item => item._id === product._id &&
                item.selectedSize === product.selectedSize &&
                item.selectedColor === product.selectedColor
      );
      if (exists) {
        return prev.map(item =>
          item._id === product._id &&
          item.selectedSize === product.selectedSize &&
          item.selectedColor === product.selectedColor
            ? { ...item, quantity: item.quantity + (product.quantity || 1) }
            : item
        );
      }
      return [...prev, { ...product, quantity: product.quantity || 1 }];
    });
  };

  const removeFromCart = (id, selectedSize, selectedColor) => {
    setCartItems(prev =>
      prev.filter(item =>
        !(item._id === id && item.selectedSize === selectedSize && item.selectedColor === selectedColor)
      )
    );
  };

  const updateQuantity = (id, quantity, selectedSize, selectedColor) => {
    if (quantity <= 0) return removeFromCart(id, selectedSize, selectedColor);
    setCartItems(prev =>
      prev.map(item =>
        item._id === id && item.selectedSize === selectedSize && item.selectedColor === selectedColor
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem(CART_KEY);
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce(
    (sum, item) => sum + getEffectivePrice(item) * item.quantity, 0
  );

  return (
    <CartContext.Provider value={{
      cartItems, addToCart, removeFromCart,
      updateQuantity, clearCart, totalItems, totalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);