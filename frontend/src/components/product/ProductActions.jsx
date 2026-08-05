import React from 'react';
import { ShoppingCart, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import WishlistButton from '../WishlistButton';

const ProductActions = ({
  isAuthenticated,
  handleAddToCart,
  addedToCart,
  cartError,
  selectedSize,
  selectedColor,
  maxStock,
  product,
}) => {
  return (
    <>
      {cartError && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {cartError}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          size="lg"
          onClick={handleAddToCart}
          disabled={maxStock < 1}
          className="h-12 flex-1 rounded-2xl bg-neutral-900 text-base font-bold text-white shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:bg-neutral-800 disabled:translate-y-0 disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-white/95"
        >
          <ShoppingCart className="ml-2 h-5 w-5" />
          افزودن به سبد خرید
        </Button>

        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <WishlistButton
            productId={product.id}
            size="h-5 w-5"
            className="!static !h-12 !w-12 rounded-2xl border border-border/60 bg-background/60 shadow-none"
          />
        </div>
      </div>

      {addedToCart && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>
            به سبد خرید اضافه شد.
            {!isAuthenticated && (
              <span className="block mt-1 text-emerald-600/90 dark:text-emerald-400/90">
                میتوانید بدون ایجاد حساب ثبت سفارش کنید.
              </span>
            )}
          </span>
        </div>
      )}
    </>
  );
};

export default ProductActions;
