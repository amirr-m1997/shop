import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, Compass, MapPinOff } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import { SEO } from '../lib/seo';

const NotFoundPage = () => {
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-4">
      <SEO title="صفحه یافت نشد" noIndex />
      {/* Soft ambient background aligned with app brand */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-32 left-1/4 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-violet-500/[0.06] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.04) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative w-full max-w-lg">
        <EmptyState
          icon={MapPinOff}
          badge="۴۰۴"
          title="این مسیر به جایی نرسید"
          description="صفحه‌ای که دنبالش هستید وجود ندارد یا جابه‌جا شده. بیایید شما را به جای درست هدایت کنیم."
          primaryLabel="بازگشت به خانه"
          primaryTo="/"
          secondaryLabel="مرور محصولات"
          secondaryTo="/products"
          accent="from-primary/15 via-indigo-500/10 to-violet-500/10"
        >
          <div className="mt-10 grid w-full max-w-sm grid-cols-2 gap-3">
            <Link
              to="/blog"
              className="group rounded-2xl border border-border/50 bg-card/60 p-4 text-center shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
            >
              <Compass className="mx-auto mb-2 h-5 w-5 text-primary/70 transition-transform group-hover:scale-110" />
              <p className="text-xs font-semibold text-muted-foreground">مجله مد</p>
            </Link>
            <Link
              to="/size-finder"
              className="group rounded-2xl border border-border/50 bg-card/60 p-4 text-center shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
            >
              <Search className="mx-auto mb-2 h-5 w-5 text-primary/70 transition-transform group-hover:scale-110" />
              <p className="text-xs font-semibold text-muted-foreground">سایز‌یاب</p>
            </Link>
          </div>
          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/70">
            <Home className="h-3.5 w-3.5" />
            همیشه راهی به خانه هست
          </p>
        </EmptyState>
      </div>
    </div>
  );
};

export default NotFoundPage;
