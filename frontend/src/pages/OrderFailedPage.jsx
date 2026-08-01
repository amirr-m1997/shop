import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, Package, MessageCircle } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import { SEO } from '../lib/seo';

const ERROR_MESSAGES = {
  cancelled: 'پرداخت توسط شما لغو شد. نگران نباشید — سفارش‌تان هنوز قابل پیگیری است.',
  verify_failed: 'تأیید پرداخت با خطا مواجه شد. اگر مبلغی کسر شده، به‌زودی بازمی‌گردد.',
  network_error: 'ارتباط با سرور پرداخت برقرار نشد. چند لحظه دیگر دوباره تلاش کنید.',
  payment_not_found: 'اطلاعات پرداخت یافت نشد. از پنل سفارش‌ها وضعیت را بررسی کنید.',
};

const OrderFailedPage = () => {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error') || 'unknown';
  const orderId = searchParams.get('order');
  const code = searchParams.get('code');

  const message =
    ERROR_MESSAGES[error] ||
    'مشکلی در پرداخت پیش آمد. مبلغ در صورت کسر، ظرف ۲۴ ساعت بازگردانده می‌شود.';

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <SEO title="خطا در پرداخت" noIndex />
      <div className="w-full max-w-lg">
        <EmptyState
          icon={XCircle}
          badge="پرداخت"
          title="پرداخت کامل نشد"
          description={message}
          primaryLabel={orderId ? 'پیگیری سفارش' : 'بازگشت به سبد خرید'}
          primaryTo={orderId ? '/orders' : '/cart'}
          secondaryLabel={orderId ? 'بازگشت به سبد خرید' : 'مشاهده محصولات'}
          secondaryTo={orderId ? '/cart' : '/products'}
          accent="from-red-500/15 via-rose-500/10 to-orange-500/10"
        >
          <div className="mt-8 w-full max-w-sm space-y-3">
            {code && (
              <p className="rounded-xl border border-border/50 bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
                کد خطا: <span className="font-mono font-semibold text-foreground">{code}</span>
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/50 bg-card/60 p-3.5 text-center shadow-sm">
                <Package className="mx-auto mb-1.5 h-4 w-4 text-primary/70" />
                <p className="text-xs font-semibold text-muted-foreground">سفارش محفوظ است</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card/60 p-3.5 text-center shadow-sm">
                <MessageCircle className="mx-auto mb-1.5 h-4 w-4 text-primary/70" />
                <p className="text-xs font-semibold text-muted-foreground">پشتیبانی همراه شماست</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              اگر مبلغی از حساب شما کسر شده، ظرف ۲۴ ساعت بازگردانده می‌شود.
              در صورت تکرار مشکل با{' '}
              <Link to="/contact" className="font-semibold text-primary hover:underline">
                پشتیبانی
              </Link>{' '}
              تماس بگیرید.
            </p>
          </div>
        </EmptyState>
      </div>
    </div>
  );
};

export default OrderFailedPage;
