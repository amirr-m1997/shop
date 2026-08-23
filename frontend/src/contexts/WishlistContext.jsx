import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { productsAPI } from '../services/api';
import { useAuth } from './AuthContext';

const WishlistContext = createContext(null);
const WishlistItemContext = createContext(null);

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

export const useWishlistItem = (productId) => {
  const context = useContext(WishlistItemContext);
  if (!context) throw new Error('useWishlistItem must be used within a WishlistProvider');
  const subscribe = useCallback(
    (listener) => context.subscribe(productId, listener),
    [context, productId]
  );
  const getSnapshot = useCallback(
    () => context.getSnapshot(productId),
    [context, productId]
  );
  return {
    isWishlisted: useSyncExternalStore(subscribe, getSnapshot, getSnapshot),
    toggleWishlist: context.toggleWishlist,
  };
};

export const WishlistProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const wishlistRef = useRef([]);
  const wishlistIdsRef = useRef(new Set());
  const itemListenersRef = useRef(new Map());
  const togglingRef = useRef(new Set());

  const notifyItem = useCallback((productId) => {
    itemListenersRef.current.get(productId)?.forEach((listener) => listener());
  }, []);

  const subscribe = useCallback((productId, listener) => {
    const listeners = itemListenersRef.current.get(productId) || new Set();
    listeners.add(listener);
    itemListenersRef.current.set(productId, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) itemListenersRef.current.delete(productId);
    };
  }, []);

  const getSnapshot = useCallback((productId) => wishlistIdsRef.current.has(productId), []);

  const replaceWishlist = useCallback((items) => {
    const previousIds = wishlistIdsRef.current;
    const nextIds = new Set(items.map((item) => item.product?.id || item.product_id));
    wishlistRef.current = items;
    wishlistIdsRef.current = nextIds;
    setWishlist(items);
    setWishlistIds(nextIds);
    new Set([...previousIds, ...nextIds]).forEach((id) => notifyItem(id));
  }, [notifyItem]);

  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      replaceWishlist([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await productsAPI.getWishlist();
      const items = res.data.results || res.data || [];
      replaceWishlist(items);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, replaceWishlist]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const toggleWishlist = useCallback(async (productId) => {
    if (!isAuthenticated) {
      return { success: false, requiresAuth: true };
    }
    if (togglingRef.current.has(productId)) return { success: false };
    togglingRef.current.add(productId);
    try {
      if (wishlistIdsRef.current.has(productId)) {
        // Remove from wishlist
        const item = wishlistRef.current.find(w => w.product?.id === productId || w.product_id === productId);
        if (item) {
          await productsAPI.removeFromWishlist(item.id);
          replaceWishlist(wishlistRef.current.filter(
            w => w.product?.id !== productId && w.product_id !== productId
          ));
          return { success: true, added: false };
        }
      } else {
        // Add to wishlist
        const res = await productsAPI.addToWishlist(productId);
        replaceWishlist([...wishlistRef.current, res.data]);
        return { success: true, added: true };
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      return { success: false };
    } finally {
      togglingRef.current.delete(productId);
    }
  }, [isAuthenticated, replaceWishlist]);

  const isWishlisted = useCallback((productId) => {
    return wishlistIds.has(productId);
  }, [wishlistIds]);

  const value = useMemo(() => ({
    wishlist,
    wishlistIds,
    toggleWishlist,
    isWishlisted,
    loading,
  }), [wishlist, wishlistIds, toggleWishlist, isWishlisted, loading]);

  const itemValue = useMemo(() => ({
    subscribe,
    getSnapshot,
    toggleWishlist,
  }), [subscribe, getSnapshot, toggleWishlist]);

  return (
    <WishlistContext.Provider value={value}>
      <WishlistItemContext.Provider value={itemValue}>
        {children}
      </WishlistItemContext.Provider>
    </WishlistContext.Provider>
  );
};
