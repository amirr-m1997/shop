import { Ruler, Minus, Plus, Check } from 'lucide-react';
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

  const selectedColorObj = product.available_colors?.find((c) => String(c.id) === String(selectedColor));
  const canIncrease = quantity < Math.max(1, maxStock || 1);

  return (
    <div className="space-y-6">
      {product.available_colors?.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">رنگ</h3>
              {selectedColorObj && (
                <p className="mt-0.5 text-xs text-muted-foreground">{selectedColorObj.name}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {product.available_colors.map((color) => {
              const cStock = getStockForColor(color.id);
              const unavailable = cStock !== null && cStock < 1;
              const isSelected = String(selectedColor) === String(color.id);

              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setSelectedColor(color.id)}
                  disabled={unavailable}
                  className={`group relative flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed ${
                    isSelected
                      ? 'border-foreground shadow-lg shadow-foreground/10'
                      : 'border-border/70 hover:border-foreground/35 hover:scale-105'
                  } ${unavailable ? 'opacity-35 grayscale' : ''}`}
                  title={cStock !== null ? `${color.name} — ${cStock.toLocaleString('fa-IR')} عدد` : color.name}
                  aria-label={color.name}
                  aria-pressed={isSelected}
                >
                  <span
                    className="h-8 w-8 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15"
                    style={{ backgroundColor: color.hex_code || 'currentColor' }}
                  />
                  {isSelected && (
                    <span
                      className="absolute -bottom-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background shadow-md"
                      aria-hidden="true"
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  {unavailable && (
                    <span
                      className="pointer-events-none absolute h-8 w-px bg-destructive/70"
                      style={{ transform: 'rotate(-45deg)' }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {product.available_sizes?.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-foreground">سایز</h3>
            <Link
              to="/size-finder"
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Ruler className="h-3.5 w-3.5" />
              راهنمای سایز
            </Link>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {product.available_sizes.map((size) => {
              const sStock = getStockForSize(size.id);
              const unavailable = sStock !== null && sStock < 1;
              const isSelected = String(selectedSize) === String(size.id);

              return (
                <button
                  key={size.id}
                  type="button"
                  onClick={() => setSelectedSize(size.id)}
                  disabled={unavailable}
                  className={`relative min-w-[3.35rem] rounded-2xl border px-4 py-3 text-sm font-extrabold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed ${
                    isSelected
                      ? 'border-foreground bg-foreground text-background shadow-xl shadow-foreground/15'
                      : 'border-border/70 bg-background/55 text-foreground hover:-translate-y-0.5 hover:border-foreground/35 hover:shadow-md'
                  } ${unavailable ? 'border-dashed border-border text-muted-foreground/50 line-through shadow-none hover:translate-y-0' : ''}`}
                  title={sStock !== null ? `${size.name} — ${sStock.toLocaleString('fa-IR')} عدد` : size.name}
                  aria-pressed={isSelected}
                >
                  {size.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-foreground">تعداد</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            حداکثر موجودی: {Math.max(0, maxStock || 0).toLocaleString('fa-IR')} عدد
          </p>
        </div>

        <div className="flex h-12 w-fit items-center rounded-2xl border border-border/70 bg-background/65 p-1 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
            disabled={quantity <= 1}
            aria-label="کاهش تعداد"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-base font-black tabular-nums text-foreground">
            {quantity.toLocaleString('fa-IR')}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(Math.max(1, maxStock || 1), quantity + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
            disabled={!canIncrease}
            aria-label="افزایش تعداد"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariantSelector;
