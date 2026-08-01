import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, ShoppingBag, ArrowRight, Trash2, Sparkles } from 'lucide-react';
import { formatPrice } from '../lib/formatPrice';
import { useCart } from '../contexts/CartContext';
import CartItemDrawer from './CartItemDrawer';

export default function CartDrawer({ isOpen, onClose }) {
  const { cart, clearCart } = useCart();
  const items = cart?.items || [];
  const totalPrice = cart?.total_price || 0;
  const itemCount = cart?.total_items || items.length;
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const drawer = (
    <div dir="rtl" aria-hidden={!isOpen}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-md"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 300ms',
        }}
        onClick={onClose}
      />

      {/* ── Mobile: Bottom Sheet ── */}
      {isMobile ? (
        <aside
          className="fixed bottom-0 left-0 right-0 z-[70] flex flex-col
                     max-h-[85vh] rounded-t-3xl
                     border-t border-white/20 dark:border-white/10
                     shadow-[0_-8px_40px_rgba(0,0,0,0.15)]
                     bg-white/80 dark:bg-gray-950/80
                     backdrop-blur-2xl"
          style={{
            transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 350ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1.5 w-12 rounded-full bg-black/15 dark:bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between
                          border-b border-white/20 dark:border-white/10
                          px-4 py-3 shrink-0
                          bg-white/40 dark:bg-white/5 backdrop-blur-lg">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold">سبد خرید</h2>
              {itemCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </div>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors" aria-label="بستن">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="relative mx-auto mb-6 h-24 w-24">
                  <div className="absolute inset-0 animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-gradient-to-br from-primary/15 via-violet-500/10 to-blue-500/10 blur-xl" />
                  <div className="relative flex h-full w-full items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-muted/40 shadow-lg shadow-primary/5 ring-1 ring-white/20 dark:ring-white/5">
                      <ShoppingBag className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.15} />
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/30 ring-2 ring-background">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">سبد خرید</p>
                <p className="font-bold text-foreground text-lg">هنوز چیزی اینجا نیست</p>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">محصولات خاص منتظر شما هستند</p>
                <Link
                  to="/products"
                  onClick={onClose}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
                >
                  کشف محصولات
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {items.map((item) => (
                  <CartItemDrawer key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="shrink-0
                            border-t border-white/20 dark:border-white/10
                            bg-white/60 dark:bg-white/5 backdrop-blur-lg
                            px-4 py-3 space-y-2.5
                            pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between">
                <button
                  onClick={clearCart}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  خالی کردن سبد
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-black/5 dark:bg-white/10 backdrop-blur-sm px-4 py-3">
                <span className="text-sm text-muted-foreground">جمع کل</span>
                <span className="text-lg font-bold">{formatPrice(totalPrice)}</span>
              </div>

              <Link
                to="/checkout"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                ادامه فرآیند خرید
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={onClose}
                className="w-full rounded-xl border border-black/10 dark:border-white/10
                           bg-white/40 dark:bg-white/5 backdrop-blur-sm
                           py-2.5 text-sm font-medium text-muted-foreground
                           hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                ادامه خرید
              </button>
            </div>
          )}
        </aside>
      ) : (
        /* ── Desktop: Side Panel ── */
        <aside
          className="fixed top-0 left-0 z-[70] h-full flex flex-col
                     w-[min(85vw,420px)] lg:w-[440px]
                     border-r border-white/20 dark:border-white/10
                     shadow-[0_8px_32px_rgba(0,0,0,0.12)]
                     bg-white/70 dark:bg-gray-950/70
                     backdrop-blur-2xl"
          style={{
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between
                          border-b border-white/20 dark:border-white/10
                          px-5 py-4 shrink-0
                          bg-white/40 dark:bg-white/5 backdrop-blur-lg">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold">سبد خرید</h2>
              {itemCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {itemCount}
                </span>
              )}
            </div>
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10 transition-colors" aria-label="بستن">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                <div className="relative mx-auto mb-6 h-28 w-28">
                  <div className="absolute inset-0 animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-gradient-to-br from-primary/15 via-violet-500/10 to-blue-500/10 blur-xl" />
                  <div className="relative flex h-full w-full items-center justify-center">
                    <div className="flex h-22 w-22 h-[5.5rem] w-[5.5rem] items-center justify-center rounded-[1.5rem] border border-border/50 bg-gradient-to-br from-card via-card to-muted/40 shadow-lg shadow-primary/5 ring-1 ring-white/20 dark:ring-white/5">
                      <ShoppingBag className="h-9 w-9 text-muted-foreground/50" strokeWidth={1.15} />
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -left-1 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/30 ring-2 ring-background">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">سبد خرید</p>
                <p className="text-lg font-bold text-foreground">هنوز چیزی اینجا نیست</p>
                <p className="mt-1.5 max-w-[220px] text-sm leading-relaxed text-muted-foreground">
                  محصولات خاص و مجموعه‌های منتخب منتظر شما هستند
                </p>
                <Link
                  to="/products"
                  onClick={onClose}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
                >
                  کشف محصولات
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5 p-4">
                {items.map((item) => (
                  <CartItemDrawer key={item.id} item={item} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="shrink-0
                            border-t border-white/20 dark:border-white/10
                            bg-white/50 dark:bg-white/5 backdrop-blur-lg
                            px-5 py-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <button
                  onClick={clearCart}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  خالی کردن سبد
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-black/5 dark:bg-white/10 backdrop-blur-sm px-4 py-3">
                <span className="text-sm text-muted-foreground">جمع کل</span>
                <span className="text-lg font-bold">{formatPrice(totalPrice)}</span>
              </div>

              <Link
                to="/checkout"
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                ادامه فرآیند خرید
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={onClose}
                className="w-full rounded-xl border border-black/10 dark:border-white/10
                           bg-white/40 dark:bg-white/5 backdrop-blur-sm
                           py-2.5 text-sm font-medium text-muted-foreground
                           hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                ادامه خرید
              </button>
            </div>
          )}
        </aside>
      )}
    </div>
  );

  // Portal: render at body level to escape header's stacking context
  return createPortal(drawer, document.body);
}
