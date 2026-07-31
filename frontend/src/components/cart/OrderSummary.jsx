import { Link } from 'react-router-dom';
import {
  Package, Truck, Percent, Sparkles, Lock, ArrowLeft, ChevronLeft,
  ShieldCheck, Zap, Heart
} from 'lucide-react';
import { Button } from '../ui/Button';
import { formatPrice } from '../../lib/formatPrice';

const OrderSummary = ({ subtotal, shipping, total, itemCount, discount, coupon }) => {
  const isFreeShipping = shipping === 0;
  const finalTotal = total - discount;

  return (
    <div className="space-y-4 lg:sticky lg:top-24 animate-fade-in-up" style={{ animationDelay: '0.12s' }}>
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/90 shadow-2xl shadow-primary/[0.07] ring-1 ring-black/[0.03] backdrop-blur-xl dark:ring-white/[0.04]">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 px-6 py-6 text-primary-foreground">
          <div className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 right-0 h-28 w-28 rounded-full bg-white/5 blur-xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black leading-none tracking-tight">خلاصه سفارش</h2>
              <p className="mt-2 text-xs font-medium opacity-80">
                {itemCount.toLocaleString('fa-IR')} کالا · آماده پرداخت
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">جمع کالاها</span>
              <span className="font-semibold tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Truck className="h-4 w-4" />
                هزینه ارسال
              </span>
              <span className={`font-semibold tabular-nums ${isFreeShipping ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {isFreeShipping ? 'رایگان' : formatPrice(shipping)}
              </span>
            </div>

            {discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Percent className="h-4 w-4" />
                  تخفیف
                </span>
                <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  -{formatPrice(discount)}
                </span>
              </div>
            )}

            {isFreeShipping && (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>ارسال رایگان برای این سفارش اعمال شد</span>
              </div>
            )}

            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-l from-muted/60 to-muted/20 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold">مبلغ قابل پرداخت</span>
                <span className="text-xl font-black tracking-tight text-primary sm:text-2xl tabular-nums">
                  {formatPrice(finalTotal > 0 ? finalTotal : 0)}
                </span>
              </div>
            </div>
          </div>

          <Button asChild size="lg" className="group/btn relative w-full overflow-hidden rounded-2xl text-base font-black shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30">
            <Link to={`/checkout${coupon ? `?coupon=${encodeURIComponent(coupon.code)}` : ''}`} className="relative flex h-12 items-center justify-center gap-2">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
              <Lock className="h-4 w-4 opacity-80" />
              ادامه فرآیند خرید
              <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover/btn:-translate-x-1" />
            </Link>
          </Button>

          <Button asChild variant="ghost" className="w-full rounded-2xl text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
            <Link to="/products" className="flex items-center justify-center gap-2">
              ادامه خرید از فروشگاه
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>پرداخت امن · رمزنگاری‌شده</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {[
          { icon: ShieldCheck, title: 'پرداخت امن', desc: 'محافظت کامل از اطلاعات', tone: 'from-emerald-500/15 to-teal-500/5 text-emerald-600 dark:text-emerald-400' },
          { icon: Zap, title: 'ارسال سریع', desc: 'تحویل در کمترین زمان', tone: 'from-blue-500/15 to-cyan-500/5 text-blue-600 dark:text-blue-400' },
          { icon: Heart, title: 'ضمانت اصالت', desc: 'کالای ۱۰۰٪ اصل', tone: 'from-rose-500/15 to-pink-500/5 text-rose-600 dark:text-rose-400' },
        ].map(({ icon: Icon, title, desc, tone }) => (
          <div key={title} className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card/60 px-4 py-4 backdrop-blur-sm transition-all duration-300 hover:border-border hover:bg-card hover:shadow-md">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone} transition-transform duration-300 group-hover:scale-105`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderSummary;
