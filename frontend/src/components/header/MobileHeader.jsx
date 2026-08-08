import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Heart, ShoppingCart, Search, MessageCircle } from 'lucide-react';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';
import { MOBILE_CHIPS } from './navConfig';

/**
 * App-like mobile top header:
 * top bar (hamburger RIGHT in RTL) + search row + horizontal chips.
 * Collapses search/chips when scrolled.
 */
const MobileHeader = ({
  scrolled,
  isChat,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchInputRef,
  navCategories,
  cartCount,
  wishlistCount,
  onMenuOpen,
  onCartOpen,
  isAuthenticated = false,
}) => {
  const chips = [
    ...MOBILE_CHIPS,
    ...navCategories.slice(0, 6).map((c) => ({
      id: `cat-${c.id}`,
      label: c.name,
      href: `/category/${c.slug}`,
    })),
  ];

  return (
    <div className="md:hidden">
      {/* Top bar — hamburger on RIGHT (RTL start) */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 transition-all duration-300',
          scrolled ? 'h-12' : 'h-14'
        )}
      >
        {/* RIGHT in RTL = first in DOM with direction rtl */}
        <button
          type="button"
          onClick={onMenuOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors active:bg-muted/70"
          aria-label="باز کردن منو"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link
          to={isChat ? '/chat' : '/'}
          className="flex min-w-0 flex-1 items-center justify-center gap-2"
        >
          {isChat ? (
            <>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 shadow-sm shadow-amber-500/20">
                <MessageCircle className="h-4 w-4 text-white" />
              </span>
              <span className="truncate text-base font-black tracking-tight">استایل چت</span>
            </>
          ) : (
            <span className="truncate text-lg font-black tracking-tight">فروشگاه مد</span>
          )}
        </Link>

        <div className="flex shrink-0 items-center gap-0.5">
          {!isChat && (
            <Link
              to={isAuthenticated ? '/profile' : '/login'}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-full transition-all',
                scrolled ? 'w-0 overflow-hidden opacity-0 pointer-events-none' : 'opacity-100'
              )}
              aria-label="علاقه‌مندی‌ها"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <Badge className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center border-0 bg-gradient-to-r from-amber-500 to-yellow-600 p-0 px-1 text-[9px] font-bold text-black">
                  {wishlistCount > 99 ? '۹۹+' : wishlistCount.toLocaleString('fa-IR')}
                </Badge>
              )}
            </Link>
          )}

          <button
            type="button"
            onClick={onCartOpen}
            data-cart-icon
            className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors active:bg-muted/70"
            aria-label="سبد خرید"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <Badge className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center border-0 bg-gradient-to-r from-amber-500 to-yellow-600 p-0 px-1 text-[9px] font-bold text-black">
                {cartCount > 99 ? '۹۹+' : cartCount.toLocaleString('fa-IR')}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Search + category chips — collapse on scroll */}
      {!isChat && (
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-out',
            scrolled ? 'max-h-0 opacity-0' : 'max-h-28 opacity-100'
          )}
        >
          <form onSubmit={onSearchSubmit} className="px-3 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="جستجوی محصولات، برندها و دسته‌بندی‌ها..."
                value={searchQuery}
                onChange={onSearchChange}
                className="h-11 w-full rounded-2xl border-border/60 bg-muted/50 pe-3 ps-10 text-sm shadow-none placeholder:text-muted-foreground/75 focus-visible:border-amber-500/40 focus-visible:ring-amber-500/15"
              />
            </div>
          </form>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide px-3 pb-2.5">
            {chips.map((chip) => (
              <Link
                key={chip.id}
                to={chip.href}
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors active:scale-[0.97]',
                  chip.accent
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    : 'border-border/60 bg-muted/30 text-muted-foreground active:bg-muted active:text-foreground'
                )}
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileHeader;
