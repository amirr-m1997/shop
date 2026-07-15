import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartAPI } from '../services/api';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCart = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCart(null);
      return;
    }

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

  const addToCart = async (data) => {
    setLoading(true);
    try {
      const response = await cartAPI.addToCart(data);
      setCart(response.data);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = async (data) => {
    setLoading(true);
    try {
      const response = await cartAPI.updateCartItem(data);
      setCart(response.data);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeCartItem = async (itemId) => {
    setLoading(true);
    try {
      const response = await cartAPI.removeCartItem(itemId);
      setCart(response.data);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    setLoading(true);
    try {
      const response = await cartAPI.clearCart();
      setCart(response.data);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

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
