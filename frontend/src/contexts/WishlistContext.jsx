import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { productsAPI } from '../services/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlist([]);
      setWishlistIds(new Set());
      return;
    }
    try {
      const res = await productsAPI.getWishlist();
      const items = res.data.results || res.data || [];
      setWishlist(items);
      setWishlistIds(new Set(items.map(item => item.product?.id || item.product_id)));
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const toggleWishlist = useCallback(async (productId) => {
    if (!isAuthenticated) {
      return { success: false, requiresAuth: true };
    }

    try {
      if (wishlistIds.has(productId)) {
        // Remove from wishlist
        const item = wishlist.find(w => w.product?.id === productId || w.product_id === productId);
        if (item) {
          await productsAPI.removeFromWishlist(item.id);
          setWishlistIds(prev => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
          });
          setWishlist(prev => prev.filter(w => w.product?.id !== productId && w.product_id !== productId));
          return { success: true, added: false };
        }
      } else {
        // Add to wishlist
        const res = await productsAPI.addToWishlist(productId);
        setWishlistIds(prev => new Set([...prev, productId]));
        setWishlist(prev => [...prev, res.data]);
        return { success: true, added: true };
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      return { success: false };
    }
  }, [isAuthenticated, wishlistIds, wishlist]);

  const isWishlisted = useCallback((productId) => {
    return wishlistIds.has(productId);
  }, [wishlistIds]);

  return (
    <WishlistContext.Provider value={{ wishlist, wishlistIds, toggleWishlist, isWishlisted, loading }}>
      {children}
    </WishlistContext.Provider>
  );
};
