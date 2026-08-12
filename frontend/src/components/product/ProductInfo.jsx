import { Star, AlertTriangle, Check } from 'lucide-react';
import { formatPrice } from '../../lib/formatPrice';

const ProductInfo = ({ product, maxStock, selectedSize, selectedColor }) => {
  const rating = product.rating || 0;
  const hasLowStock = maxStock > 0 && maxStock < 10 && selectedSize && selectedColor;
  const isUnavailable = maxStock < 1 && selectedSize && selectedColor;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {product.brand && (
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground/80">
              {product.brand}
            </span>
          )}
          {product.category_name && (
            <span className="rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-[11px] font-semibold text-muted-foreground backdrop-blur-sm">
              {product.category_name}
            </span>
          )}
          {product.is_new_arrival && (
            <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
              جدید
            </span>
          )}
        </div>

        <h1 className="text-[1.75rem] font-extrabold leading-[1.25] tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem]">
          {product.name}
        </h1>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-3 py-1.5 backdrop-blur-sm">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < Math.round(rating)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground/25'
                  }`}
                />
              ))}
            </div>
            <span className="font-bold tabular-nums text-foreground">
              {Number(rating || 0).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}
            </span>
            <span className="text-muted-foreground">
              ({(product.review_count || 0).toLocaleString('fa-IR')} نظر)
            </span>
          </div>

          {product.sku && (
            <span className="text-xs text-muted-foreground/80">
              کد محصول: <span className="font-semibold text-foreground/70">{product.sku}</span>
            </span>
          )}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-border/45 bg-gradient-to-br from-background/70 via-card/60 to-muted/25 p-5 shadow-sm backdrop-blur-xl dark:from-background/40 dark:via-card/30 dark:to-white/[0.02]">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <span className="text-3xl font-black tracking-tight text-foreground tabular-nums sm:text-4xl">
            {formatPrice(product.price || 0)}
          </span>
          {product.compare_price && Number(product.compare_price) > Number(product.price || 0) && (
            <div className="flex items-center gap-2 pb-1">
              <span className="text-base font-semibold text-muted-foreground line-through tabular-nums">
                {formatPrice(product.compare_price)}
              </span>
              {product.discount_percentage > 0 && (
                <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-extrabold text-destructive">
                  {product.discount_percentage.toLocaleString('fa-IR')}٪ تخفیف
                </span>
              )}
            </div>
          )}
        </div>

        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          قیمت نهایی بر اساس ترکیب رنگ و سایز انتخابی شما محاسبه می‌شود.
        </p>
      </div>

      {product.description && (
        <p className="max-w-xl text-[15px] leading-8 text-muted-foreground">
          {product.description}
        </p>
      )}

      {hasLowStock && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm font-bold text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          تنها {maxStock.toLocaleString('fa-IR')} عدد از این ترکیب باقی مانده است.
        </div>
      )}

      {isUnavailable && (
        <div className="flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm font-bold text-destructive">
          <AlertTriangle className="h-4 w-4" />
          این ترکیب رنگ و سایز در حال حاضر موجود نیست.
        </div>
      )}

      {!isUnavailable && (
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/12">
            <Check className="h-3.5 w-3.5" />
          </span>
          {hasLowStock ? 'موجود برای ثبت سفارش فوری' : 'موجود در انبار'}
        </div>
      )}
    </div>
  );
};

export default ProductInfo;
