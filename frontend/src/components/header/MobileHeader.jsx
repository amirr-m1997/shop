import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Heart, ShoppingCart, Search, MessageCircle, X } from 'lucide-react';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';
import { MOBILE_CHIPS } from './navConfig';

/**
 * App-like mobile top header.
 * Keeps a single fixed-height top bar (no reflow jumps while scrolling).
 * Search is a compact icon button that opens a floating overlay panel
 * on top of the content — it never takes space from the page layout.
 */
const MobileHeader = ({
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
  const [searchOpen, setSearchOpen] = useState(false);

  const chips = [
    ...MOBILE_CHIPS,
    ...navCategories.slice(0, 6).map((c) => ({
      id: `cat-${c.id}`,
      label: c.name,
      href: `/category/${c.slug}`,
    })),
  ];

  const closeSearch = () => setSearchOpen(false);

  return (
    <div className="relative md:hidden">
      {/* Top bar — hamburger on RIGHT (RTL start) */}
      <div className="flex h-14 items-center gap-2 px-3">
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
            <button
              type="button"
              onClick={() => setSearchOpen((o) => !o)}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-colors active:bg-muted/70',
                searchOpen && 'bg-muted text-foreground'
              )}
              aria-label="جستجو"
              aria-expanded={searchOpen}
            >
              <Search className="h-5 w-5" />
            </button>
          )}

          {!isChat && (
            <Link
              to={isAuthenticated ? '/wishlist' : '/login'}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors"
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

      {/* Floating search — overlays content, does NOT affect page height */}
      {searchOpen && (
        <div className="animate-fade-in absolute inset-x-3 top-[calc(100%+0.25rem)] z-50 overflow-hidden rounded-2xl border border-border/60 bg-background/95 p-3 shadow-xl shadow-black/5 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              onSearchSubmit(e);
              closeSearch();
            }}
          >
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="search"
                autoFocus
                placeholder="جستجوی محصولات، برندها و دسته‌بندی‌ها..."
                value={searchQuery}
                onChange={onSearchChange}
                className="h-11 w-full rounded-xl border-border/60 bg-muted/50 pe-10 ps-10 text-sm shadow-none placeholder:text-muted-foreground/75 focus-visible:border-amber-500/40 focus-visible:ring-amber-500/15"
              />
              <button
                type="button"
                onClick={closeSearch}
                className="absolute end-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="بستن جستجو"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="mt-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
            {chips.map((chip) => (
              <Link
                key={chip.id}
                to={chip.href}
                onClick={closeSearch}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors active:scale-[0.97]',
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
