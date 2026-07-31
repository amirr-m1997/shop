import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Calendar, ChevronDown, Wallet, MapPin, Hash, Copy, Truck
} from 'lucide-react';
import { formatPrice } from '../../lib/formatPrice';
import { formatDate } from '../../lib/formatDate';
import { STATUS_CONFIG, PAYMENT_METHOD_LABELS } from './constants';
import StatusBadge from './StatusBadge';
import PaymentBadge from './PaymentBadge';
import OrderJourney from './OrderJourney';
import CountdownTimer from '../CountdownTimer';

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
      <div className={`absolute bottom-4 top-4 right-0 w-1 rounded-full bg-gradient-to-b ${cfg.rail} opacity-80`} />

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
            {order.payment_status === 'unpaid' && order.status !== 'cancelled' && order.expires_at && (
              <CountdownTimer expiresAt={order.expires_at} />
            )}
            <PaymentBadge status={order.payment_status} />
            <StatusBadge status={order.status} />
          </div>
        </div>

        {!expanded && order.items && order.items.length > 0 && (
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
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

        {!expanded && <OrderJourney status={order.status} />}
      </div>

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

export default OrderCard;
