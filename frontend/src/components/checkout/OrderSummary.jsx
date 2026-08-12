import { useState } from 'react';
import { CheckCircle2, Package, Percent, Sparkles, Truck, X } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { useCart } from '../../contexts/CartContext';
import { formatPrice } from '../../lib/formatPrice';
import { PLACEHOLDER_IMG } from '../../lib/placeholders';
import { calcShipping } from '../../lib/shipping';

/* ─── Order Summary Sidebar ─── */
const OrderSummary = ({ cart, subtotal, shipping, total, shippingConfig, coupon }) => {
  const shippingInfo = calcShipping(subtotal, shippingConfig);
  const { isFree, remaining, threshold, progress } = shippingInfo;
  const itemCount = cart.total_items || cart.items.length;
  const discount = coupon ? parseFloat(coupon.discount_amount) : 0;
  const finalTotal = total - discount;
  const [couponCode, setCouponCode] = useState('');
  const { applyCoupon, removeCoupon, couponError, couponLoading } = useCart();

  const handleApply = async () => {
    if (!couponCode.trim()) return;
    try {
      await applyCoupon(couponCode.trim());
    } catch {
      // error handled by context
    }
  };

  const handleRemove = () => {
    removeCoupon();
    setCouponCode('');
  };

  return (
    <div className="lg:sticky lg:top-24 space-y-5 animate-fade-in-up" style={{ animationDelay: '0.08s' }}>
      <Card className="overflow-hidden border-0 shadow-lg shadow-primary/5 ring-1 ring-border">
        <div className="bg-gradient-to-l from-primary via-primary to-primary/90 text-primary-foreground px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-none">خلاصه سفارش</h2>
              <p className="text-xs opacity-80 mt-1.5">
                {itemCount.toLocaleString('fa-IR')} کالا
              </p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-4">
          {/* Mini item list */}
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
            {cart.items.map((item) => (
              <div key={item.id} className="flex gap-3 items-center">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-muted ring-1 ring-border/50 shrink-0">
                  <img
                    src={item.product.primary_image || PLACEHOLDER_IMG}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-1">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    × {item.quantity.toLocaleString('fa-IR')}
                  </p>
                </div>
                <span className="text-xs font-semibold tabular-nums shrink-0">
                  {formatPrice(item.total_price)}
                </span>
              </div>
            ))}
          </div>

          {/* Free shipping mini bar */}
          <div className={`rounded-2xl p-4 text-sm ${
            isFree
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-500/10 text-amber-800 dark:text-amber-200'
          }`}>
            <div className="flex items-center gap-2 mb-2 font-semibold">
              {isFree ? <Sparkles className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
              {isFree
                ? 'ارسال رایگان'
                : `${formatPrice(remaining)} تا ارسال رایگان`}
            </div>
            <div className="h-2 rounded-full bg-background/60 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isFree ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {!isFree && (
              <p className="mt-2 opacity-80">
                از {formatPrice(threshold)} به بالا رایگان
              </p>
            )}
          </div>

          {/* Coupon input */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`relative flex-1 ${coupon ? 'opacity-50 pointer-events-none' : ''}`}>
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                  placeholder="کد تخفیف"
                  className="w-full rounded-2xl border border-border/70 bg-background/80 px-4 py-3 pr-10 text-sm font-medium placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                />
                <Percent className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              </div>
              <button
                onClick={handleApply}
                disabled={!couponCode.trim() || couponLoading}
                className="h-11 shrink-0 rounded-2xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 disabled:opacity-40 disabled:pointer-events-none"
              >
                {couponLoading ? '...' : 'اعمال'}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                title="حذف کد تخفیف"
                aria-label="حذف کد تخفیف"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 transition-all ${
                  coupon
                    ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600 hover:border-red-600'
                    : 'border-red-300 bg-red-50 text-red-400 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40'
                }`}
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
            {couponError && (
              <p className="text-sm font-medium text-red-500 flex items-center gap-2 px-1">
                <X className="h-4 w-4" />
                {couponError}
              </p>
            )}
            {coupon && (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>کد {coupon.code} · {coupon.discount_type === 'percentage' ? `${coupon.discount_value}٪` : `${Number(coupon.discount_value).toLocaleString('fa-IR')} تومان`} تخفیف</span>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">جمع کالاها</span>
              <span className="font-medium tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">هزینه ارسال</span>
              <span className={`font-medium tabular-nums ${isFree ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {isFree ? 'رایگان' : formatPrice(shipping)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  تخفیف
                </span>
                <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  -{formatPrice(discount)}
                </span>
              </div>
            )}
            <div className="h-px bg-border/50" />
            <div className="flex justify-between text-sm font-bold">
              <span>مبلغ نهایی</span>
              <span className="text-primary tabular-nums">{formatPrice(finalTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderSummary;

