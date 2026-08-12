import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, MessageCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { pagesAPI } from '../services/api';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { SEO } from '../lib/seo';

const FaqItem = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Card>
      <CardContent className="p-0">
        <button onClick={() => setIsOpen(!isOpen)} className="w-full p-4 flex items-center justify-between text-right hover:bg-muted/50 transition-colors">
          <span className="font-semibold">{item.question}</span>
          {isOpen ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
        </button>
        {isOpen && <div className="px-4 pb-4 text-muted-foreground">{item.answer}</div>}
      </CardContent>
    </Card>
  );
};

const FaqPage = () => {
  const [faqData, setFaqData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pagesAPI.getFaq().then(res => {
      setFaqData(res.data.results || res.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16">
        <Skeleton className="mx-auto mb-8 h-9 w-56 rounded-xl" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" delay={i * 0.08} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <SEO
        title="سوالات متداول"
        description="پاسخ سوالات متداول فروشگاه مد | نحوه سفارش، ارسال، بازگشت کالا، پرداخت و خدمات پس از فروش"
        url="https://fashionshop.ir/faq"
      >
        {faqData.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqData.map(item => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: item.answer,
                },
              })),
            })}
          </script>
        )}
      </SEO>
      <h1 className="text-3xl font-bold mb-8 text-center">سوالات متداول</h1>
      <div className="space-y-4">
        {faqData.length === 0 ? (
          <EmptyState
            icon={HelpCircle}
            badge="پشتیبانی"
            title="هنوز سوالی ثبت نشده"
            description="به‌زودی پاسخ سوالات پرتکرار اینجا قرار می‌گیرد. اگر الان نیاز به کمک دارید، با ما در تماس باشید."
            primaryLabel="تماس با پشتیبانی"
            primaryTo="/contact"
            secondaryLabel="بازگشت به خانه"
            secondaryTo="/"
            accent="from-sky-500/15 via-blue-500/10 to-cyan-500/10"
          >
            <div className="mt-8 flex items-center gap-2 rounded-2xl border border-border/50 bg-card/60 px-4 py-3 text-xs text-muted-foreground shadow-sm">
              <MessageCircle className="h-4 w-4 text-primary/70" />
              معمولاً کمتر از ۲۴ ساعت پاسخ می‌دهیم
            </div>
          </EmptyState>
        ) : (
          faqData.map((item, index) => <FaqItem key={item.id || index} item={item} />)
        )}
      </div>
    </div>
  );
};

export default FaqPage;
