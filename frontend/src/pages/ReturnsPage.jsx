import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { pagesAPI } from '../services/api';
import { SEO } from '../lib/seo';

const ReturnsPage = () => {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    pagesAPI.getSettings().then(res => setSettings(res.data)).catch(() => {});
  }, []);

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <SEO
        title="بازگشت کالا"
        description="شرایط بازگشت و مرجوعی کالا | ضمانت بازگشت ۳۰ روزه فروشگاه مد"
        url="https://fashionshop.ir/returns"
      />
      <h1 className="text-3xl font-bold mb-8 text-center">{settings.returns_title || 'بازگشت کالا'}</h1>
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <RotateCcw className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold">{settings.returns_title || 'بازگشت کالا'}</h3>
            </div>
            {settings.returns_content ? (
              <div className="text-muted-foreground">{settings.returns_content.split('\n').map((p, i) => <p key={i} className="mb-2">{p}</p>)}</div>
            ) : (
              <p className="text-muted-foreground">شما تا ۳۰ روز پس از دریافت سفارش فرصت دارید کالا را بازگشت دهید.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReturnsPage;
