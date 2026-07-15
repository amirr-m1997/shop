import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, Moon, Sun, X, LogOut } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const { cart } = useCart();
  const { user, logout, isAuthenticated } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cartItemsCount = cart?.total_items || 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold">فروشگاه مد</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/category/men" className="text-sm font-medium hover:text-primary">
              مردانه
            </Link>
            <Link to="/category/women" className="text-sm font-medium hover:text-primary">
              زنانه
            </Link>
            <Link to="/category/kids" className="text-sm font-medium hover:text-primary">
              بچگانه
            </Link>
            <Link to="/new-arrivals" className="text-sm font-medium hover:text-primary">
              جدیدترین‌ها
            </Link>
            <Link to="/sale" className="text-sm font-medium text-destructive hover:text-destructive">
              تخفیف‌ها
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(!searchOpen)}
              >
                <Search className="h-5 w-5" />
              </Button>
              {searchOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 p-2 bg-background border rounded-lg shadow-lg">
                  <Input placeholder="جستجوی محصولات..." autoFocus />
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>

            {/* Cart */}
            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItemsCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0">
                    {cartItemsCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* User */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium hidden md:inline">{user?.username}</span>
                <Button variant="ghost" size="icon" onClick={logout} title="خروج">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
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
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              <Link to="/category/men" className="text-sm font-medium hover:text-primary">
                مردانه
              </Link>
              <Link to="/category/women" className="text-sm font-medium hover:text-primary">
                زنانه
              </Link>
              <Link to="/category/kids" className="text-sm font-medium hover:text-primary">
                بچگانه
              </Link>
              <Link to="/new-arrivals" className="text-sm font-medium hover:text-primary">
                جدیدترین‌ها
              </Link>
              <Link to="/sale" className="text-sm font-medium text-destructive hover:text-destructive">
                تخفیف‌ها
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
