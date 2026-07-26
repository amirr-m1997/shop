import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Clock, CheckCircle, Truck, XCircle, RotateCcw,
  Loader, ShoppingBag, CreditCard, Calendar, ChevronDown,
  PackageCheck, ArrowLeft, Sparkles, ShieldCheck, Wallet,
  MapPin, Hash, Copy
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ordersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice } from '../lib/formatPrice';
import { formatDate } from '../lib/formatDate';

/* ─── Ambient Background ─── */
const AmbientBg = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
    <div className="absolute -top-36 -right-20 h-[28rem] w-[28rem] rounded-full bg-primary/[0.06] blur-3xl dark:bg-primary/[0.09]" />
    <div className="absolute top-1/3 -left-28 h-[22rem] w-[22rem] rounded-full bg-violet-500/[0.05] blur-3xl dark:bg-violet-400/[0.07]" />
    <div className="absolute bottom-10 right-1/3 h-56 w-56 rounded-full bg-blue-500/[0.04] blur-3xl" />
    <div
      className="absolute inset-0 opacity-[0.32] dark:opacity-[0.12]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.04) 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }}
    />
  </div>
);

/* ─── Status Config ─── */
const STATUS_CONFIG = {
  pending: {
    label: 'در انتظار پرداخت',
    icon: Clock,
    bg: 'bg-amber-500/12',
    text: 'text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-500/25',
    accent: 'from-amber-500 to-orange-400',
    rail: 'from-amber-500 to-orange-400',
    step: 0,
  },
  processing: {
    label: 'در حال پردازش',
    icon: Loader,
    bg: 'bg-blue-500/12',
    text: 'text-blue-700 dark:text-blue-300',
    ring: 'ring-blue-500/25',
    accent: 'from-blue-500 to-cyan-400',
    rail: 'from-blue-500 to-cyan-400',
    step: 1,
  },
  shipped: {
    label: 'ارسال شده',
    icon: Truck,
    bg: 'bg-violet-500/12',
    text: 'text-violet-700 dark:text-violet-300',
    ring: 'ring-violet-500/25',
    accent: 'from-violet-500 to-purple-400',
    rail: 'from-violet-500 to-purple-400',
    step: 2,
  },
  delivered: {
    label: 'تحویل داده شده',
    icon: CheckCircle,
    bg: 'bg-emerald-500/12',
    text: 'text-emerald-700 dark:text-emerald-300',
    ring: 'ring-emerald-500/25',
    accent: 'from-emerald-500 to-teal-400',
    rail: 'from-emerald-500 to-teal-400',
    step: 3,
  },
  cancelled: {
    label: 'لغو شده',
    icon: XCircle,
    bg: 'bg-red-500/12',
    text: 'text-red-700 dark:text-red-300',
    ring: 'ring-red-500/25',
    accent: 'from-red-500 to-rose-400',
    rail: 'from-red-500 to-rose-400',
    step: -1,
  },
  returned: {
    label: 'مرجوع شده',
    icon: RotateCcw,
    bg: 'bg-orange-500/12',
    text: 'text-orange-700 dark:text-orange-300',
    ring: 'ring-orange-500/25',
    accent: 'from-orange-500 to-amber-400',
    rail: 'from-orange-500 to-amber-400',
    step: -1,
  },
};

