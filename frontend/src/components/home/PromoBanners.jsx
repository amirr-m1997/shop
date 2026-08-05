import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, ShoppingBag } from 'lucide-react';

const PromoBanners = () => (
  <section className="relative py-8 sm:py-12">
    <div className="container mx-auto px-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        <Link
          to="/sale"
          className="group relative overflow-hidden rounded-[1.5rem] border border-border/40 bg-stone-100 shadow-lg shadow-black/[0.04] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl dark:border-white/[0.08] dark:bg-neutral-900"
        >
          <div className="relative flex min-h-[200px] items-center sm:min-h-[240px]">
            <div className="absolute inset-0 bg-gradient-to-l from-amber-100/80 via-stone-100/90 to-stone-100 dark:from-amber-950/40 dark:via-neutral-900/95 dark:to-neutral-900" />
            <div
              className="absolute left-0 top-0 h-full w-1/2 bg-cover bg-center opacity-90 transition-transform duration-700 group-hover:scale-105"
              style={{
                backgroundImage:
                  'radial-gradient(ellipse at 30% 50%, rgba(251,191,36,0.15), transparent 60%)',
              }}
            />
            <div className="absolute left-4 top-1/2 hidden h-36 w-36 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber-200/50 to-stone-200/30 blur-2xl sm:block dark:from-amber-500/20 dark:to-neutral-700/20" />
            <div className="relative z-10 flex w-full items-center justify-between gap-4 p-6 sm:p-8">
              <div className="min-w-0 flex-1 text-right max-sm:text-center">
                <span className="mb-2 inline-block text-xs font-bold uppercase tracking-widest text-amber-700/80 dark:text-amber-400/80">
                  تخفیف تابستانه
                </span>
                <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  تا ۵۰٪ تخفیف
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  روی منتخبی از کالکشن
                </p>
                <span className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-2xl bg-neutral-900 px-5 text-sm font-bold text-white transition-transform group-hover:-translate-x-0.5 dark:bg-white dark:text-neutral-900">
                  مشاهده کالکشن
                  <ArrowLeft className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-white/60 shadow-inner backdrop-blur-sm sm:flex dark:bg-white/10">
                <ShoppingBag className="h-10 w-10 text-amber-600/70 dark:text-amber-400/70" />
              </div>
            </div>
          </div>
        </Link>

        <Link
          to="/new-arrivals"
          className="group relative overflow-hidden rounded-[1.5rem] border border-border/40 bg-stone-50 shadow-lg shadow-black/[0.04] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl dark:border-white/[0.08] dark:bg-neutral-900"
        >
          <div className="relative flex min-h-[200px] items-center sm:min-h-[240px]">
            <div className="absolute inset-0 bg-gradient-to-l from-sky-100/70 via-stone-50/90 to-stone-50 dark:from-sky-950/30 dark:via-neutral-900/95 dark:to-neutral-900" />
            <div className="absolute left-4 top-1/2 hidden h-36 w-36 -translate-y-1/2 rounded-full bg-gradient-to-br from-sky-200/40 to-violet-200/20 blur-2xl sm:block dark:from-sky-500/15 dark:to-violet-500/10" />
            <div className="relative z-10 flex w-full items-center justify-between gap-4 p-6 sm:p-8">
              <div className="min-w-0 flex-1 text-right max-sm:text-center">
                <span className="mb-2 inline-block text-xs font-bold uppercase tracking-widest text-sky-700/80 dark:text-sky-400/80">
                  تازه‌های مد
                </span>
                <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  جدیدترین ترندها
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  استایل تازه‌ات را کشف کن
                </p>
                <span className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-2xl border border-border/60 bg-white/80 px-5 text-sm font-bold transition-all group-hover:-translate-x-0.5 dark:border-white/15 dark:bg-white/10">
                  مشاهده
                  <ArrowLeft className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="hidden h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-white/60 shadow-inner backdrop-blur-sm sm:flex dark:bg-white/10">
                <Sparkles className="h-10 w-10 text-sky-600/70 dark:text-sky-400/70" />
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  </section>
);

export default PromoBanners;
