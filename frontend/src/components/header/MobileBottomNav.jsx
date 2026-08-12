import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, MessageCircle, ShoppingCart, User } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Floating glassmorphism bottom navigation — mobile only.
 * Global navigation: stays available on chat routes too, with the Chat item active.
 */
const MobileBottomNav = ({
  cartCount = 0,
  unreadChat = 0,
  isAuthenticated = false,
  onCategoriesClick,
  onCartClick,
}) => {
  const location = useLocation();
  const path = location.pathname;

  const isActive = (match) => {
    if (match === '/') return path === '/';
    if (match === 'categories') return false; // sheet, not a route
    return path === match || path.startsWith(`${match}/`);
  };

  const items = [
    {
      id: 'home',
      label: 'خانه',
      icon: Home,
      to: '/',
      active: isActive('/'),
    },
    {
      id: 'categories',
      label: 'دسته‌ها',
      icon: LayoutGrid,
      action: onCategoriesClick,
      active: false,
    },
    {
      id: 'chat',
      label: 'استایل',
      icon: MessageCircle,
      to: isAuthenticated ? '/chat' : '/login',
      active: path.startsWith('/chat'),
      badge: unreadChat,
    },
    {
      id: 'cart',
      label: 'سبد',
      icon: ShoppingCart,
      action: onCartClick,
      active: path === '/cart',
      badge: cartCount,
      cartIcon: true,
    },
    {
      id: 'account',
      label: 'حساب',
      icon: User,
      to: isAuthenticated ? '/profile' : '/login',
      active: path.startsWith('/profile') || path.startsWith('/orders') || path.startsWith('/login'),
    },
  ];

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 md:hidden"
      aria-label="ناوبری موبایل"
    >
      <div className="pointer-events-auto mx-auto mb-[max(0.6rem,env(safe-area-inset-bottom))] w-[min(100%-1.25rem,28rem)]">
        <div
          className={cn(
            'flex items-stretch justify-between gap-0.5 rounded-[1.35rem] px-1.5 py-1.5',
            'border border-white/40 bg-white/75 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.18)] backdrop-blur-2xl',
            'dark:border-white/10 dark:bg-[#16161a]/80 dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.55)]'
          )}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <span className="relative flex h-7 w-7 items-center justify-center">
                  <Icon
                    className={cn(
                      'h-[1.15rem] w-[1.15rem] transition-colors',
                      item.active
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-muted-foreground'
                    )}
                    strokeWidth={item.active ? 2.25 : 1.75}
                  />
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -left-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 px-1 text-[9px] font-black leading-none text-black shadow-sm">
                      {item.badge > 99 ? '۹۹+' : item.badge.toLocaleString('fa-IR')}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    'mt-0.5 text-[10px] font-semibold leading-none transition-colors',
                    item.active
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
                {item.active && (
                  <span className="absolute bottom-0.5 h-0.5 w-4 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600" />
                )}
              </>
            );

            const className = cn(
              'relative flex flex-1 flex-col items-center justify-center rounded-2xl px-1 py-1.5 transition-all duration-200',
              item.active
                ? 'bg-amber-500/12 dark:bg-amber-500/15'
                : 'hover:bg-muted/50 active:bg-muted/70'
            );

            if (item.action) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  data-cart-icon={item.cartIcon ? true : undefined}
                  className={className}
                  aria-label={item.label}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link key={item.id} to={item.to} className={className} aria-label={item.label}>
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
