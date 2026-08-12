import { useState, useEffect } from 'react';
import { Truck, Clock, Package } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { pagesAPI } from '../services/api';
import { SEO } from '../lib/seo';

const ShippingPage = () => {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    pagesAPI.getSettings().then(res => setSettings(res.data)).catch(() => {});
  }, []);

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <SEO
        title="اطلاعات ارسال"
        description="شرایط و هزینه ارسال سفارشات | ارسال رایگان، زمان تحویل و روش‌های ارسال فروشگاه مد"
        url="https://fashionshop.ir/shipping"
      />
      <h1 className="text-3xl font-bold mb-8 text-center">{settings.shipping_title || 'اطلاعات ارسال'}</h1>
      <div className="space-y-6">
        {settings.shipping_content ? (
          <Card><CardContent className="p-6"><div className="prose prose-sm max-w-none text-muted-foreground">{settings.shipping_content.split('\n').map((p, i) => <p key={i}>{p}</p>)}</div></CardContent></Card>
        ) : (
          <>
            <Card><CardContent className="p-6"><div className="flex items-center gap-3 mb-4"><Truck className="h-6 w-6 text-primary" /><h3 className="text-xl font-semibold">ارسال استاندارد</h3></div><p className="text-muted-foreground">ارسال رایگان برای سفارش‌های بالای ۱۰۰ هزار تومان. زمان تحویل: ۳ تا ۵ روز کاری.</p></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center gap-3 mb-4"><Package className="h-6 w-6 text-primary" /><h3 className="text-xl font-semibold">ارسال سریع</h3></div><p className="text-muted-foreground">زمان تحویل: ۱ تا ۲ روز کاری.</p></CardContent></Card>
            <Card><CardContent className="p-6"><div className="flex items-center gap-3 mb-4"><Clock className="h-6 w-6 text-primary" /><h3 className="text-xl font-semibold">زمان پردازش</h3></div><p className="text-muted-foreground">سفارش‌ها ظرف ۲۴ ساعت پردازش و ارسال می‌شوند.</p></CardContent></Card>
          </>
        )}
      </div>
    </div>
  );
};

export default ShippingPage;
