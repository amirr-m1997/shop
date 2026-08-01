import React from 'react';
import { Star, Truck, RotateCcw, Shield, AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { formatPrice } from '../../lib/formatPrice';

const TRUST_ITEMS = [
  { icon: Truck, title: 'ارسال رایگان', desc: 'سفارش بالای ۲ میلیون' },
  { icon: RotateCcw, title: 'بازگشت آسان', desc: 'تا ۳۰ روز' },
  { icon: Shield, title: 'پرداخت امن', desc: 'درگاه رسمی' },
];

const ProductInfo = ({ product, maxStock, selectedSize, selectedColor }) => {
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {product.category_name && (
          <Badge className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground hover:bg-muted">
            {product.category_name}
          </Badge>
        )}
        {product.is_new_arrival && (
          <Badge className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            جدید
          </Badge>
        )}
      </div>

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
        {product.name}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 sm:h-5 sm:w-5 ${
                i < Math.floor(product.rating || 0)
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground/25'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          ({(product.review_count || 0).toLocaleString('fa-IR')} نظر)
        </span>
        {product.sku && (
          <span className="text-xs text-muted-foreground/70">
            کد: {product.sku}
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
          {formatPrice(product.price || 0)}
        </span>
        {product.compare_price && (
          <>
            <span className="text-lg font-medium text-red-500/80 line-through tabular-nums">
              {formatPrice(product.compare_price)}
            </span>
            {product.discount_percentage > 0 && (
              <span className="rounded-xl bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
                −{product.discount_percentage}٪
              </span>
            )}
          </>
        )}
      </div>

      {product.description && (
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {product.description}
        </p>
      )}

      {maxStock > 0 && maxStock < 10 && selectedSize && selectedColor && (
        <div className="mt-4 text-xs font-semibold text-red-600 dark:text-red-400">
          تنها {maxStock.toLocaleString('fa-IR')} عدد از این ترکیب باقی مانده
        </div>
      )}

      {maxStock < 1 && selectedSize && selectedColor && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200/50 bg-red-50/80 px-4 py-3 text-sm font-bold text-red-600 backdrop-blur-sm dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400">
          این ترکیب موجود نیست
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {TRUST_ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/50 px-4 py-3.5 backdrop-blur-sm dark:border-white/[0.06]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 dark:bg-white/10">
              <item.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{item.title}</p>
              <p className="truncate text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default ProductInfo;
