import React from 'react';
import { Truck, Clock, Package } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';

const ShippingPage = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8 text-center">اطلاعات ارسال</h1>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Truck className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold">ارسال استاندارد</h3>
            </div>
            <p className="text-muted-foreground mb-2">
              ارسال رایگان برای سفارش‌های بالای ۱۰۰ دلار
            </p>
            <p className="text-muted-foreground mb-2">
              هزینه ارسال استاندارد: ۱۰ دلار
            </p>
            <p className="text-muted-foreground">
              زمان تحویل: ۳ تا ۵ روز کاری
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Package className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold">ارسال سریع</h3>
            </div>
            <p className="text-muted-foreground mb-2">
              هزینه ارسال سریع: ۲۰ دلار
            </p>
            <p className="text-muted-foreground">
              زمان تحویل: ۱ تا ۲ روز کاری
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold">زمان پردازش</h3>
            </div>
            <p className="text-muted-foreground">
              سفارش‌ها ظرف ۲۴ ساعت پردازش و ارسال می‌شوند. در روزهای تعطیل ممکن است پردازش سفارش‌ها با تاخیر انجام شود.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShippingPage;
