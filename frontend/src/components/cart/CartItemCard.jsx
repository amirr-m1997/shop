import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus } from 'lucide-react';
import { formatPrice, formatPriceNumber } from '../../lib/formatPrice';
import { PLACEHOLDER_IMG } from '../../lib/placeholders';

const CartItemCard = ({ item, onQuantityChange, onRemove, updating, index }) => {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    await onRemove(item.id);
  };

  const unitPrice =
    item.quantity > 0
      ? parseFloat(item.total_price) / item.quantity
      : parseFloat(item.total_price);

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-md transition-all duration-500 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/[0.06] ${
        removing ? 'scale-[0.98] opacity-40' : 'animate-fade-in-up'
      }`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="absolute bottom-4 top-4 right-0 w-1 origin-center scale-y-0 rounded-full bg-gradient-to-b from-primary via-violet-500 to-blue-500 opacity-0 transition-all duration-500 group-hover:scale-y-100 group-hover:opacity-100" />

      <div className="flex gap-4 p-4 sm:gap-6 sm:p-5">
        <Link
          to={`/product/${item.product.slug}`}
          className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-border/50 transition-all duration-500 group-hover:ring-primary/30 sm:h-36 sm:w-32"
        >
          <img
            src={item.product.primary_image || PLACEHOLDER_IMG}
            alt={item.product.name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to={`/product/${item.product.slug}`}
                className="line-clamp-2 text-sm font-bold leading-snug tracking-tight transition-colors duration-300 hover:text-primary sm:text-base"
              >
                {item.product.name}
              </Link>

              {item.variant ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-lg bg-secondary/80 px-2.5 py-1 text-xs font-semibold text-secondary-foreground ring-1 ring-border/40">
                    سایز {item.variant.size_name}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-secondary/80 px-2.5 py-1 text-xs font-semibold text-secondary-foreground ring-1 ring-border/40">
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                      style={{
                        backgroundColor:
                          item.variant.color_hex ||
                          item.variant.color_code ||
                          'hsl(var(--muted-foreground))',
                      }}
                    />
                    {item.variant.color_name}
                  </span>
                  {item.variant.sku && (
                    <span className="rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {item.variant.sku}
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">نسخه استاندارد</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleRemove}
              disabled={updating || removing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-all duration-300 hover:bg-destructive/10 hover:text-destructive hover:shadow-sm disabled:pointer-events-none disabled:opacity-40"
              aria-label="حذف از سبد"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-4">
            <div className="inline-flex items-center rounded-2xl border border-border/70 bg-background/80 p-1.5 shadow-sm backdrop-blur-sm">
              <button
                type="button"
                onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1 || updating || removing}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-90 disabled:pointer-events-none disabled:opacity-35"
                aria-label="کاهش تعداد"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[2.25rem] select-none text-center text-sm font-bold tabular-nums">
                {item.quantity.toLocaleString('fa-IR')}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                disabled={updating || removing}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-90 disabled:pointer-events-none disabled:opacity-35"
                aria-label="افزایش تعداد"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="text-left">
              <p className="text-base font-bold tracking-tight sm:text-lg">
                {formatPrice(item.total_price)}
              </p>
              {item.quantity > 1 && (
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {formatPriceNumber(unitPrice)} × {item.quantity.toLocaleString('fa-IR')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default CartItemCard;
