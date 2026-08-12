import { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search, ShoppingCart, User, Moon, Sun, Heart, MessageCircle,
  ChevronDown, LogOut, Package
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import { cn } from '../../lib/utils';
import { DESKTOP_STATIC_AFTER, DESKTOP_STATIC_BEFORE, isMegaCategory } from './navConfig';
import MegaMenu from './MegaMenu';

/**
 * Premium two-level desktop header with mega menu + compact scroll state.
 */
const DesktopHeader = ({
  scrolled,
  isChat,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchInputRef,
  navCategories,
  cartCount,
  wishlistCount,
  unreadChat,
  isAuthenticated,
  userFullName,
  theme,
  toggleTheme,
  onCartOpen,
  onLogout,
}) => {
  const location = useLocation();
  const [openMega, setOpenMega] = useState(null);
  const [openSimple, setOpenSimple] = useState(null);
  const navRef = useRef(null);
  const closeTimer = useRef(null);

  useEffect(() => {
    setOpenMega(null);
    setOpenSimple(null);
  }, [location.pathname]);

  useEffect(() => {
    const onDoc = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMega(null);
        setOpenSimple(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setOpenMega(null);
      setOpenSimple(null);
    }, 160);
  };

  const cancelClose = () => clearTimeout(closeTimer.current);

  const openCategory = (cat) => {
    cancelClose();
    if (isMegaCategory(cat)) {
      setOpenMega(cat.id);
      setOpenSimple(null);
    } else if (cat.children?.length) {
      setOpenSimple(cat.id);
      setOpenMega(null);
    }
  };

  const activeMega = navCategories.find((c) => c.id === openMega);

  const navLinkClass = (accent) =>
    cn(
      'relative inline-flex items-center gap-1 whitespace-nowrap px-2.5 py-2 text-[13px] font-medium tracking-tight transition-colors',
      'text-muted-foreground hover:text-foreground',
      accent && 'text-amber-700 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300'
    );

  return (
    <div className="hidden md:block" ref={navRef}>
      {/* ── Level 1: Brand + Search + Actions ── */}
      <div
        className={cn(
          'transition-[padding,height] duration-300 ease-out',
          scrolled ? 'py-2' : 'py-3.5'
        )}
      >
        <div className="container mx-auto flex items-center gap-6 px-4">
          {/* Brand */}
          <Link
            to={isChat ? '/chat' : '/'}
            className="group flex shrink-0 items-center gap-2.5"
          >
            {isChat ? (
              <>
                <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-md shadow-amber-500/25">
                  <MessageCircle className="h-5 w-5 text-white" />
                </span>
                <span className="flex flex-col leading-none">
                  <span className="text-lg font-black tracking-tight">استایل چت</span>
                  <span className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                    مشاوره استایل و خرید
                  </span>
                </span>
              </>
            ) : (
              <span className="flex flex-col leading-none">
                <span
                  className={cn(
                    'font-black tracking-tight transition-all duration-300',
                    scrolled ? 'text-xl' : 'text-2xl'
                  )}
                >
                  فروشگاه مد
                </span>
                {!scrolled && (
                  <span className="mt-1 text-[10px] font-medium tracking-[0.2em] text-muted-foreground/80">
                    LUXURY FASHION
                  </span>
                )}
              </span>
            )}
          </Link>

          {/* Search — prominent but elegant. Global header stays available in chat. */}
          <form onSubmit={onSearchSubmit} className="mx-auto w-full max-w-xl flex-1">
              <div className="relative group">
                <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-amber-600" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="جستجوی محصولات، برندها و دسته‌بندی‌ها..."
                  value={searchQuery}
                  onChange={onSearchChange}
                  className={cn(
                    'w-full rounded-full border-border/70 bg-muted/40 pe-4 ps-10 text-sm shadow-none transition-all',
                    'placeholder:text-muted-foreground/70',
                    'focus-visible:border-amber-500/40 focus-visible:bg-background focus-visible:ring-amber-500/20',
                    scrolled ? 'h-10' : 'h-11'
                  )}
                />
              </div>
            </form>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-10 w-10 rounded-full"
              aria-label="تغییر تم"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            <Link
              to={isAuthenticated ? '/wishlist' : '/login'}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
              title="علاقه‌مندی‌ها"
              aria-label="علاقه‌مندی‌ها"
            >
              <Heart className="h-[1.15rem] w-[1.15rem]" />
              {wishlistCount > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center border-0 bg-gradient-to-r from-amber-500 to-yellow-600 p-0 px-1 text-[10px] font-bold text-black">
                  {wishlistCount > 99 ? '۹۹+' : wishlistCount.toLocaleString('fa-IR')}
                </Badge>
              )}
            </Link>

            {isAuthenticated && (
              <Link
                to="/chat"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
                title="استایل چت"
                aria-label="استایل چت"
              >
                <MessageCircle className="h-[1.15rem] w-[1.15rem]" />
                {unreadChat > 0 && (
                  <Badge className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center border-0 bg-gradient-to-r from-amber-500 to-yellow-600 p-0 px-1 text-[10px] font-bold text-black">
                    {unreadChat > 99 ? '۹۹+' : unreadChat.toLocaleString('fa-IR')}
                  </Badge>
                )}
              </Link>
            )}

            <button
              type="button"
              onClick={onCartOpen}
              data-cart-icon
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
              aria-label="سبد خرید"
            >
              <ShoppingCart className="h-[1.15rem] w-[1.15rem]" />
              {cartCount > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center border-0 bg-gradient-to-r from-amber-500 to-yellow-600 p-0 px-1 text-[10px] font-bold text-black">
                  {cartCount > 99 ? '۹۹+' : cartCount.toLocaleString('fa-IR')}
                </Badge>
              )}
            </button>

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="ms-1 h-10 gap-2 rounded-full px-2.5"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-yellow-600/10 ring-1 ring-amber-500/25">
                      <User className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                    </div>
                    <span className="inline max-w-[8rem] truncate text-sm font-medium">
                      {userFullName}
                    </span>
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
                    <Link to="/profile" className="flex w-full cursor-pointer items-center justify-end gap-2">
                      <span>پروفایل کاربری</span>
                      <User className="h-4 w-4" />
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="flex w-full cursor-pointer items-center justify-end gap-2">
                      <span>سفارش‌های من</span>
                      <Package className="h-4 w-4" />
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="flex cursor-pointer items-center justify-end gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <span>خروج از حساب</span>
                    <LogOut className="h-4 w-4" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/login" className="ms-1">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" aria-label="ورود">
                  <User className="h-[1.15rem] w-[1.15rem]" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── Level 2: Navigation — stays pinned while scrolling on desktop/tablet ── */}
      <div
        className={cn(
          'relative border-t border-border/40',
          scrolled && 'shadow-[0_8px_18px_-10px_rgba(0,0,0,0.18)]'
        )}
      >
          <div className="container mx-auto px-4">
            <nav className="flex items-center justify-center gap-0.5 overflow-x-auto scrollbar-hide py-0.5">
              {DESKTOP_STATIC_BEFORE.map((item) => (
                <Link key={item.id} to={item.href} className={navLinkClass()}>
                  {item.label}
                </Link>
              ))}

              {navCategories.map((cat) => {
                const hasKids = cat.children?.length > 0;
                const mega = isMegaCategory(cat);
                if (!hasKids) {
                  return (
                    <Link
                      key={cat.id}
                      to={`/category/${cat.slug}`}
                      className={navLinkClass()}
                    >
                      {cat.name}
                    </Link>
                  );
                }
                return (
                  <div
                    key={cat.id}
                    className="relative"
                    onMouseEnter={() => openCategory(cat)}
                    onMouseLeave={scheduleClose}
                  >
                    <button
                      type="button"
                      className={cn(
                        navLinkClass(),
                        (openMega === cat.id || openSimple === cat.id) && 'text-foreground'
                      )}
                      onClick={() => openCategory(cat)}
                      aria-expanded={openMega === cat.id || openSimple === cat.id}
                    >
                      {cat.name}
                      <ChevronDown
                        className={cn(
                          'h-3 w-3 transition-transform',
                          (openMega === cat.id || openSimple === cat.id) && 'rotate-180'
                        )}
                      />
                    </button>

                    {/* Simple dropdown for smaller category trees */}
                    {!mega && openSimple === cat.id && (
                      <div
                        className="absolute top-full right-0 z-50 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-border/60 bg-background/95 py-2 shadow-xl backdrop-blur-xl"
                        onMouseEnter={cancelClose}
                      >
                        <Link
                          to={`/category/${cat.slug}`}
                          className="block px-4 py-2 text-sm font-bold text-amber-700 dark:text-amber-400 hover:bg-muted"
                          onClick={() => setOpenSimple(null)}
                        >
                          همه {cat.name}
                        </Link>
                        <div className="my-1 border-t border-border/50" />
                        {cat.children.map((child) => (
                          <Link
                            key={child.id}
                            to={`/category/${child.slug}`}
                            className="block px-4 py-2 text-sm text-foreground hover:bg-muted"
                            onClick={() => setOpenSimple(null)}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {DESKTOP_STATIC_AFTER.map((item) => (
                <Link key={item.id} to={item.href} className={navLinkClass(item.accent)}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Mega menu panel (full width under nav) */}
          {activeMega && (
            <div onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
              <MegaMenu
                category={activeMega}
                open={Boolean(activeMega)}
                onClose={() => setOpenMega(null)}
              />
            </div>
          )}
        </div>
    </div>
  );
};

export default DesktopHeader;
