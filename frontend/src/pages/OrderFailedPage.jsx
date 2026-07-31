import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

const ERROR_MESSAGES = {
  cancelled: 'پرداخت توسط شما لغو شد.',
  verify_failed: 'تأیید پرداخت با خطا مواجه شد.',
  network_error: 'خطا در اتصال به سرور پرداخت.',
  payment_not_found: 'اطلاعات پرداخت یافت نشد.',
};

const OrderFailedPage = () => {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error') || 'unknown';
  const orderId = searchParams.get('order');
  const code = searchParams.get('code');

  const message = ERROR_MESSAGES[error] || 'خطای ناشناخته رخ داده است.';

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-b from-red-50/30 via-background to-background">
      <Card className="max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-gradient-to-l from-red-500 to-rose-400 p-6 text-center">
          <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">پرداخت ناموفق</h1>
        </div>
        <CardContent className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-muted-foreground">{message}</p>
            {code && (
              <p className="text-xs text-muted-foreground mt-2">
                کد خطا: {code}
              </p>
            )}
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
            اگر مبلغی از حساب شما کسر شده، ظرف ۲۴ ساعت بازگردانده می‌شود.
            در صورت تکرار مشکل با پشتیبانی تماس بگیرید.
          </div>

          <div className="flex flex-col gap-2">
            {orderId && (
              <Button asChild className="w-full rounded-xl">
                <Link to="/orders">
                  <RefreshCw className="ml-2 h-4 w-4" />
                  تلاش مجدد پرداخت
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link to="/cart">
                <ArrowLeft className="ml-2 h-4 w-4" />
                بازگشت به سبد خرید
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderFailedPage;
