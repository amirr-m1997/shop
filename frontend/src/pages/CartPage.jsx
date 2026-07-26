import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Trash2, Plus, Minus, ShoppingBag, ShoppingCart, ArrowLeft,
  Truck, ShieldCheck, Tag, Sparkles, Package, Heart, Lock,
  Gift, Zap, ChevronLeft, CheckCircle2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useCart } from '../contexts/CartContext';
import { formatPrice, formatPriceNumber } from '../lib/formatPrice';
import { calcShipping, useShippingConfig } from '../lib/shipping';

/* ─── Ambient Background ─── */
const AmbientBg = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <div className="absolute -top-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-primary/[0.06] blur-3xl dark:bg-primary/[0.09]" />
    <div className="absolute top-1/3 -left-32 h-[22rem] w-[22rem] rounded-full bg-violet-500/[0.05] blur-3xl dark:bg-violet-400/[0.07]" />
    <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-blue-500/[0.04] blur-3xl dark:bg-blue-400/[0.06]" />
    <div
      className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.04) 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }}
    />
  </div>
);

/* ─── Loading Skeleton ─── */
const CartSkeleton = () => (
  <div className="relative min-h-[70vh]">
    <AmbientBg />
    <div className="container relative mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10 flex items-center gap-4">
        <div className="h-14 w-14 animate-pulse rounded-2xl bg-muted" />
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex gap-5 rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="h-32 w-28 shrink-0 animate-pulse rounded-2xl bg-muted" />
              <div className="flex flex-1 flex-col justify-between py-1">
                <div className="space-y-3">
                  <div className="h-5 w-3/4 animate-pulse rounded-lg bg-muted" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="h-10 w-32 animate-pulse rounded-full bg-muted" />
                  <div className="h-6 w-24 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-3xl border border-border/60 bg-card/80" />
      </div>
    </div>
  </div>
);

