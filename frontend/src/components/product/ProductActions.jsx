import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import WishlistButton from '../WishlistButton';
import SendToFriendButton from '../chat/SendToFriendButton';
import FeedbackModal from '../ui/FeedbackModal';

const ProductActions = ({
  isAuthenticated,
  handleAddToCart,
  addedToCart,
  cartError,
  onCloseSuccess,
  onCloseError,
  maxStock,
  product,
}) => {
  const navigate = useNavigate();

  const goToCart = () => {
    onCloseSuccess();
    navigate('/cart');
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={maxStock < 1}
          className="group relative flex h-14 flex-1 items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-foreground px-6 text-base font-black text-background shadow-[0_18px_45px_-18px_hsl(var(--foreground)/0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-20px_hsl(var(--foreground)/0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <span className="absolute inset-0 bg-gradient-to-l from-white/15 via-transparent to-white/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <ShoppingCart className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
          <span>{maxStock < 1 ? 'ناموجود' : 'افزودن به سبد خرید'}</span>
        </button>

        <div className="flex gap-2.5">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <WishlistButton
              productId={product.id}
              size="h-5 w-5"
              className="!static !flex !h-14 !w-14 items-center justify-center rounded-2xl border border-border/70 bg-background/65 shadow-sm backdrop-blur-sm transition-all hover:scale-105 hover:border-foreground/20"
            />
          </div>

          <SendToFriendButton
            product={product}
            variant="icon"
            label="ارسال به دوست"
            className="!h-14 !w-14 rounded-2xl border border-border/70 bg-background/65 shadow-sm backdrop-blur-sm transition-all hover:scale-105 hover:border-foreground/20"
          />
        </div>
      </div>

      {cartError && (
        <p
          className="flex items-start gap-2 rounded-2xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm font-bold leading-7 text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {cartError}
        </p>
      )}

      <FeedbackModal
        open={addedToCart}
        type="success"
        title="به سبد خرید اضافه شد"
        message={
          !isAuthenticated
            ? 'محصول با موفقیت به سبد خرید شما اضافه شد. می‌توانید بدون ایجاد حساب ثبت سفارش کنید.'
            : 'محصول با موفقیت به سبد خرید شما اضافه شد.'
        }
        primaryLabel="بازگشت به همین محصول"
        primaryClassName="rounded-xl bg-foreground text-background hover:bg-foreground/90"
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
    </div>
  );
};

export default ProductActions;