const PAYMENT_CONFIG = {
  unpaid:   { label: 'پرداخت نشده',   tone: 'text-red-600 dark:text-red-400',   dot: 'bg-red-500',   bg: 'bg-red-500/10 ring-red-500/20' },
  paid:     { label: 'پرداخت شده',    tone: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', bg: 'bg-emerald-500/10 ring-emerald-500/20' },
  refunded: { label: 'بازپرداخت شده', tone: 'text-amber-600 dark:text-amber-400',  dot: 'bg-amber-500', bg: 'bg-amber-500/10 ring-amber-500/20' },
};

const PAYMENT_METHOD_LABELS = {
  online: 'پرداخت آنلاین',
  cash_on_delivery: 'پرداخت در محل',
  card: 'کارت به کارت',
};

const JOURNEY_STEPS = [
  { key: 'pending', label: 'ثبت', icon: Clock },
  { key: 'processing', label: 'پردازش', icon: Package },
  { key: 'shipped', label: 'ارسال', icon: Truck },
  { key: 'delivered', label: 'تحویل', icon: CheckCircle },
];

/* ─── Status Badge ─── */
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
      <Icon className={`h-3.5 w-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  );
};

/* ─── Payment Badge ─── */
const PaymentBadge = ({ status }) => {
  const cfg = PAYMENT_CONFIG[status] || PAYMENT_CONFIG.unpaid;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${cfg.bg} ${cfg.tone}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

/* ─── Mini journey timeline ─── */
const OrderJourney = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  if (cfg.step < 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-border/40 bg-muted/20 px-3 py-3.5 sm:px-4">
      <div className="flex items-center justify-between gap-1">
        {JOURNEY_STEPS.map((step, idx) => {
          const done = cfg.step > idx;
          const active = cfg.step === idx;
          const Icon = step.icon;
          return (
            <React.Fragment key={step.key}>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-500 sm:h-9 sm:w-9 ${
                    done
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                      : active
                        ? `bg-gradient-to-br ${cfg.accent} text-white shadow-md scale-105`
                        : 'bg-muted text-muted-foreground ring-1 ring-border/50'
                  }`}
                >
                  {done ? (
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  ) : (
                    <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${active && status === 'processing' ? 'animate-spin' : ''}`} />
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold sm:text-[11px] ${
                    done || active ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < JOURNEY_STEPS.length - 1 && (
                <div className="mb-5 h-0.5 w-full max-w-[28px] flex-1 overflow-hidden rounded-full bg-muted sm:max-w-[48px]">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      cfg.step > idx ? 'w-full bg-emerald-500' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Order Card ─── */
const OrderCard = ({ order, index }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  const itemCount = order.items?.length || 0;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <article
      className="group relative overflow-hidden rounded-[1.5rem] border border-border/50 bg-card/80 shadow-sm shadow-black/[0.03] backdrop-blur-xl ring-1 ring-black/[0.02] transition-all duration-500 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/[0.05] dark:ring-white/[0.03] animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Status accent rail */}
      <div className={`absolute bottom-4 top-4 right-0 w-1 rounded-full bg-gradient-to-b ${cfg.rail} opacity-80`} />

      {/* Header */}
      <div className="p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-3.5">
            <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${cfg.bg} ${cfg.text} ring-1 ${cfg.ring}`}>
              <Icon className={`h-5 w-5 ${order.status === 'processing' ? 'animate-spin' : ''}`} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-black tracking-tight">
                  سفارش #{order.order_number}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  <Hash className="h-2.5 w-2.5" />
                  {order.id}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(order.created_at)}
                </span>
                {itemCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {itemCount.toLocaleString('fa-IR')} کالا
                  </span>
                )}
                {order.payment_method && (
                  <span className="hidden items-center gap-1 sm:inline-flex">
                    <Wallet className="h-3 w-3" />
                    {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <PaymentBadge status={order.payment_status} />
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* Collapsed item previews */}
        {!expanded && order.items && order.items.length > 0 && (
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {/* Stacked avatars */}
            <div className="flex -space-x-2 space-x-reverse pl-1">
              {order.items.slice(0, 4).map((item, i) => (
                <div
                  key={item.id}
                  className="h-10 w-10 overflow-hidden rounded-xl bg-muted ring-2 ring-card shadow-sm"
                  style={{ zIndex: 4 - i }}
                >
                  <img
                    src={item.product?.primary_image || 'https://via.placeholder.com/60x60'}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-muted-foreground">
                {order.items.slice(0, 2).map((i) => i.product?.name).filter(Boolean).join(' · ')}
                {order.items.length > 2 && ` · +${(order.items.length - 2).toLocaleString('fa-IR')} مورد دیگر`}
              </p>
            </div>
          </div>
        )}

        {/* Journey (always visible for active statuses) */}
        {!expanded && <OrderJourney status={order.status} />}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-border/40 bg-gradient-to-l from-muted/40 via-muted/20 to-transparent px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">مبلغ کل</p>
            <p className="text-base font-black tabular-nums tracking-tight sm:text-lg">
              {formatPrice(order.total)}
            </p>
          </div>
          {order.payment_method && (
            <div className="hidden border-r border-border/50 pr-4 sm:block">
              <p className="text-[11px] font-medium text-muted-foreground">روش پرداخت</p>
              <p className="text-xs font-semibold">
                {PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="group/btn inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-background/70 px-3.5 py-2 text-xs font-bold text-foreground shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md"
        >
          {expanded ? 'بستن جزئیات' : 'مشاهده جزئیات'}
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {/* Expanded details */}
      <div
        className={`grid transition-all duration-500 ease-out ${
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border/40 px-4 py-5 sm:px-5">
            <OrderJourney status={order.status} />

            <div className="mt-4 space-y-2.5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                اقلام سفارش
              </p>
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/20 p-3 transition-all duration-300 hover:border-border hover:bg-muted/40 sm:gap-4"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border/40 sm:h-16 sm:w-16">
                    <img
                      src={item.product?.primary_image || 'https://via.placeholder.com/100x100'}
                      alt={item.product?.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    {item.product?.slug ? (
                      <Link
                        to={`/product/${item.product.slug}`}
                        className="line-clamp-1 text-sm font-bold transition-colors hover:text-primary"
                      >
                        {item.product?.name}
                      </Link>
                    ) : (
                      <p className="line-clamp-1 text-sm font-bold">{item.product?.name}</p>
                    )}
                    <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                      {item.quantity.toLocaleString('fa-IR')} × {formatPrice(item.price)}
                    </p>
                    {(item.variant?.size_name || item.variant?.color_name) && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {item.variant?.size_name && (
                          <span className="rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-semibold">
                            سایز {item.variant.size_name}
                          </span>
                        )}
                        {item.variant?.color_name && (
                          <span className="rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-semibold">
                            {item.variant.color_name}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="shrink-0 text-sm font-black tabular-nums">
                    {formatPrice(item.total_price)}
                  </p>
                </div>
              ))}
            </div>

            {/* Order financial summary */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-l from-muted/50 to-muted/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-medium">جمع کالاها:</span>
                    <span className="font-bold tabular-nums text-foreground">{formatPrice(order.subtotal)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Truck className="h-3 w-3" />
                    <span className="font-medium">ارسال:</span>
                    <span className="font-bold tabular-nums text-foreground">
                      {parseFloat(order.shipping_cost) > 0 ? formatPrice(order.shipping_cost) : 'رایگان'}
                    </span>
                  </span>
                  {order.shipping_address && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      <span className="max-w-[180px] truncate">
                        {typeof order.shipping_address === 'string'
                          ? order.shipping_address
                          : [order.shipping_address.city, order.shipping_address.address_line1]
                              .filter(Boolean)
                              .join(' · ')}
                      </span>
                    </span>
                  )}
                </div>
                <div className="text-left sm:text-left">
                  <p className="text-[11px] font-medium text-muted-foreground">مبلغ نهایی</p>
                  <p className="text-xl font-black tabular-nums tracking-tight text-primary">
                    {formatPrice(order.total)}
                  </p>
                </div>
              </div>
            </div>

            {/* Tracking Codes */}
            {(order.tracking_number || order.postal_tracking_code) && (
              <div className="mt-4 rounded-2xl border border-border/50 bg-card/60 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  کدهای پیگیری
                </p>
                {order.tracking_number && (
                  <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3.5 py-2.5">
                    <div>
                      <p className="text-[11px] text-muted-foreground">کد پیگیری پرداخت</p>
                      <p className="text-sm font-bold tabular-nums" dir="ltr">{order.tracking_number}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(order.tracking_number)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                      title="کپی"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {order.postal_tracking_code && (
                  <div className="flex items-center justify-between rounded-xl bg-muted/40 px-3.5 py-2.5">
                    <div>
                      <p className="text-[11px] text-muted-foreground">کد رهگیری پستی</p>
                      <p className="text-sm font-bold tabular-nums" dir="ltr">{order.postal_tracking_code}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(order.postal_tracking_code)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                      title="کپی"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

/* ─── Filter Chip ─── */
const FilterChip = ({ active, onClick, label, count, icon: Icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group inline-flex shrink-0 items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-xs font-bold transition-all duration-300 ${
      active
        ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
        : 'border-border/60 bg-card/70 text-muted-foreground shadow-sm backdrop-blur-sm hover:border-primary/25 hover:text-foreground hover:shadow-md'
    }`}
  >
    {Icon && <Icon className={`h-3.5 w-3.5 ${active ? 'opacity-90' : 'opacity-60'}`} />}
    {label}
    {count > 0 && (
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
          active ? 'bg-white/20' : 'bg-muted text-muted-foreground'
        }`}
      >
        {count.toLocaleString('fa-IR')}
      </span>
    )}
  </button>
);

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
