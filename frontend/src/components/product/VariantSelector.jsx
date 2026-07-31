import React from 'react';
import { Ruler, Minus, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const VariantSelector = ({
  product,
  selectedSize,
  setSelectedSize,
  selectedColor,
  setSelectedColor,
  quantity,
  setQuantity,
  maxStock,
  stockLoading,
}) => {
  const getStockForColor = (colorId) => {
    if (!product.variants?.length || !selectedSize) return null;
    const v = product.variants.find(
      (v) => String(v.size) === String(selectedSize) && String(v.color) === String(colorId)
    );
    return v ? (v.effective_stock ?? v.stock) : null;
  };

  const getStockForSize = (sizeId) => {
    if (!product.variants?.length || !selectedColor) return null;
    const v = product.variants.find(
      (v) => String(v.size) === String(sizeId) && String(v.color) === String(selectedColor)
    );
    return v ? (v.effective_stock ?? v.stock) : null;
  };

  const selectedColorObj = product.available_colors?.find((c) => c.id === selectedColor);

  return (
    <>
      {product.available_colors?.length > 0 && (
        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">رنگ</h3>
            {selectedColorObj && (
              <span className="text-xs text-muted-foreground">
                {selectedColorObj.name}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {product.available_colors.map((color) => {
              const cStock = getStockForColor(color.id);
              return (
              <button
                key={color.id}
                type="button"
                onClick={() => setSelectedColor(color.id)}
                disabled={cStock !== null && cStock < 1}
                className={`h-10 w-10 rounded-full border-2 transition-all ${
                  selectedColor === color.id
                    ? 'scale-110 border-neutral-900 shadow-md ring-2 ring-neutral-900/20 dark:border-white dark:ring-white/30'
                    : 'border-transparent hover:scale-105'
                } ${cStock !== null && cStock < 1 ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                style={{ backgroundColor: color.hex_code }}
                title={cStock !== null ? `${color.name} — ${cStock} عدد` : color.name}
                aria-label={color.name}
              />
            );
            })}
          </div>
        </div>
      )}

      {product.available_sizes?.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold">سایز</h3>
            <Link
              to="/size-finder"
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              <Ruler className="h-3.5 w-3.5" />
              راهنمای سایز
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.available_sizes.map((size) => {
              const sStock = getStockForSize(size.id);
              return (
              <button
                key={size.id}
                type="button"
                onClick={() => setSelectedSize(size.id)}
                disabled={sStock !== null && sStock < 1}
                className={`min-w-[3rem] rounded-xl border px-3.5 py-2.5 text-sm font-bold transition-all ${
                  selectedSize === size.id
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-md dark:border-white dark:bg-white dark:text-neutral-900'
                    : 'border-border/60 bg-background/50 hover:border-foreground/30'
                } ${sStock !== null && sStock < 1 ? 'opacity-30 cursor-not-allowed line-through' : ''}`}
                title={sStock !== null ? `${size.name} — ${sStock} عدد` : size.name}
              >
                {size.name}
              </button>
            );
            })}
          </div>
        </div>
      )}

      <div className="flex h-12 items-center rounded-2xl border border-border/60 bg-background/60">
        <button
          type="button"
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          disabled={quantity <= 1}
          aria-label="کاهش تعداد"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-10 text-center text-sm font-bold tabular-nums">
          {quantity.toLocaleString('fa-IR')}
        </span>
        <button
          type="button"
          onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
          className="flex h-full w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          disabled={quantity >= maxStock}
          aria-label="افزایش تعداد"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </>
  );
};

export default VariantSelector;
