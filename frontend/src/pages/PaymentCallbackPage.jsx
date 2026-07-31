import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowLeft, Loader2, Hash, Copy } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

const PaymentCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const refId = searchParams.get('ref_id');
  const [status, setStatus] = useState('loading');
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    if (refId) {
      setStatus('success');
      setPaymentData({ ref_id: refId });
    } else {
      setStatus('failed');
    }
  }, [refId]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  if (status === 'loading') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
            <h1 className="text-xl font-bold mb-2">پرداخت ناموفق</h1>
            <p className="text-muted-foreground mb-6">پرداخت شما تأیید نشد. لطفاً دوباره تلاش کنید.</p>
            <Button asChild>
              <Link to="/orders">مشاهده سفارشات</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-b from-emerald-50/50 via-background to-background">
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
              <p className="text-2xl font-black tabular-nums tracking-wider">{paymentData?.ref_id}</p>
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
