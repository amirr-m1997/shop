import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Button } from '../ui/Button';
import WishlistButton from '../WishlistButton';
import FeedbackModal from '../ui/FeedbackModal';

const ProductActions = ({
  isAuthenticated,
  handleAddToCart,
  addedToCart,
  cartError,
  onCloseSuccess,
  onCloseError,
  selectedSize,
  selectedColor,
  maxStock,
  product,
}) => {
  const navigate = useNavigate();

  const goToCart = () => {
    onCloseSuccess();
    navigate('/cart');
  };

  return (
    <>
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

      <FeedbackModal
        open={addedToCart}
        type="success"
        title="به سبد خرید اضافه شد"
        message={
          !isAuthenticated
            ? 'محصول با موفقیت به سبد خرید شما اضافه شد. میتوانید بدون ایجاد حساب ثبت سفارش کنید.'
            : 'محصول با موفقیت به سبد خرید شما اضافه شد.'
        }
        primaryLabel="ادامه خرید"
        onPrimary={onCloseSuccess}
        secondaryLabel="مشاهده سبد خرید"
        onSecondary={goToCart}
        onClose={onCloseSuccess}
      />

      {cartError && (
        <FeedbackModal
          open
          type="error"
          title="افزودن به سبد خرید"
          message={cartError}
          primaryLabel="باشه"
          onPrimary={onCloseError}
          onClose={onCloseError}
        />
      )}
    </>
  );
};

export default ProductActions;
