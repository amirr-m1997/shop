import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Clock, CheckCircle, Truck, XCircle, RotateCcw,
  Loader, ShoppingBag, CreditCard, Calendar, ChevronDown, ChevronUp,
  ArrowRight, PackageCheck
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ordersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice } from '../lib/formatPrice';
import { formatDate } from '../lib/formatDate';

/* ─── Status Config ─── */
const STATUS_CONFIG = {
  pending:    { label: 'در انتظار پرداخت',   icon: Clock,      bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-r-amber-500', dot: 'bg-amber-500' },
  processing: { label: 'در حال پردازش',       icon: Loader,     bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-300',   border: 'border-r-blue-500',   dot: 'bg-blue-500' },
  shipped:    { label: 'ارسال شده',           icon: Truck,      bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-r-purple-500', dot: 'bg-purple-500' },
  delivered:  { label: 'تحویل داده شده',      icon: CheckCircle, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-r-green-500', dot: 'bg-green-500' },
  cancelled:  { label: 'لغو شده',             icon: XCircle,    bg: 'bg-red-100 dark:bg-red-900/30',     text: 'text-red-700 dark:text-red-300',     border: 'border-r-red-500',    dot: 'bg-red-500' },
  returned:   { label: 'مرجوع شده',           icon: RotateCcw,  bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-r-orange-500', dot: 'bg-orange-500' },
};

const PAYMENT_CONFIG = {
  unpaid:   { label: 'پرداخت نشده',   dot: 'bg-red-500' },
  paid:     { label: 'پرداخت شده',    dot: 'bg-green-500' },
  refunded: { label: 'بازپرداخت شده', dot: 'bg-amber-500' },
};

const PAYMENT_METHOD_LABELS = {
  online: 'پرداخت آنلاین',
  cash_on_delivery: 'پرداخت در محل',
  card: 'کارت به کارت',
};

/* ─── Status Badge ─── */
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
};

/* ─── Payment Badge ─── */
const PaymentBadge = ({ status }) => {
  const cfg = PAYMENT_CONFIG[status] || PAYMENT_CONFIG.unpaid;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

/* ─── Order Card ─── */
const OrderCard = ({ order }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  return (
    <Card className={`overflow-hidden border-r-4 ${cfg.border} transition-all hover:shadow-md`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                <cfg.icon className={`h-5 w-5 ${cfg.text}`} />
              </div>
              <div>
                <h3 className="font-bold text-base">سفارش #{order.order_number}</h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(order.created_at)}
                  </span>
                  {order.items && (
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {order.items.length} کالا
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <PaymentBadge status={order.payment_status} />
              <StatusBadge status={order.status} />
            </div>
          </div>

          {/* Quick items preview (first 2 items) */}
          {!expanded && order.items && order.items.length > 0 && (
            <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
              {order.items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-2 bg-muted/50 rounded-lg px-2.5 py-1.5 shrink-0">
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-muted shrink-0">
                    <img
                      src={item.product?.primary_image || 'https://via.placeholder.com/60x60'}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-xs font-medium truncate max-w-[120px]">{item.product?.name}</span>
                  <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                </div>
              ))}
              {order.items.length > 3 && (
                <span className="text-xs text-muted-foreground shrink-0">
                  +{order.items.length - 3} کالای دیگر
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-4 sm:px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">مبلغ کل</p>
              <p className="text-base font-black">{formatPrice(order.total)}</p>
            </div>
            {order.payment_method && (
              <div className="hidden sm:block">
                <p className="text-xs text-muted-foreground">روش پرداخت</p>
                <p className="text-xs font-medium">{PAYMENT_METHOD_LABELS[order.payment_method] || order.payment_method}</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            {expanded ? 'بستن جزئیات' : 'مشاهده جزئیات'}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Expanded items */}
        {expanded && (
          <div className="border-t">
            <div className="p-4 sm:p-5 space-y-3">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center gap-3 sm:gap-4 p-3 bg-muted/40 rounded-xl">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-muted rounded-lg overflow-hidden shrink-0">
                    <img
                      src={item.product?.primary_image || 'https://via.placeholder.com/100x100'}
                      alt={item.product?.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.product?.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.quantity} × {formatPrice(item.price)}
                    </p>
                  </div>
                  <p className="font-bold text-sm shrink-0">{formatPrice(item.total_price)}</p>
                </div>
              ))}

              {/* Order summary */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t">
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>جمع: {formatPrice(order.subtotal)}</span>
                  <span>ارسال: {order.shipping_cost > 0 ? formatPrice(order.shipping_cost) : 'رایگان'}</span>
                </div>
                <div className="text-left">
                  <p className="text-xs text-muted-foreground">مبلغ نهایی</p>
                  <p className="text-lg font-black">{formatPrice(order.total)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

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
    return orders.filter(o => o.status === filter);
  }, [orders, filter]);

  const stats = useMemo(() => {
    const totalSpent = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    return { count: orders.length, totalSpent };
  }, [orders]);

  const statusFilters = [
    { key: 'all', label: 'همه', count: orders.length },
    { key: 'pending', label: 'در انتظار' },
    { key: 'processing', label: 'در حال پردازش' },
    { key: 'shipped', label: 'ارسال شده' },
    { key: 'delivered', label: 'تحویل شده' },
    { key: 'cancelled', label: 'لغو شده' },
  ];

  /* ── Not logged in ── */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">لطفاً وارد شوید</h2>
            <p className="text-sm text-muted-foreground mb-6">برای مشاهده سفارش‌ها باید وارد حساب کاربری خود شوید</p>
            <Link to="/login">
              <Button className="w-full">ورود به حساب</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
          <div className="h-32 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  /* ── Empty state ── */
  if (orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">هنوز سفارشی ثبت نکرده‌اید</h2>
            <p className="text-sm text-muted-foreground mb-6">اولین خرید خود را شروع کنید!</p>
            <Link to="/products">
              <Button className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                مشاهده محصولات
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 via-background to-muted/20">
      <div className="container mx-auto px-4 py-6 sm:py-10 max-w-4xl">

        {/* ── Hero Header ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/20 via-primary/5 to-transparent border border-primary/10 mb-6">
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="h-16 w-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25">
                <PackageCheck className="h-8 w-8" />
              </div>
              <div className="flex-1 text-center sm:text-right">
                <h1 className="text-2xl sm:text-3xl font-black">سفارش‌های من</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {stats.count} سفارش ثبت شده
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center px-4 py-2 bg-background/60 rounded-xl border">
                  <p className="text-2xl font-black text-primary">{stats.count}</p>
                  <p className="text-xs text-muted-foreground">سفارش</p>
                </div>
                <div className="text-center px-4 py-2 bg-background/60 rounded-xl border">
                  <p className="text-2xl font-black">{formatPrice(stats.totalSpent)}</p>
                  <p className="text-xs text-muted-foreground">مجموع خرید</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Status Filters ── */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {statusFilters.map(sf => {
            const count = sf.key === 'all' ? orders.length : orders.filter(o => o.status === sf.key).length;
            return (
              <button
                key={sf.key}
                onClick={() => setFilter(sf.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  filter === sf.key
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                {sf.label}
                {count > 0 && (
                  <span className={`mr-1 ${filter === sf.key ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Orders List ── */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">سفارشی با فیلتر انتخابی یافت نشد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
