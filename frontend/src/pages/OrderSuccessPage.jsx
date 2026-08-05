import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Hash, Copy, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { SEO } from '../lib/seo';
import { Card, CardContent } from '../components/ui/Card';
import CountdownTimer from '../components/CountdownTimer';
import GuestAccountCard from '../components/GuestAccountCard';
import { useAuth } from '../contexts/AuthContext';

const OrderSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const refId = searchParams.get('ref_id');
  const orderNumber = searchParams.get('order_number');
  const expiresAt = searchParams.get('expires_at');
  const { isAuthenticated } = useAuth();

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-lg text-center">
      <SEO title="سفارش موفق" noIndex />
      <Card>
        <CardContent className="p-8">
          <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">سفارش شما ثبت شد!</h1>
          <p className="text-muted-foreground mb-2">
            ممنون از خرید شما. سفارش شما با موفقیت ثبت شد.
          </p>

          {refId && (
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <p className="text-sm text-muted-foreground mb-2">کد پیگیری پرداخت</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-2xl font-bold tabular-nums tracking-wider text-emerald-600 dark:text-emerald-400">{refId}</p>
                <button
                  onClick={() => copyToClipboard(String(refId))}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                  title="کپی"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                این کد را برای پیگیری پرداخت خود نگه دارید
              </p>
            </div>
          )}

          {orderNumber && (
            <div className="mt-4 rounded-2xl border border-border/50 bg-muted/30 p-4">
              <p className="text-sm text-muted-foreground mb-1">شماره سفارش</p>
              <div className="flex items-center justify-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <p className="text-lg font-bold tabular-nums">{orderNumber}</p>
              </div>
            </div>
          )}

          {expiresAt && (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm text-muted-foreground mb-2">زمان رزرو محصولات</p>
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <CountdownTimer expiresAt={expiresAt} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                لطفاً هرچه سریع‌تر نسبت به پرداخت اقدام کنید. پس از اتمام این زمان، سفارش شما به‌صورت خودکار لغو می‌شود.
              </p>
            </div>
          )}

          {!isAuthenticated && orderNumber && (
            <GuestAccountCard orderNumber={orderNumber} />
          )}

          <p className="text-muted-foreground mt-4 mb-8 text-sm">
            یک ایمیل تایید به آدرس ایمیل شما ارسال خواهد شد.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/orders">
                مشاهده سفارشات <ArrowLeft className="h-4 w-4 mr-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/products">ادامه خرید</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderSuccessPage;
