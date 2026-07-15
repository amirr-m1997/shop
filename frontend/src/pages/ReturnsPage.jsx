import React from 'react';
import { RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';

const ReturnsPage = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8 text-center">بازگشت کالا</h1>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <RotateCcw className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold">سیاست بازگشت</h3>
            </div>
            <p className="text-muted-foreground">
              شما تا ۳۰ روز پس از دریافت سفارش فرصت دارید کالا را بازگشت دهید. کالا باید در شرایط اولیه و با برچسب‌های اصلی باشد.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">شرایط بازگشت</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <p className="text-muted-foreground">کالا در شرایط اصلی و استفاده نشده باشد</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <p className="text-muted-foreground">برچسب‌ها و بسته‌بندی اصلی حفظ شده باشد</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <p className="text-muted-foreground">فاکتور خرید موجود باشد</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <h3 className="text-xl font-semibold">موارد غیر قابل بازگشت</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <p className="text-muted-foreground">لوززم آرایشی و بهداشتی</p>
              </div>
              <div className="flex items-start gap-3">
                <p className="text-muted-foreground">لباس زیر</p>
              </div>
              <div className="flex items-start gap-3">
                <p className="text-muted-foreground">محصولات سفارشی</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReturnsPage;
