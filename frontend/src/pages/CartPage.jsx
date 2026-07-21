import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trash2, Plus, Minus, ShoppingBag, ShoppingCart, ArrowLeft,
  Truck, ShieldCheck, Tag, Sparkles, Package, Heart
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { useCart } from '../contexts/CartContext';
import { formatPrice, formatPriceNumber } from '../lib/formatPrice';
import { calcShipping, useShippingConfig } from '../lib/shipping';

/* ─── Loading Skeleton ─── */
const CartSkeleton = () => (
  <div className="container mx-auto px-4 py-8 max-w-6xl">
    <div className="h-8 w-48 bg-muted rounded-lg animate-pulse mb-8" />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border bg-card p-4 flex gap-4">
            <div className="w-28 h-28 bg-muted rounded-xl animate-pulse shrink-0" />
            <div className="flex-1 space-y-3 py-1">
              <div className="h-5 w-2/3 bg-muted rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
              <div className="h-9 w-32 bg-muted rounded-full animate-pulse mt-4" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border bg-card p-6 h-72 animate-pulse" />
    </div>
  </div>
);

/* ─── Empty State ─── */
const EmptyCart = () => (
  <div className="container mx-auto px-4 py-16 max-w-lg text-center animate-fade-in-up">
    <div className="relative mx-auto mb-8 w-36 h-36">
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 via-blue-500/10 to-violet-500/10 blur-xl" />
      <div className="relative w-full h-full rounded-full bg-gradient-to-br from-muted to-muted/50 border border-border/60 flex items-center justify-center shadow-inner">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/70" strokeWidth={1.25} />
      </div>
      <div className="absolute -bottom-1 -left-1 h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
        <Plus className="h-5 w-5" />
      </div>
    </div>

    <h2 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">سبد خرید شما خالی است</h2>
    <p className="text-muted-foreground mb-8 leading-relaxed">
      هنوز محصولی اضافه نکرده‌اید. از میان هزاران محصول شیک، انتخاب کنید و خرید را شروع کنید.
    </p>

    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
      <Button asChild size="lg" className="rounded-full px-8 shadow-md hover:shadow-lg transition-shadow">
        <Link to="/products">
          <ShoppingCart className="ml-2 h-5 w-5" />
          مشاهده محصولات
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="rounded-full px-8">
        <Link to="/">
          بازگشت به صفحه اصلی
        </Link>
      </Button>
    </div>

    <div className="mt-12 grid grid-cols-3 gap-3 text-center">
      {[
        { icon: Truck, label: 'ارسال سریع' },
        { icon: ShieldCheck, label: 'خرید امن' },
        { icon: Tag, label: 'بهترین قیمت' },
      ].map(({ icon: Icon, label }) => (
        <div key={label} className="rounded-xl border bg-card/50 p-3">
          <Icon className="h-5 w-5 mx-auto mb-1.5 text-primary/70" />
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Free Shipping Progress ─── */
const FreeShippingBar = ({ shippingInfo }) => {
  const { isFree, remaining, progress, threshold } = shippingInfo;

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 mb-6 animate-fade-in-up ${
      isFree
        ? 'bg-gradient-to-l from-emerald-500/10 via-green-500/5 to-transparent border-emerald-500/30'
        : 'bg-gradient-to-l from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
          isFree ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
        }`}>
          {isFree ? <Sparkles className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold mb-1 ${isFree ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
            {isFree
              ? 'تبریک! ارسال این سفارش رایگان است'
              : (
                <>
                  فقط{' '}
                  <span className="text-amber-700 dark:text-amber-300 font-bold">
                    {formatPrice(remaining)}
                  </span>
                  {' '}تا ارسال رایگان (از {formatPrice(threshold)})
                </>
              )}
          </p>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                isFree
                  ? 'bg-gradient-to-l from-emerald-500 to-green-400'
                  : 'bg-gradient-to-l from-amber-500 to-orange-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Cart Item Card ─── */
const CartItemCard = ({ item, onQuantityChange, onRemove, updating }) => {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    await onRemove(item.id);
  };

  const unitPrice = item.quantity > 0
    ? parseFloat(item.total_price) / item.quantity
    : parseFloat(item.total_price);

  return (
    <Card
      className={`overflow-hidden border transition-all duration-300 hover:shadow-md hover:border-primary/20 group ${
        removing ? 'opacity-50 scale-[0.98]' : 'animate-fade-in-up'
      }`}
    >
      <CardContent className="p-0">
        <div className="flex gap-3 sm:gap-5 p-3 sm:p-5">
          {/* Image */}
          <Link
            to={`/product/${item.product.id}`}
            className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden shrink-0 bg-muted ring-1 ring-border/50 group-hover:ring-primary/30 transition-all"
          >
            <img
              src={item.product.primary_image || 'https://via.placeholder.com/200x200?text=Product'}
              alt={item.product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </Link>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex justify-between gap-2">
              <div className="min-w-0">
                <Link
                  to={`/product/${item.product.id}`}
                  className="font-semibold text-sm sm:text-base leading-snug hover:text-primary transition-colors line-clamp-2"
                >
                  {item.product.name}
                </Link>

                {item.variant ? (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
                      سایز: {item.variant.size_name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
                      رنگ: {item.variant.color_name}
                    </span>
                    {item.variant.sku && (
                      <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {item.variant.sku}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1.5">استاندارد</p>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleRemove}
                disabled={updating || removing}
                className="shrink-0 h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label="حذف از سبد"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Bottom row: qty + price */}
            <div className="mt-auto pt-3 flex items-center justify-between gap-3 flex-wrap">
              {/* Quantity stepper */}
              <div className="inline-flex items-center rounded-full border bg-background shadow-sm">
                <button
                  type="button"
                  onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                  disabled={item.quantity <= 1 || updating || removing}
                  className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  aria-label="کاهش تعداد"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-9 text-center text-sm font-bold tabular-nums select-none">
                  {item.quantity.toLocaleString('fa-IR')}
                </span>
                <button
                  type="button"
                  onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                  disabled={updating || removing}
                  className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  aria-label="افزایش تعداد"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="text-left">
                <p className="font-bold text-base sm:text-lg tracking-tight">
                  {formatPrice(item.total_price)}
                </p>
                {item.quantity > 1 && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatPriceNumber(unitPrice)} × {item.quantity.toLocaleString('fa-IR')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/* ─── Order Summary ─── */
const OrderSummary = ({ subtotal, shipping, total, itemCount }) => {
  const isFreeShipping = shipping === 0;

  return (
    <div className="lg:sticky lg:top-24 space-y-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <Card className="overflow-hidden border-0 shadow-lg shadow-primary/5 ring-1 ring-border">
        {/* Gradient header */}
        <div className="bg-gradient-to-l from-primary via-primary to-primary/90 text-primary-foreground px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-none">خلاصه سفارش</h2>
              <p className="text-xs opacity-80 mt-1">
                {itemCount.toLocaleString('fa-IR')} کالا در سبد
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">جمع کالاها</span>
              <span className="font-medium tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">هزینه ارسال</span>
              <span className={`font-medium tabular-nums ${isFreeShipping ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {isFreeShipping ? 'رایگان' : formatPrice(shipping)}
              </span>
            </div>

            {isFreeShipping && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 rounded-lg px-3 py-2">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>ارسال رایگان برای این سفارش اعمال شد</span>
              </div>
            )}

            <div className="border-t pt-4 flex justify-between items-baseline">
              <span className="font-bold text-base">مبلغ قابل پرداخت</span>
              <span className="font-black text-xl tabular-nums tracking-tight text-primary">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          <Button
            asChild
            size="lg"
            className="w-full rounded-xl h-12 text-base font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <Link to="/checkout" className="flex items-center justify-center gap-2">
              ادامه فرآیند خرید
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>

          <Button asChild variant="ghost" className="w-full rounded-xl text-muted-foreground hover:text-foreground">
            <Link to="/products">ادامه خرید از فروشگاه</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Trust badges */}
      <div className="grid grid-cols-1 gap-2">
        {[
          { icon: ShieldCheck, title: 'پرداخت امن', desc: 'محافظت کامل از اطلاعات' },
          { icon: Truck, title: 'ارسال سریع', desc: 'تحویل در کمترین زمان' },
          { icon: Heart, title: 'ضمانت اصالت', desc: 'کالای ۱۰۰٪ اصل' },
        ].map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-center gap-3 rounded-xl border bg-card/60 px-4 py-3 hover:bg-muted/40 transition-colors"
          >
            <div className="h-9 w-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-primary/80" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">{title}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
const CartPage = () => {
  const { cart, loading, updateCartItem, removeCartItem } = useCart();
  const { config: shippingConfig } = useShippingConfig();
  const [updatingId, setUpdatingId] = useState(null);

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    setUpdatingId(itemId);
    try {
      await updateCartItem({ item_id: itemId, quantity: newQuantity });
    } catch {
      // error handled by context
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveItem = async (itemId) => {
    setUpdatingId(itemId);
    try {
      await removeCartItem(itemId);
    } catch {
      // error handled by context
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) return <CartSkeleton />;
  if (!cart || !cart.items || cart.items.length === 0) return <EmptyCart />;

  const subtotal = parseFloat(cart.total_price) || 0;
  const shippingInfo = calcShipping(subtotal, shippingConfig);
  const shipping = shippingInfo.shipping;
  const total = subtotal + shipping;
  const itemCount = cart.total_items || cart.items.length;

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-muted/40 via-background to-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-fade-in-down">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">سبد خرید</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {itemCount.toLocaleString('fa-IR')} کالا آماده پرداخت
              </p>
            </div>
          </div>

          <Link
            to="/products"
            className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>ادامه خرید</span>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <FreeShippingBar shippingInfo={shippingInfo} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Items list */}
          <div className="lg:col-span-2 space-y-3 sm:space-y-4">
            {cart.items.map((item, index) => (
              <div key={item.id} style={{ animationDelay: `${index * 0.05}s` }}>
                <CartItemCard
                  item={item}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemoveItem}
                  updating={updatingId === item.id}
                />
              </div>
            ))}
          </div>

          {/* Summary sidebar */}
          <OrderSummary
            subtotal={subtotal}
            shipping={shipping}
            total={total}
            itemCount={itemCount}
          />
        </div>
      </div>
    </div>
  );
};

export default CartPage;
