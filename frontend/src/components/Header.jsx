import { lazy, Suspense, useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useProductCategories } from '../queries/productQueries';
import { useChatUnreadCount } from '../queries/chatQueries';
import { useChatPush } from '../hooks/useChatPush';
import { cn } from '../lib/utils';
import { useHeaderScroll } from './header/useHeaderScroll';
import DesktopHeader from './header/DesktopHeader';
import MobileHeader from './header/MobileHeader';
import MobileBottomNav from './header/MobileBottomNav';

const CartDrawer = lazy(() => import('./CartDrawer'));
const MobileDrawer = lazy(() => import('./header/MobileDrawer'));
const CategorySheet = lazy(() => import('./header/CategorySheet'));
const LogoutConfirmDialog = lazy(() => import('./header/LogoutConfirmDialog'));

/**
 * Responsive luxury navigation shell.
 * Desktop and mobile are intentionally different layouts sharing one design system.
 */
const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { cart } = useCart();
  const { user, logout, isAuthenticated, loading: authLoading } = useAuth();
  const { wishlist } = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat');
  const scrolled = useHeaderScroll(40, 16);

  const [searchQuery, setSearchQuery] = useState('');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const { data: navCategories = [] } = useProductCategories();
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const { data: unreadChat = 0 } = useChatUnreadCount(user?.id, isAuthenticated, authLoading);
  useChatPush(isAuthenticated && !authLoading);

  const searchInputRef = useRef(null);
  const searchDebounceRef = useRef(null);

  const cartItemsCount = cart?.total_items || 0;
  const wishlistCount = wishlist?.length || 0;
  const userFullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.username ||
    'کاربر';

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
          'sticky top-0 z-50 w-full transition-[background-color,border-color,box-shadow] duration-300',
          scrolled
            ? 'border-b border-border/40 bg-background/85 shadow-sm md:backdrop-blur-xl dark:bg-background/85'
            : 'border-b border-border/30 bg-background/95 md:backdrop-blur-md'
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

      <Suspense fallback={null}>
        {drawerOpen && (
          <MobileDrawer
            open
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
        )}
        {categorySheetOpen && (
          <CategorySheet
            open
            onClose={() => setCategorySheetOpen(false)}
            categories={navCategories}
          />
        )}
        {logoutConfirmOpen && (
          <LogoutConfirmDialog
            open
            onOpenChange={setLogoutConfirmOpen}
            onConfirm={confirmLogout}
          />
        )}
        {cartDrawerOpen && (
          <CartDrawer isOpen onClose={() => setCartDrawerOpen(false)} />
        )}
      </Suspense>
    </>
  );
};

export default Header;
