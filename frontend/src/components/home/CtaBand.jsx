import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { ShoppingBag } from 'lucide-react';

const CtaBand = () => (
  <section className="relative py-6 sm:py-8">
    <div className="container mx-auto px-4">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border/50 bg-gradient-to-l from-primary via-primary to-primary/90 px-6 py-10 text-primary-foreground shadow-2xl shadow-primary/20 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 dark:bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-10 h-48 w-48 rounded-full bg-white/5 dark:bg-white/10 blur-2xl" />

        <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="w-full text-center sm:w-auto sm:text-right">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest opacity-70">
              تجربه خرید لوکس
            </p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              آماده‌اید استایل‌تان را متحول کنید؟
            </h2>
            <p className="mt-2 max-w-md text-sm opacity-80">
              کالکشن‌های جدید، پیشنهادهای اختصاصی و تخفیف‌های ویژه — در انتظار شما.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-2xl bg-white text-neutral-900 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-white/95 dark:bg-primary-foreground dark:text-primary dark:hover:bg-primary-foreground/95"
            >
              <Link to="/products" className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                شروع خرید
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-2xl border-white/30 bg-white/10 text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:text-white dark:border-primary-foreground/30 dark:bg-primary-foreground/10 dark:text-primary-foreground dark:hover:bg-primary-foreground/20"
            >
              <Link to="/sale">تخفیف‌ها</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default CtaBand;
