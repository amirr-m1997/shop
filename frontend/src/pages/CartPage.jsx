import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Tag, ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { SEO } from '../lib/seo';
import { calcShipping, useShippingConfig } from '../lib/shipping';
import AmbientBg from '../components/cart/AmbientBg';
import CartSkeleton from '../components/cart/CartSkeleton';
import EmptyCart from '../components/cart/EmptyCart';
import FreeShippingBar from '../components/cart/FreeShippingBar';
import CartItemCard from '../components/cart/CartItemCard';
import CouponSection from '../components/cart/CouponSection';
import OrderSummary from '../components/cart/OrderSummary';
import MobileCheckoutBar from '../components/cart/MobileCheckoutBar';

/* ─── Main Page ─── */
const CartPage = () => {
  const { cart, loading, updateCartItem, removeCartItem, coupon, couponError, couponLoading, applyCoupon, removeCoupon, clearCouponError } = useCart();
  const { config: shippingConfig } = useShippingConfig();
  const [updatingId, setUpdatingId] = useState(null);
  const pendingRef = useRef({});
  const timerRef = useRef({});

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    if (pendingRef.current[itemId]) return;

    if (timerRef.current[itemId]) {
      clearTimeout(timerRef.current[itemId]);
    }

    timerRef.current[itemId] = setTimeout(async () => {
      pendingRef.current[itemId] = true;
      setUpdatingId(itemId);
      try {
        await updateCartItem({ item_id: itemId, quantity: newQuantity });
      } catch {
        // error handled by context
      } finally {
        setUpdatingId(null);
        pendingRef.current[itemId] = false;
        delete timerRef.current[itemId];
      }
    }, 300);
  };

  const handleRemoveItem = async (itemId) => {
    if (pendingRef.current[itemId]) return;
    pendingRef.current[itemId] = true;
    setUpdatingId(itemId);
    try {
      await removeCartItem(itemId);
    } catch {
      // error handled by context
    } finally {
      setUpdatingId(null);
      pendingRef.current[itemId] = false;
    }
  };

  if (loading) return <CartSkeleton />;
  if (!cart || !cart.items || cart.items.length === 0) return <EmptyCart />;

  const subtotal = parseFloat(cart.total_price) || 0;
  const shippingInfo = calcShipping(subtotal, shippingConfig);
  const shipping = shippingInfo.shipping;
  const total = subtotal + shipping;
  const discount = coupon ? parseFloat(coupon.discount_amount) : 0;
  const itemCount = cart.total_items || cart.items.length;

  return (
    <div className="relative min-h-[70vh] pb-44 lg:pb-12">
      <SEO title="سبد خرید" noIndex />
      <AmbientBg />

      <div className="container relative mx-auto max-w-6xl px-4 py-8 sm:py-10">
        {/* Page header */}
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end animate-fade-in-down">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-[1.25rem] bg-primary/30 blur-lg" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-white/10">
                <ShoppingCart className="h-6 w-6" />
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                فروشگاه · تسویه
              </p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">سبد خرید</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-bold text-primary">
                    {itemCount.toLocaleString('fa-IR')}
                  </span>
                  کالا آماده پرداخت
                </span>
              </p>
            </div>
          </div>

          <Link
            to="/products"
            className="group inline-flex items-center gap-2 self-start rounded-2xl border border-border/60 bg-card/70 px-4 py-2.5 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:text-primary hover:shadow-md sm:self-auto"
          >
            <span>ادامه خرید</span>
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
          </Link>
        </div>

        <FreeShippingBar shippingInfo={shippingInfo} />

        <CouponSection coupon={coupon} couponError={couponError} couponLoading={couponLoading} onApplyCoupon={applyCoupon} onRemoveCoupon={removeCoupon} onClearCouponError={clearCouponError} />

        <div className="grid grid-cols-1 gap-7 lg:grid-cols-3 lg:gap-8">
          {/* Items list */}
          <div className="space-y-3.5 sm:space-y-4 lg:col-span-2">
            <div className="mb-1 flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-muted-foreground">
                اقلام سبد
              </h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {cart.items.length.toLocaleString('fa-IR')} مورد
              </span>
            </div>

            {cart.items.map((item, index) => (
              <CartItemCard
                key={item.id}
                item={item}
                index={index}
                onQuantityChange={handleQuantityChange}
                onRemove={handleRemoveItem}
                updating={updatingId === item.id}
              />
            ))}

            {/* Bottom encouragement strip */}
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/30 px-4 py-3.5 text-xs text-muted-foreground">
              <Tag className="h-4 w-4 shrink-0 text-primary/70" />
              <p>
                محصولات شما رزرو نشده‌اند — برای نهایی کردن سفارش، فرآیند خرید را ادامه دهید.
              </p>
            </div>
          </div>

          {/* Summary sidebar */}
          <OrderSummary
            subtotal={subtotal}
            shipping={shipping}
            total={total}
            itemCount={itemCount}
            discount={discount}
            coupon={coupon}
          />
        </div>
      </div>

      <MobileCheckoutBar total={total} itemCount={itemCount} discount={discount} coupon={coupon} />
    </div>
  );
};

export default CartPage;
