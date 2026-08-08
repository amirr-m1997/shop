import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/Dialog';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { productsAPI, chatAPI } from '../services/api';
import CartDrawer from './CartDrawer';
import { cn } from '../lib/utils';
import { useHeaderScroll } from './header/useHeaderScroll';
import DesktopHeader from './header/DesktopHeader';
import MobileHeader from './header/MobileHeader';
import MobileBottomNav from './header/MobileBottomNav';
import MobileDrawer from './header/MobileDrawer';
import CategorySheet from './header/CategorySheet';

/**
 * Responsive luxury navigation shell.
 * Desktop and mobile are intentionally different layouts sharing one design system.
 */
const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { cart } = useCart();
  const { user, logout, isAuthenticated } = useAuth();
  const { wishlist } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat');
  const scrolled = useHeaderScroll(40);

  const [searchQuery, setSearchQuery] = useState('');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [navCategories, setNavCategories] = useState([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);

  const searchInputRef = useRef(null);
  const searchDebounceRef = useRef(null);

  const cartItemsCount = cart?.total_items || 0;
  const wishlistCount = wishlist?.length || 0;
  const userFullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.username ||
    'کاربر';

  // Unread chat poll
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadChat(0);
      return undefined;
    }
    let cancelled = false;
    const poll = () => {
      chatAPI
        .getUnreadCount()
        .then((res) => {
          if (!cancelled) setUnreadChat(res.data.count || 0);
        })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 15000);
    const onUnread = (e) => {
      if (!cancelled) setUnreadChat(e.detail ?? 0);
    };
    window.addEventListener('chat:unread', onUnread);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('chat:unread', onUnread);
    };
  }, [isAuthenticated]);

  // Categories for nav / mega menu / chips
  useEffect(() => {
    productsAPI
      .getCategories()
      .then((res) => {
        const all = res.data.results || res.data || [];
        setNavCategories(all.filter((c) => !c.parent));
      })
      .catch(() => {});
  }, []);

  // Close overlays on route change
  useEffect(() => {
    setDrawerOpen(false);
    setCategorySheetOpen(false);
  }, [location.pathname, location.search]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/products?search=${encodeURIComponent(q)}`);
      setSearchQuery('');
    }
  };

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (q.trim().length >= 2) {
      searchDebounceRef.current = setTimeout(() => {
        navigate(`/products?search=${encodeURIComponent(q.trim())}`);
        setSearchQuery('');
      }, 1000);
    }
  };

  const handleLogout = () => {
    setLogoutConfirmOpen(true);
    setDrawerOpen(false);
  };

  const confirmLogout = async () => {
    await logout();
    setLogoutConfirmOpen(false);
    navigate('/');
  };

  const openCart = () => setCartDrawerOpen(true);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 w-full transition-all duration-300',
          scrolled
            ? 'border-b border-border/40 bg-background/75 shadow-sm backdrop-blur-xl dark:bg-background/80'
            : 'border-b border-border/30 bg-background/95 backdrop-blur-md'
        )}
      >
        <DesktopHeader
          scrolled={scrolled}
          isChat={isChat}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearch}
          searchInputRef={searchInputRef}
          navCategories={navCategories}
          cartCount={cartItemsCount}
          wishlistCount={wishlistCount}
          unreadChat={unreadChat}
          isAuthenticated={isAuthenticated}
          userFullName={userFullName}
          theme={theme}
          toggleTheme={toggleTheme}
          onCartOpen={openCart}
          onLogout={handleLogout}
        />

        <MobileHeader
          scrolled={scrolled}
          isChat={isChat}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearch}
          searchInputRef={searchInputRef}
          navCategories={navCategories}
          cartCount={cartItemsCount}
          wishlistCount={wishlistCount}
          isAuthenticated={isAuthenticated}
          onMenuOpen={() => setDrawerOpen(true)}
          onCartOpen={openCart}
        />
      </header>

      {/* Mobile floating bottom nav — global navigation, available everywhere incl. chat */}
      <MobileBottomNav
        cartCount={cartItemsCount}
        unreadChat={unreadChat}
        isAuthenticated={isAuthenticated}
        onCategoriesClick={() => setCategorySheetOpen(true)}
        onCartClick={openCart}
      />

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        categories={navCategories}
        isAuthenticated={isAuthenticated}
        userFullName={userFullName}
        unreadChat={unreadChat}
        wishlistCount={wishlistCount}
        theme={theme}
        toggleTheme={toggleTheme}
        onLogout={handleLogout}
      />

      <CategorySheet
        open={categorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        categories={navCategories}
      />

      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              خروج از حساب
            </DialogTitle>
            <DialogDescription>
              آیا مطمئن هستید که می‌خواید از حساب کاربری خود خارج شوید؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2 sm:flex-row">
            <Button variant="destructive" onClick={confirmLogout}>
              بله، خارج شوم
            </Button>
            <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)}>
              انصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </>
  );
};

export default Header;
