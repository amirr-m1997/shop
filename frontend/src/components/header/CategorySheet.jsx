import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, Shirt, Sparkles, Tag, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MOBILE_CHIPS } from './navConfig';

const QUICK_LINKS = [
  { id: 'new', label: 'جدیدترین', href: '/new-arrivals', icon: Sparkles },
  { id: 'trending', label: 'ترندها', href: '/trending', icon: TrendingUp },
  { id: 'sale', label: 'تخفیف‌ها', href: '/sale', icon: Tag },
  { id: 'all', label: 'همه محصولات', href: '/products', icon: Shirt },
];

/**
 * Premium mobile bottom sheet for categories.
 */
const CategorySheet = ({ open, onClose, categories = [] }) => {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div dir="rtl" aria-hidden={!open}>
      <div
        className={cn(
          'fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="دسته‌بندی‌ها"
        className={cn(
          'fixed inset-x-0 bottom-0 z-[80] flex max-h-[82vh] flex-col rounded-t-3xl',
          'border-t border-white/20 bg-background/95 shadow-2xl backdrop-blur-2xl',
          'dark:border-white/10 dark:bg-[#121216]/95',
          'transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Handle */}
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
        </div>

        <div className="flex items-center justify-between px-5 pb-3 pt-1">
          <h2 className="text-base font-bold tracking-tight">دسته‌بندی‌ها</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {/* Quick links */}
          <div className="mb-5 grid grid-cols-2 gap-2.5">
            {QUICK_LINKS.map(({ id, label, href, icon: Icon }) => (
              <Link
                key={id}
                to={href}
                onClick={onClose}
                className="flex items-center gap-2.5 rounded-2xl border border-border/60 bg-muted/30 px-3.5 py-3 transition-colors active:bg-muted/60"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold">{label}</span>
              </Link>
            ))}
          </div>

          {/* API categories */}
          {categories.length > 0 && (
            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground">{cat.name}</h3>
                    <Link
                      to={`/category/${cat.slug}`}
                      onClick={onClose}
                      className="text-[11px] font-semibold text-amber-600 dark:text-amber-400"
                    >
                      همه
                    </Link>
                  </div>
                  {cat.children?.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {cat.children.map((child) => (
                        <Link
                          key={child.id}
                          to={`/category/${child.slug}`}
                          onClick={onClose}
                          className="rounded-xl border border-border/50 bg-card px-3 py-2.5 text-sm text-muted-foreground transition-colors active:bg-muted/50 active:text-foreground"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Link
                      to={`/category/${cat.slug}`}
                      onClick={onClose}
                      className="block rounded-xl border border-border/50 bg-card px-3 py-2.5 text-sm text-muted-foreground"
                    >
                      مشاهده {cat.name}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Fallback chips if no categories */}
          {categories.length === 0 && (
            <div className="flex flex-wrap gap-2">
              {MOBILE_CHIPS.map((chip) => (
                <Link
                  key={chip.id}
                  to={chip.href}
                  onClick={onClose}
                  className="rounded-full border border-border/60 px-3.5 py-1.5 text-sm font-medium"
                >
                  {chip.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>,
    document.body
  );
};

export default CategorySheet;
