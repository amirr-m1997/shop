import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  X, ChevronDown, Home, ShoppingBag, Sparkles, Tag,
  BookOpen, Ruler, Info, Heart, MessageCircle, User, LogOut, Package, Moon, Sun, Phone
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { STATIC_NAV } from './navConfig';

const ICON_MAP = {
  home: Home,
  products: ShoppingBag,
  new: Sparkles,
  sale: Tag,
  blog: BookOpen,
  size: Ruler,
  about: Info,
  contact: Phone,
};

/**
 * RTL right-side mobile drawer menu.
 */
const MobileDrawer = ({
  open,
  onClose,
  categories = [],
  isAuthenticated,
  userFullName,
  unreadChat,
  wishlistCount,
  theme,
  toggleTheme,
  onLogout,
}) => {
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!open) {
      setExpanded(null);
      return undefined;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  const NavLink = ({ to, children, icon: Icon, badge, onClick, className }) => (
    <Link
      to={to}
      onClick={(e) => {
        onClick?.(e);
        onClose();
      }}
      className={cn(
        'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground transition-colors active:bg-muted/70',
        className
      )}
    >
      {Icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <span className="flex-1 text-right">{children}</span>
      {badge > 0 && (
        <span className="min-w-[1.25rem] rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-black">
          {badge > 99 ? '۹۹+' : badge.toLocaleString('fa-IR')}
        </span>
      )}
    </Link>
  );

  return createPortal(
    <div dir="rtl" aria-hidden={!open}>
      <div
        className={cn(
          'fixed inset-0 z-[70] bg-black/45 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="منوی اصلی"
        className={cn(
          'fixed top-0 bottom-0 right-0 z-[80] flex w-[min(100vw-3rem,20rem)] flex-col',
          'border-l border-border/50 bg-background/97 shadow-2xl backdrop-blur-2xl',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-4">
          <div>
            <p className="text-base font-black tracking-tight">فروشگاه مد</p>
            <p className="text-[11px] text-muted-foreground">تجربه خرید لوکس</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="بستن منو"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          {/* Static links */}
          <nav className="space-y-0.5">
            {STATIC_NAV.map((item) => {
              const Icon = ICON_MAP[item.id] || ShoppingBag;
              return (
                <NavLink
                  key={item.id}
                  to={item.href}
                  icon={Icon}
                  className={item.accent ? 'text-amber-700 dark:text-amber-400' : undefined}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Categories with expand */}
          {categories.length > 0 && (
            <div className="mt-4 border-t border-border/50 pt-3">
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                دسته‌ها
              </p>
              <div className="space-y-0.5">
                {categories.map((cat) => {
                  const hasChildren = cat.children?.length > 0;
                  const isOpen = expanded === cat.id;
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/category/${cat.slug}`}
                          onClick={onClose}
                          className="flex flex-1 items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors active:bg-muted/70"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <ShoppingBag className="h-4 w-4" />
                          </span>
                          <span className="flex-1 text-right">{cat.name}</span>
                        </Link>
                        {hasChildren && (
                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? null : cat.id)}
                            className="me-1 flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted"
                            aria-expanded={isOpen}
                            aria-label={isOpen ? 'بستن زیرمنو' : 'باز کردن زیرمنو'}
                          >
                            <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                          </button>
                        )}
                      </div>
                      {hasChildren && isOpen && (
                        <div className="mb-1 me-2 space-y-0.5 border-r border-amber-500/20 pr-3">
                          {cat.children.map((child) => (
                            <Link
                              key={child.id}
                              to={`/category/${child.slug}`}
                              onClick={onClose}
                              className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors active:bg-muted/50 active:text-foreground"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Account / extras */}
          <div className="mt-4 space-y-0.5 border-t border-border/50 pt-3">
            <NavLink to={isAuthenticated ? '/profile' : '/login'} icon={Heart} badge={wishlistCount}>
              علاقه‌مندی‌ها
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/chat" icon={MessageCircle} badge={unreadChat}>
                استایل چت
              </NavLink>
            )}
            <NavLink to={isAuthenticated ? '/profile' : '/login'} icon={User}>
              {isAuthenticated ? 'حساب کاربری' : 'ورود / ثبت‌نام'}
            </NavLink>
            {isAuthenticated && (
              <NavLink to="/orders" icon={Package}>
                سفارش‌های من
              </NavLink>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors active:bg-muted/70"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </span>
              <span className="flex-1 text-right">
                {theme === 'light' ? 'حالت تاریک' : 'حالت روشن'}
              </span>
            </button>

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout?.();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive transition-colors active:bg-destructive/10"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                  <LogOut className="h-4 w-4" />
                </span>
                <span className="flex-1 text-right">خروج از حساب</span>
              </button>
            )}
          </div>

          {isAuthenticated && userFullName && (
            <p className="mt-4 px-3 pb-2 text-xs text-muted-foreground">
              وارد شده به‌عنوان <span className="font-semibold text-foreground">{userFullName}</span>
            </p>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
};

export default MobileDrawer;