/* ─── Empty State ─── */
const EmptyCart = () => (
  <div className="relative min-h-[70vh]">
    <AmbientBg />
    <div className="container relative mx-auto max-w-lg px-4 py-20 text-center animate-fade-in-up">
      {/* Orbital empty illustration */}
      <div className="relative mx-auto mb-10 h-44 w-44">
        <div className="absolute inset-0 animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-gradient-to-br from-primary/15 via-violet-500/10 to-blue-500/10 blur-2xl" />
        <div className="absolute inset-4 rounded-full border border-dashed border-border/80 opacity-60" />
        <div className="absolute inset-8 rounded-full border border-border/40" />
        <div className="relative flex h-full w-full items-center justify-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-border/50 bg-gradient-to-br from-card via-card to-muted/40 shadow-xl shadow-primary/5 ring-1 ring-white/20 dark:ring-white/5">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/60" strokeWidth={1.15} />
          </div>
        </div>
        <div className="absolute -bottom-1 -left-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background">
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="absolute -right-2 top-6 flex h-8 w-8 items-center justify-center rounded-xl bg-card shadow-md ring-1 ring-border/60">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        </div>
      </div>

      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
        سبد خرید
      </p>
      <h2 className="mb-3 text-3xl font-black tracking-tight sm:text-4xl">
        هنوز چیزی اینجا نیست
      </h2>
      <p className="mx-auto mb-10 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
        مجموعه‌های منتخب و محصولات خاص منتظر شما هستند. اولین انتخاب‌تان را اضافه کنید.
      </p>

      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          asChild
          size="lg"
          className="h-12 rounded-2xl px-8 text-base font-bold shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
        >
          <Link to="/products" className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            کشف محصولات
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="h-12 rounded-2xl border-border/70 bg-card/50 px-8 backdrop-blur-sm transition-all hover:bg-card"
        >
          <Link to="/">بازگشت به خانه</Link>
        </Button>
      </div>

      <div className="mt-14 grid grid-cols-3 gap-3">
        {[
          { icon: Truck, label: 'ارسال سریع', tone: 'text-blue-600 dark:text-blue-400 bg-blue-500/10' },
          { icon: ShieldCheck, label: 'خرید امن', tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
          { icon: Gift, label: 'بسته‌بندی لوکس', tone: 'text-violet-600 dark:text-violet-400 bg-violet-500/10' },
        ].map(({ icon: Icon, label, tone }) => (
          <div
            key={label}
            className="rounded-2xl border border-border/50 bg-card/60 p-4 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <div className={`mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="h-4.5 w-4.5 h-[18px] w-[18px]" />
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground sm:text-xs">{label}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Free Shipping Progress ─── */
const FreeShippingBar = ({ shippingInfo }) => {
  const { isFree, remaining, progress, threshold } = shippingInfo;

  return (
    <div
      className={`group relative mb-7 overflow-hidden rounded-3xl border p-5 sm:p-6 animate-fade-in-up transition-all duration-500 ${
        isFree
          ? 'border-emerald-500/25 bg-gradient-to-l from-emerald-500/[0.12] via-emerald-500/[0.04] to-transparent shadow-lg shadow-emerald-500/5'
          : 'border-amber-500/20 bg-gradient-to-l from-amber-500/[0.10] via-orange-500/[0.04] to-transparent'
      }`}
    >
      {/* Soft shine */}
      <div className="pointer-events-none absolute -left-8 top-0 h-full w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100 dark:via-white/5" />

      <div className="relative flex items-start gap-4">
        <div
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner ${
            isFree
              ? 'bg-gradient-to-br from-emerald-500/20 to-green-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-400'
          }`}
        >
          {isFree ? (
            <Sparkles className="h-5 w-5 animate-[pulse_2s_ease-in-out_infinite]" />
          ) : (
            <Truck className="h-5 w-5" />
          )}
          {isFree && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-background">
              <CheckCircle2 className="h-2.5 w-2.5" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <p
              className={`text-sm font-bold sm:text-[15px] ${
                isFree ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'
              }`}
            >
              {isFree ? (
                'تبریک! ارسال این سفارش رایگان است'
              ) : (
                <>
                  فقط{' '}
                  <span className="bg-gradient-to-l from-amber-600 to-orange-500 bg-clip-text text-transparent dark:from-amber-300 dark:to-orange-300">
                    {formatPrice(remaining)}
                  </span>{' '}
                  تا ارسال رایگان
                </>
              )}
            </p>
            <span className="rounded-full bg-background/70 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground ring-1 ring-border/50 backdrop-blur-sm">
              {Math.round(progress).toLocaleString('fa-IR')}٪
            </span>
          </div>

          {!isFree && (
            <p className="mb-3 text-xs text-muted-foreground">
              با خرید بالای {formatPrice(threshold)}، هزینه ارسال رایگان می‌شود
            </p>
          )}

          <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-background/70 ring-1 ring-border/40 backdrop-blur-sm">
            <div
              className={`relative h-full rounded-full transition-all duration-1000 ease-out ${
                isFree
                  ? 'bg-gradient-to-l from-emerald-500 via-green-400 to-teal-400'
                  : 'bg-gradient-to-l from-amber-500 via-orange-400 to-amber-300'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            >
              <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Cart Item Card ─── */
const CartItemCard = ({ item, onQuantityChange, onRemove, updating, index }) => {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    await onRemove(item.id);
  };

  const unitPrice =
    item.quantity > 0
      ? parseFloat(item.total_price) / item.quantity
      : parseFloat(item.total_price);

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-md transition-all duration-500 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/[0.06] ${
        removing ? 'scale-[0.98] opacity-40' : 'animate-fade-in-up'
      }`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      {/* Hover accent rail */}
      <div className="absolute bottom-4 top-4 right-0 w-1 origin-center scale-y-0 rounded-full bg-gradient-to-b from-primary via-violet-500 to-blue-500 opacity-0 transition-all duration-500 group-hover:scale-y-100 group-hover:opacity-100" />

      <div className="flex gap-4 p-4 sm:gap-6 sm:p-5">
        {/* Image */}
        <Link
          to={`/product/${item.product.slug}`}
          className="relative h-28 w-24 shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-border/50 transition-all duration-500 group-hover:ring-primary/30 sm:h-36 sm:w-32"
        >
          <img
            src={item.product.primary_image || 'https://via.placeholder.com/200x200?text=Product'}
            alt={item.product.name}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
        </Link>

        {/* Details */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                to={`/product/${item.product.slug}`}
                className="line-clamp-2 text-sm font-bold leading-snug tracking-tight transition-colors duration-300 hover:text-primary sm:text-base"
              >
                {item.product.name}
              </Link>

              {item.variant ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center rounded-lg bg-secondary/80 px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground ring-1 ring-border/40">
                    سایز {item.variant.size_name}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/80 px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground ring-1 ring-border/40">
                    <span
                      className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10 dark:ring-white/20"
                      style={{
                        backgroundColor:
                          item.variant.color_hex ||
                          item.variant.color_code ||
                          'hsl(var(--muted-foreground))',
                      }}
                    />
                    {item.variant.color_name}
                  </span>
                  {item.variant.sku && (
                    <span className="rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {item.variant.sku}
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">نسخه استاندارد</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleRemove}
              disabled={updating || removing}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-all duration-300 hover:bg-destructive/10 hover:text-destructive hover:shadow-sm disabled:pointer-events-none disabled:opacity-40"
              aria-label="حذف از سبد"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Bottom: qty + price */}
          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
            <div className="inline-flex items-center rounded-2xl border border-border/70 bg-background/80 p-1 shadow-sm backdrop-blur-sm">
              <button
                type="button"
                onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1 || updating || removing}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-90 disabled:pointer-events-none disabled:opacity-35"
                aria-label="کاهش تعداد"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[2.25rem] select-none text-center text-sm font-black tabular-nums">
                {item.quantity.toLocaleString('fa-IR')}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                disabled={updating || removing}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground active:scale-90 disabled:pointer-events-none disabled:opacity-35"
                aria-label="افزایش تعداد"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="text-left">
              <p className="text-base font-black tracking-tight sm:text-lg">
                {formatPrice(item.total_price)}
              </p>
              {item.quantity > 1 && (
                <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                  {formatPriceNumber(unitPrice)} × {item.quantity.toLocaleString('fa-IR')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

/* ─── Order Summary ─── */
const OrderSummary = ({ subtotal, shipping, total, itemCount }) => {
  const isFreeShipping = shipping === 0;

  return (
    <div className="space-y-4 lg:sticky lg:top-24 animate-fade-in-up" style={{ animationDelay: '0.12s' }}>
      {/* Main summary card */}
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/90 shadow-2xl shadow-primary/[0.07] ring-1 ring-black/[0.03] backdrop-blur-xl dark:ring-white/[0.04]">
        {/* Gradient header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 px-6 py-6 text-primary-foreground">
          <div className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 right-0 h-28 w-28 rounded-full bg-white/5 blur-xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black leading-none tracking-tight">خلاصه سفارش</h2>
              <p className="mt-1.5 text-xs font-medium opacity-80">
                {itemCount.toLocaleString('fa-IR')} کالا · آماده پرداخت
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">جمع کالاها</span>
              <span className="font-semibold tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Truck className="h-3.5 w-3.5" />
                هزینه ارسال
              </span>
              <span
                className={`font-semibold tabular-nums ${
                  isFreeShipping ? 'text-emerald-600 dark:text-emerald-400' : ''
                }`}
              >
                {isFreeShipping ? 'رایگان' : formatPrice(shipping)}
              </span>
            </div>

            {isFreeShipping && (
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-3.5 py-2.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                <span>ارسال رایگان برای این سفارش اعمال شد</span>
              </div>
            )}

            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-l from-muted/60 to-muted/20 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold">مبلغ قابل پرداخت</span>
                <span className="text-xl font-black tracking-tight text-primary sm:text-2xl tabular-nums">
                  {formatPrice(total)}
                </span>
              </div>
            </div>
          </div>

          <Button
            asChild
            size="lg"
            className="group/btn relative w-full overflow-hidden rounded-2xl text-base font-black shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
          >
            <Link to="/checkout" className="relative flex h-12 items-center justify-center gap-2">
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
              <Lock className="h-4 w-4 opacity-80" />
              ادامه فرآیند خرید
              <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover/btn:-translate-x-1" />
            </Link>
          </Button>

          <Button
            asChild
            variant="ghost"
            className="w-full rounded-2xl text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <Link to="/products" className="flex items-center justify-center gap-1.5">
              ادامه خرید از فروشگاه
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>پرداخت امن · رمزنگاری‌شده</span>
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="grid grid-cols-1 gap-2.5">
        {[
          { icon: ShieldCheck, title: 'پرداخت امن', desc: 'محافظت کامل از اطلاعات', tone: 'from-emerald-500/15 to-teal-500/5 text-emerald-600 dark:text-emerald-400' },
          { icon: Zap, title: 'ارسال سریع', desc: 'تحویل در کمترین زمان', tone: 'from-blue-500/15 to-cyan-500/5 text-blue-600 dark:text-blue-400' },
          { icon: Heart, title: 'ضمانت اصالت', desc: 'کالای ۱۰۰٪ اصل', tone: 'from-rose-500/15 to-pink-500/5 text-rose-600 dark:text-rose-400' },
        ].map(({ icon: Icon, title, desc, tone }) => (
          <div
            key={title}
            className="group flex items-center gap-3.5 rounded-2xl border border-border/50 bg-card/60 px-4 py-3.5 backdrop-blur-sm transition-all duration-300 hover:border-border hover:bg-card hover:shadow-md"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tone} transition-transform duration-300 group-hover:scale-105`}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none">{title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Mobile Sticky Checkout Bar ─── */
const MobileCheckoutBar = ({ total, itemCount }) => (
  <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.15)] backdrop-blur-xl lg:hidden">
    <div className="mx-auto flex max-w-lg items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">
          {itemCount.toLocaleString('fa-IR')} کالا
        </p>
        <p className="truncate text-base font-black tabular-nums tracking-tight">
          {formatPrice(total)}
        </p>
      </div>
      <Button
        asChild
        size="lg"
        className="h-12 shrink-0 rounded-2xl px-6 font-bold shadow-lg shadow-primary/20"
      >
        <Link to="/checkout" className="flex items-center gap-2">
          تسویه حساب
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  </div>
);

/* ─── Main Page ─── */
const CartPage = () => {
  const { cart, loading, updateCartItem, removeCartItem } = useCart();
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
  const itemCount = cart.total_items || cart.items.length;

  return (
    <div className="relative min-h-[70vh] pb-28 lg:pb-12">
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
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                فروشگاه · تسویه
              </p>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">سبد خرید</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-bold text-primary">
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
          />
        </div>
      </div>

      <MobileCheckoutBar total={total} itemCount={itemCount} />
    </div>
  );
};

export default CartPage;
