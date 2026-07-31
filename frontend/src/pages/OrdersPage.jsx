import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, ShoppingBag, CreditCard, PackageCheck, ArrowLeft,
  Sparkles, ShieldCheck, Clock, Truck, CheckCircle, XCircle, Loader
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ordersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice } from '../lib/formatPrice';
import AmbientBg from '../components/orders/AmbientBg';
import OrderCard from '../components/orders/OrderCard';
import FilterChip from '../components/orders/FilterChip';

/* ─── Main ─── */
const OrdersPage = () => {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (isAuthenticated) fetchOrders();
    else setLoading(false);
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const res = await ordersAPI.getOrders();
      setOrders(res.data.results || res.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const stats = useMemo(() => {
    const totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    const active = orders.filter((o) => ['pending', 'processing', 'shipped'].includes(o.status)).length;
    const delivered = orders.filter((o) => o.status === 'delivered').length;
    return { count: orders.length, totalSpent, active, delivered };
  }, [orders]);

  const statusFilters = [
    { key: 'all', label: 'همه', icon: Package },
    { key: 'pending', label: 'در انتظار', icon: Clock },
    { key: 'processing', label: 'پردازش', icon: Loader },
    { key: 'shipped', label: 'ارسال شده', icon: Truck },
    { key: 'delivered', label: 'تحویل شده', icon: CheckCircle },
    { key: 'cancelled', label: 'لغو شده', icon: XCircle },
  ];

  /* ── Not logged in ── */
  if (!isAuthenticated) {
    return (
      <div className="relative flex min-h-[70vh] items-center justify-center">
        <AmbientBg />
        <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/80 p-8 text-center shadow-2xl shadow-primary/[0.06] backdrop-blur-xl animate-fade-in-up">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-primary/15 to-violet-500/10 ring-1 ring-primary/10">
            <Package className="h-9 w-9 text-primary/70" strokeWidth={1.5} />
          </div>
          <h2 className="mb-2 text-2xl font-black tracking-tight">لطفاً وارد شوید</h2>
          <p className="mb-7 text-sm leading-relaxed text-muted-foreground">
            برای مشاهده سفارش‌ها باید وارد حساب کاربری خود شوید
          </p>
          <Button asChild className="h-12 w-full rounded-2xl font-bold shadow-lg shadow-primary/20">
            <Link to="/login">ورود به حساب</Link>
          </Button>
        </div>
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="relative min-h-[70vh]">
        <AmbientBg />
        <div className="container relative mx-auto max-w-4xl px-4 py-10">
          <div className="mb-8 flex items-center gap-4">
            <div className="h-14 w-14 animate-pulse rounded-2xl bg-muted" />
            <div className="space-y-2">
              <div className="h-7 w-44 animate-pulse rounded-lg bg-muted" />
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="mb-6 flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-24 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-[1.5rem] border border-border/40 bg-card/60" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Empty state ── */
  if (orders.length === 0) {
    return (
      <div className="relative flex min-h-[70vh] items-center justify-center">
        <AmbientBg />
        <div className="relative mx-4 w-full max-w-md text-center animate-fade-in-up">
          <div className="relative mx-auto mb-8 h-40 w-40">
            <div className="absolute inset-0 animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-gradient-to-br from-primary/15 via-violet-500/10 to-blue-500/10 blur-2xl" />
            <div className="relative flex h-full w-full items-center justify-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-border/50 bg-gradient-to-br from-card via-card to-muted/40 shadow-xl shadow-primary/5 ring-1 ring-white/20 dark:ring-white/5">
                <ShoppingBag className="h-12 w-12 text-muted-foreground/60" strokeWidth={1.15} />
              </div>
            </div>
            <div className="absolute -bottom-1 -left-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
            سفارش‌ها
          </p>
          <h2 className="mb-3 text-3xl font-black tracking-tight">هنوز سفارشی ندارید</h2>
          <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-muted-foreground">
            اولین خرید خود را شروع کنید و تجربه خرید لوکس را تجربه کنید.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-2xl px-8 font-bold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
            >
              <Link to="/products" className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                مشاهده محصولات
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 rounded-2xl px-8">
              <Link to="/">بازگشت به خانه</Link>
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-3">
            {[
              { icon: Truck, label: 'ارسال سریع' },
              { icon: ShieldCheck, label: 'خرید امن' },
              { icon: CreditCard, label: 'پرداخت آسان' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-2xl border border-border/50 bg-card/60 p-3.5 shadow-sm backdrop-blur-md"
              >
                <Icon className="mx-auto mb-2 h-[18px] w-[18px] text-primary/70" />
                <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="relative min-h-screen pb-12">
      <AmbientBg />

      <div className="container relative mx-auto max-w-4xl px-4 py-6 sm:py-10">
        {/* ── Hero Header ── */}
        <div className="relative mb-7 overflow-hidden rounded-[1.75rem] border border-border/50 bg-card/70 shadow-xl shadow-primary/[0.06] backdrop-blur-xl ring-1 ring-black/[0.02] dark:ring-white/[0.04] animate-fade-in-down">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-primary/[0.12] via-violet-500/[0.04] to-transparent" />
          <div className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 right-8 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-[1.25rem] bg-primary/30 blur-lg" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-white/10">
                  <PackageCheck className="h-7 w-7" />
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  حساب کاربری
                </p>
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">سفارش‌های من</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stats.count.toLocaleString('fa-IR')} سفارش ثبت‌شده
                  {stats.active > 0 && (
                    <span className="mr-1 text-primary">
                      · {stats.active.toLocaleString('fa-IR')} فعال
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-1 flex-wrap items-center justify-start gap-2.5 sm:justify-end">
              {[
                {
                  label: 'کل سفارش‌ها',
                  value: stats.count.toLocaleString('fa-IR'),
                  tone: 'text-primary',
                },
                {
                  label: 'تحویل‌شده',
                  value: stats.delivered.toLocaleString('fa-IR'),
                  tone: 'text-emerald-600 dark:text-emerald-400',
                },
                {
                  label: 'مجموع خرید',
                  value: formatPrice(stats.totalSpent),
                  tone: '',
                  wide: true,
                },
              ].map(({ label, value, tone, wide }) => (
                <div
                  key={label}
                  className={`rounded-2xl border border-border/50 bg-background/60 px-4 py-2.5 text-center shadow-sm backdrop-blur-md ${
                    wide ? 'min-w-[140px]' : 'min-w-[88px]'
                  }`}
                >
                  <p className={`text-lg font-black tabular-nums leading-none sm:text-xl ${tone}`}>
                    {value}
                  </p>
                  <p className="mt-1.5 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Status Filters ── */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide animate-fade-in-up">
          {statusFilters.map((sf) => {
            const count =
              sf.key === 'all'
                ? orders.length
                : orders.filter((o) => o.status === sf.key).length;
            return (
              <FilterChip
                key={sf.key}
                active={filter === sf.key}
                onClick={() => setFilter(sf.key)}
                label={sf.label}
                count={count}
                icon={sf.icon}
              />
            );
          })}
        </div>

        {/* ── Orders List ── */}
        {filteredOrders.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-card/40 py-16 text-center backdrop-blur-sm animate-fade-in">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60">
              <Package className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">
              سفارشی با فیلتر انتخابی یافت نشد
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter('all')}
              className="mt-3 rounded-xl text-primary"
            >
              نمایش همه سفارش‌ها
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order, index) => (
              <OrderCard key={order.id} order={order} index={index} />
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 rounded-[1.35rem] border border-border/50 bg-card/60 px-5 py-4 shadow-sm backdrop-blur-md sm:flex-row">
          <div className="flex items-center gap-3 text-center sm:text-right">
            <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold">به دنبال محصول جدید هستید؟</p>
              <p className="text-xs text-muted-foreground">مجموعه‌های تازه منتظر شماست</p>
            </div>
          </div>
          <Button asChild className="h-10 rounded-xl px-5 font-bold shadow-md shadow-primary/15">
            <Link to="/products" className="flex items-center gap-1.5">
              ادامه خرید
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;
