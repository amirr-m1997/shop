import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { ICON_MAP } from './constants';
import { Sparkles, Truck, ArrowLeft } from 'lucide-react';

const StaticHero = ({ settings, features = [] }) => {
  const heroImage = settings.hero_image || '';
  const stripFeatures =
    features.length > 0
      ? features.slice(0, 3)
      : [
          { id: 1, icon: 'Truck', title: 'ارسال رایگان', description: 'برای سفارش‌های بالای ۲ میلیون' },
          { id: 2, icon: 'RotateCcw', title: 'بازگشت آسان', description: 'تا ۳۰ روز ضمانت بازگشت' },
          { id: 3, icon: 'Shield', title: 'پرداخت امن', description: 'با درگاه‌های معتبر' },
        ];

  return (
    <section className="relative pt-4 sm:pt-6">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] border border-border/40 bg-stone-100 shadow-2xl shadow-black/[0.06] dark:border-white/[0.08] dark:bg-neutral-900 dark:shadow-black/40">
          <div className="relative min-h-[420px] sm:min-h-[480px] lg:min-h-[560px]">
            {heroImage && (
              <img
                src={heroImage}
                alt=""
                className="absolute inset-0 h-full w-full scale-105 object-cover"
              />
            )}
            <div className="absolute inset-0 z-[1] bg-gradient-to-l from-transparent via-stone-100/40 to-stone-100/95 dark:via-neutral-950/50 dark:to-neutral-950/95" />
            <div className="absolute inset-0 z-[1] bg-gradient-to-t from-stone-100/80 via-transparent to-stone-100/20 dark:from-neutral-950/90 dark:to-transparent" />

            <div className="relative z-10 flex h-full min-h-[420px] items-center sm:min-h-[480px] lg:min-h-[560px]">
              <div className="w-full p-6 pb-28 sm:p-10 sm:pb-32 lg:p-14 lg:pb-36">
                <div className="max-w-xl animate-fade-in-up">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/5 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:text-white">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300" />
                    کالکشن ویژه
                  </div>
                  <h1 className="mb-4 text-3xl font-black leading-[1.15] tracking-tight text-foreground dark:text-white sm:text-4xl md:text-5xl lg:text-6xl">
                    {settings.hero_title}
                  </h1>
                  {settings.hero_subtitle && (
                    <p className="mb-7 max-w-md text-sm leading-relaxed text-muted-foreground dark:text-white/70 sm:mb-9 sm:text-base md:text-lg">
                      {settings.hero_subtitle}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      asChild
                      size="lg"
                      className="group h-11 rounded-2xl bg-neutral-900 px-6 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-white/95 sm:h-12 sm:px-7 sm:text-base"
                    >
                      <Link to="/products" className="flex items-center gap-2">
                        مشاهده محصولات
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="h-11 rounded-2xl border-border/60 bg-white/60 px-6 text-sm font-bold backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/90 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:h-12 sm:px-7 sm:text-base"
                    >
                      <Link to="/new-arrivals">کالکشن جدید</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute inset-x-2 bottom-2 z-20 sm:inset-x-5 sm:bottom-4 lg:inset-x-6">
              <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-white/60 bg-white/80 shadow-lg backdrop-blur-2xl dark:border-white/15 dark:bg-neutral-900/80">
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-neutral-200/70 dark:divide-white/10">
                  {stripFeatures.map((f) => {
                    const IconComp = ICON_MAP[f.icon] || Truck;
                    return (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 px-2.5 py-2.5 sm:justify-center sm:gap-3 sm:px-5 sm:py-4"
                      >
                        <div className={`flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl ${f.bg_color || 'bg-neutral-900/10 dark:bg-white/10'}`}>
                          <IconComp className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${f.color || 'text-neutral-700 dark:text-white'}`} />
                        </div>
                        <div className="min-w-0 text-right sm:text-center">
                          <p className="truncate text-xs sm:text-sm font-bold tracking-tight text-neutral-900 dark:text-white">
                            {f.title}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] sm:text-[11px] text-neutral-900 dark:text-white/70">
                            {f.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StaticHero;
