import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, Moon, Sun, X, LogOut, Package, AlertTriangle, ChevronDown } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/Dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './ui/DropdownMenu';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { productsAPI } from '../services/api';
import CartDrawer from './CartDrawer';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { cart } = useCart();
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [navCategories, setNavCategories] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [mobileExpandedCat, setMobileExpandedCat] = useState(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchDebounceRef = useRef(null);

  const cartItemsCount = cart?.total_items || 0;

  const userFullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'کاربر';

  useEffect(() => {
    productsAPI.getCategories()
      .then(res => {
        const all = res.data.results || res.data || [];
        setNavCategories(all.filter(c => !c.parent));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/products?search=${encodeURIComponent(q)}`);
      setSearchOpen(false);
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
    setMobileMenuOpen(false);
  };

  const confirmLogout = async () => {
    await logout();
    setLogoutConfirmOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 space-x-reverse shrink-0">
            <span className="text-xl sm:text-2xl font-bold tracking-tight">فروشگاه مد</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-5 space-x-reverse shrink-0" ref={dropdownRef}>
            <Link to="/" className="text-sm font-medium hover:text-primary">صفحه اصلی</Link>
            <Link to="/products" className="text-sm font-medium hover:text-primary">محصولات</Link>
            {navCategories.map(cat => (
              <div key={cat.id} className="relative">
                {cat.children && cat.children.length > 0 ? (
                  <>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === cat.id ? null : cat.id)}
                      className="text-sm font-medium hover:text-primary flex items-center gap-1"
                    >
                      {cat.name}
                      <ChevronDown className={`h-3 w-3 transition-transform ${openDropdown === cat.id ? 'rotate-180' : ''}`} />
                    </button>
                    {openDropdown === cat.id && (
                      <div className="absolute top-full right-0 mt-2 w-56 bg-background border rounded-xl shadow-lg py-2 z-50">
                        <Link
                          to={`/category/${cat.slug}`}
                          className="block px-4 py-2 text-sm font-bold text-primary hover:bg-muted transition-colors"
                          onClick={() => setOpenDropdown(null)}
                        >
                          همه {cat.name}
                        </Link>
                        <div className="border-t my-1" />
                        {cat.children.map(child => (
                          <Link
                            key={child.id}
                            to={`/category/${child.slug}`}
                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                            onClick={() => setOpenDropdown(null)}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link to={`/category/${cat.slug}`} className="text-sm font-medium hover:text-primary">{cat.name}</Link>
                )}
              </div>
            ))}
            <Link to="/blog" className="text-sm font-medium hover:text-primary">مجله</Link>
            <Link to="/size-finder" className="text-sm font-medium hover:text-primary">راهنمای سایز</Link>
            <Link to="/about" className="text-sm font-medium hover:text-primary">درباره ما</Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-1 sm:space-x-2 space-x-reverse shrink-0">
            {/* Search - Desktop */}
            <form onSubmit={handleSearch} className="hidden sm:flex items-center gap-1">
              <div className="relative">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="جستجوی محصولات..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-36 lg:w-56 h-9 ps-9 text-sm"
                />
                <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </form>

            {/* Search - Mobile Toggle */}
            <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setSearchOpen(!searchOpen)}>
              <Search className="h-5 w-5" />
            </Button>

            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>

            {/* Cart */}
            <button
              onClick={() => setCartDrawerOpen(true)}
              data-cart-icon
              className="relative p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemsCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0">
                  {cartItemsCount}
                </Badge>
              )}
            </button>

            {/* User Dropdown Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 px-2 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex flex-col items-end hidden md:flex">
                      <span className="text-sm font-medium leading-none">{userFullName}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-56" align="start" sideOffset={8} forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col items-end space-y-1">
                      <p className="text-sm font-medium leading-none">{userFullName}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer flex items-center justify-end gap-2 w-full">
                      <span>پروفایل کاربری</span>
                      <User className="h-4 w-4" />
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="cursor-pointer flex items-center justify-end gap-2 w-full">
                      <span>سفارش‌های من</span>
                      <Package className="h-4 w-4" />
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 flex items-center justify-end gap-2"
                  >
                    <span>خروج از حساب</span>
                    <LogOut className="h-4 w-4" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login">
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {searchOpen && (
          <div className="sm:hidden pb-3">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="جستجوی محصولات..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full h-10 ps-9 text-sm"
                />
                <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              <Button type="submit" size="sm">
                جستجو
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                <X className="h-5 w-5" />
              </Button>
            </form>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t">
            <nav className="flex flex-col space-y-1">
              <Link to="/" className="text-sm font-medium hover:text-primary py-2" onClick={() => setMobileMenuOpen(false)}>صفحه اصلی</Link>
              <Link to="/products" className="text-sm font-medium hover:text-primary py-2" onClick={() => setMobileMenuOpen(false)}>محصولات</Link>
              {navCategories.map(cat => (
                <div key={cat.id}>
                  {cat.children && cat.children.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/category/${cat.slug}`}
                          className="text-sm font-medium hover:text-primary py-2 flex-1"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {cat.name}
                        </Link>
                        <button
                          onClick={() => setMobileExpandedCat(mobileExpandedCat === cat.id ? null : cat.id)}
                          className="p-2"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${mobileExpandedCat === cat.id ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                      {mobileExpandedCat === cat.id && (
                        <div className="pr-4 pb-2 space-y-1">
                          <Link
                            to={`/category/${cat.slug}`}
                            className="block text-xs font-bold text-primary py-1"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            همه {cat.name}
                          </Link>
                          {cat.children.map(child => (
                            <Link
                              key={child.id}
                              to={`/category/${child.slug}`}
                              className="block text-sm text-muted-foreground py-1"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link
                      to={`/category/${cat.slug}`}
                      className="text-sm font-medium hover:text-primary py-2 block"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {cat.name}
                    </Link>
                  )}
                </div>
              ))}
              <Link to="/blog" className="text-sm font-medium hover:text-primary py-2" onClick={() => setMobileMenuOpen(false)}>مجله</Link>
              <Link to="/size-finder" className="text-sm font-medium hover:text-primary py-2" onClick={() => setMobileMenuOpen(false)}>راهنمای سایز</Link>
              <Link to="/about" className="text-sm font-medium hover:text-primary py-2" onClick={() => setMobileMenuOpen(false)}>درباره ما</Link>

              {isAuthenticated && (
                <div className="border-t pt-4 mt-2">
                  <p className="text-sm font-semibold mb-2">{userFullName}</p>
                  <Link to="/profile" className="block text-sm text-muted-foreground mb-2" onClick={() => setMobileMenuOpen(false)}>پروفایل</Link>
                  <Link to="/orders" className="block text-sm text-muted-foreground mb-2" onClick={() => setMobileMenuOpen(false)}>سفارش‌های من</Link>
                  <button onClick={handleLogout} className="text-sm text-destructive font-medium">خروج از حساب</button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>

      {/* Logout Confirmation Dialog */}
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

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartDrawerOpen} onClose={() => setCartDrawerOpen(false)} />
    </header>
  );
};

export default Header;
