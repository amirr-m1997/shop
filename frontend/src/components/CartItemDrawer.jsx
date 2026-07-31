import React, { useState } from 'react';
import { Minus, Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { formatPrice } from '../lib/formatPrice';
import { useCart } from '../contexts/CartContext';

export default function CartItemDrawer({ item }) {
  const { updateCartItem, removeCartItem } = useCart();
  const [updating, setUpdating] = useState(false);

  const product = item.product || {};
  const variant = item.variant || {};
  const imageUrl = product.primary_image;
  const productName = product.name || 'محصول';
  const slug = product.slug || '#';
  const unitPrice = item.quantity > 0 ? parseFloat(item.total_price) / item.quantity : parseFloat(item.total_price);
  const quantity = item.quantity || 1;

  const handleUpdateQty = async (newQty) => {
    if (newQty < 1 || updating) return;
    setUpdating(true);
    try {
      if (newQty === 0) {
        await removeCartItem(item.id);
      } else {
        await updateCartItem({ item_id: item.id, quantity: newQty });
      }
    } catch {
    } finally {
      setUpdating(false);
    }
  };

  const handleRemove = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      await removeCartItem(item.id);
    } catch {
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={cn(
      'relative flex gap-2.5 sm:gap-3 rounded-2xl',
      'border border-white/25 dark:border-white/10',
      'bg-white/50 dark:bg-white/5 backdrop-blur-md',
      'p-2.5 sm:p-3 shadow-sm',
      updating && 'opacity-40 pointer-events-none'
    )}>
      {/* Image */}
      <a href={`/product/${slug}`} className="block h-24 w-20 sm:h-28 sm:w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt={productName} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">بدون تصویر</div>
        )}
      </a>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        {/* Name */}
        <a href={`/product/${slug}`} className="text-sm font-bold text-foreground line-clamp-2 hover:text-primary transition-colors">
          {productName}
        </a>

        {/* Variant badges */}
        {(variant.size_name || variant.color_name) && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {variant.size_name && (
              <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold">سایز {variant.size_name}</span>
            )}
            {variant.color_name && (
              <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold">
                <span className="h-2.5 w-2.5 rounded-full border" style={{ backgroundColor: variant.color_hex || '#999' }} />
                {variant.color_name}
              </span>
            )}
          </div>
        )}

        {/* Bottom row: qty + price */}
        <div className="mt-2 flex items-center justify-between gap-2">
          {/* Quantity */}
          <div className="inline-flex items-center rounded-lg border bg-background shrink-0">
            <button
              onClick={() => handleUpdateQty(quantity - 1)}
              disabled={updating || quantity <= 1}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-l-lg hover:bg-muted disabled:opacity-30 transition-colors"
              aria-label="کاهش"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-7 sm:w-8 text-center text-xs sm:text-sm font-bold tabular-nums">{quantity}</span>
            <button
              onClick={() => handleUpdateQty(quantity + 1)}
              disabled={updating}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-r-lg hover:bg-muted disabled:opacity-30 transition-colors"
              aria-label="افزایش"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Price + Delete */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-foreground">{formatPrice(unitPrice * quantity)}</span>
            <button
              onClick={handleRemove}
              disabled={updating}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label="حذف"
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
