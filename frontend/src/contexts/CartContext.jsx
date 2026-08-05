import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { cartAPI } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [coupon, setCoupon] = useState(null); // { code, discount_amount, discount_type, discount_value }
  const [couponError, setCouponError] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const addCartTimerRef = useRef(null);
  const isAddingRef = useRef(false);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const response = await cartAPI.getCart();
      setCart(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setCart(null);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const addToCart = useCallback(async (data) => {
    if (isAddingRef.current) return null;

    isAddingRef.current = true;
    try {
      const response = await cartAPI.addToCart(data);
      setCart(response.data);
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setTimeout(() => {
        isAddingRef.current = false;
      }, 500);
    }
  }, []);

  const updateCartItem = useCallback(async (data) => {
    try {
      const response = await cartAPI.updateCartItem(data);
      setCart(response.data);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const removeCartItem = useCallback(async (itemId) => {
    try {
      const response = await cartAPI.removeCartItem(itemId);
      setCart(response.data);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const clearCart = useCallback(async () => {
    try {
      const response = await cartAPI.clearCart();
      setCart(response.data);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const applyCoupon = useCallback(async (code) => {
    setCouponLoading(true);
    setCouponError(null);
    try {
      const response = await cartAPI.applyCoupon(code);
      setCoupon(response.data);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.error || 'خطا در اعمال کد تخفیف';
      setCouponError(msg);
      throw err;
    } finally {
      setCouponLoading(false);
    }
  }, []);

  const removeCoupon = useCallback(() => {
    setCoupon(null);
    setCouponError(null);
  }, []);

  const clearCouponError = useCallback(() => {
    setCouponError(null);
  }, []);

  useEffect(() => {
    fetchCart();
  }, [isAuthenticated]);

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      error,
      addToCart,
      updateCartItem,
      removeCartItem,
      clearCart,
      refetch: fetchCart,
      coupon,
      couponError,
      couponLoading,
      applyCoupon,
      removeCoupon,
      clearCouponError,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
