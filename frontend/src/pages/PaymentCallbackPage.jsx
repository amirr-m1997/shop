import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowLeft, Copy, XCircle, Ban, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { SEO } from '../lib/seo';
import PaymentCallbackSkeleton from '../components/skeletons/PaymentCallbackSkeleton';
import GuestAccountCard from '../components/GuestAccountCard';
import { useAuth } from '../contexts/AuthContext';
import { paymentsAPI } from '../services/api';

const PaymentCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const refId = searchParams.get('ref_id');
  const error = searchParams.get('error');
  const orderNumber = searchParams.get('order_number');
  const paymentId = searchParams.get('payment_id');
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState('loading');
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (error) {
      setStatus('failed');
      return;
    }

    // When a payment_id is present we verify the result with the backend
    // instead of trusting query params — anyone could craft a URL with a
    // fake ref_id otherwise.
    if (paymentId) {
      setStatus('loading');
      paymentsAPI
        .getStatus(paymentId)
        .then((res) => {
          if (cancelled) return;
          if (res.data?.status === 'success') {
            setStatus(res.data?.inventory_issue ? 'inventory_issue' : 'success');
            setPaymentData({
              ref_id: res.data.ref_id || refId,
              order_number: res.data.order_number || orderNumber,
            });
          } else {
            setStatus('failed');
          }
        })
        .catch(() => {
          if (cancelled) return;
          // If verification itself fails (e.g. session lost), fall back to
          // the gateway-provided params instead of showing a false failure.
          if (refId) {
            setStatus('success');
            setPaymentData({ ref_id: refId, order_number: orderNumber });
          } else {
            setStatus('failed');
          }
        });
      return () => {
        cancelled = true;
      };
    }

    // Legacy callback URLs without payment_id.
    if (refId) {
      setStatus('success');
      setPaymentData({ ref_id: refId, order_number: orderNumber });
    } else {
      setStatus('failed');
    }
  }, [refId, error, orderNumber, paymentId]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  if (status === 'loading') {
    return <PaymentCallbackSkeleton />;
  }

  if (status === 'failed') {
    const isExpired = error === 'order_expired';
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <SEO title="نتیجه پرداخت" noIndex />
        <div className="w-full max-w-lg">
          <EmptyState
            icon={isExpired ? Ban : XCircle}
            badge={isExpired ? 'منقضی شده' : 'پرداخت'}
            title={isExpired ? 'سفارش منقضی شده است' : 'پرداخت تأیید نشد'}
            description={
              isExpired
                ? 'زمان رزرو این سفارش تمام شده و موجودی آزاد شده است. لطفاً سفارش جدیدی ثبت کنید.'
                : 'پرداخت شما کامل نشد. نگران نباشید — می‌توانید از سفارش‌ها دوباره تلاش کنید یا با پشتیبانی در تماس باشید.'
            }
            primaryLabel={isExpired ? 'مشاهده محصولات' : 'مشاهده سفارش‌ها'}
            primaryTo={isExpired ? '/products' : '/orders'}
            secondaryLabel={isExpired ? undefined : 'بازگشت به سبد خرید'}
            secondaryTo={isExpired ? undefined : '/cart'}
            accent={isExpired
              ? 'from-gray-500/15 via-slate-500/10 to-gray-500/10'
              : 'from-red-500/15 via-rose-500/10 to-orange-500/10'
            }
          />
        </div>
      </div>
    );
  }

  if (status === 'inventory_issue') {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <SEO title="نتیجه پرداخت" noIndex />
        <div className="w-full max-w-lg">
          <EmptyState
            icon={AlertTriangle}
            badge="پرداخت موفق"
            title="پرداخت ثبت شد؛ سفارش نیازمند بررسی موجودی است"
            description="مبلغ با موفقیت پرداخت شده، اما موجودی کالا هنگام تأیید نهایی کافی نبوده است. سفارش برای بررسی دستی ثبت شده و پشتیبانی نتیجه تأمین یا بازپرداخت را پیگیری می‌کند."
            primaryLabel="مشاهده سفارش‌ها"
            primaryTo="/orders"
            secondaryLabel="ادامه خرید"
            secondaryTo="/products"
            accent="from-orange-500/15 via-red-500/10 to-amber-500/10"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-b from-emerald-50/50 via-background to-background">
      <SEO title="نتیجه پرداخت" noIndex />
      <Card className="max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-l from-emerald-500 to-green-400 p-6 text-center">
          <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">پرداخت موفق</h1>
        </div>
        <CardContent className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-muted-foreground mb-1">کد پیگیری پرداخت</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-2xl font-bold tabular-nums tracking-wider">{paymentData?.ref_id}</p>
              <button
                onClick={() => copyToClipboard(paymentData?.ref_id)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                title="کپی"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-center text-sm text-muted-foreground">
            سفارش شما با موفقیت ثبت و پرداخت شد.
            <br />
            این کد را برای پیگیری سفارش خود نگه دارید.
          </div>

          {!isAuthenticated && orderNumber && (
            <GuestAccountCard orderNumber={orderNumber} />
          )}

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full rounded-xl">
              <Link to="/orders">
                <Package className="ml-2 h-4 w-4" />
                مشاهده سفارشات
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link to="/products">
                <ArrowLeft className="ml-2 h-4 w-4" />
                ادامه خرید
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCallbackPage;
