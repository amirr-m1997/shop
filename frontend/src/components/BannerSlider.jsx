import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Sparkles,
  Truck,
  Shield,
  RotateCcw,
  Headphones,
} from 'lucide-react';
import { Button } from './ui/Button';

const DEFAULT_FEATURE_ICONS = {
  Truck,
  Shield,
  RotateCcw,
  Headphones,
};

/**
 * Premium hero banner — large rounded card.
 * Feature strip moved BELOW the banner for a cleaner look (especially mobile).
 */
const BannerSlider = ({ banners = [], features = [] }) => {
  const slides = banners;
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (slides.length > 1) {
      timerRef.current = setInterval(() => {
        setIsAnimating(true);
        setCurrent((prev) => (prev + 1) % slides.length);
        setTimeout(() => setIsAnimating(false), 700);
      }, 6000);
    }
  }, [slides.length]);

  useEffect(() => {
    setCurrent(0);
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, startTimer]);

  const go = (fn) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrent(fn);
    startTimer();
    setTimeout(() => setIsAnimating(false), 700);
  };

  const next = () => go((prev) => (prev + 1) % slides.length);
  const prev = () => go((prev) => (prev - 1 + slides.length) % slides.length);

  const goTo = (idx) => {
    if (idx === current || isAnimating) return;
    go(() => idx);
  };

  if (!slides.length) return null;

  const active = slides[current];

  const stripFeatures =
    features.length > 0
      ? features.slice(0, 4)
      : [
          { id: 1, icon: 'Truck', title: 'ارسال رایگان', description: 'برای سفارش‌های بالای ۲ میلیون' },
          { id: 2, icon: 'RotateCcw', title: 'بازگشت آسان', description: 'تا ۳۰ روز ضمانت بازگشت' },
          { id: 3, icon: 'Shield', title: 'پرداخت امن', description: 'با درگاه‌های معتبر' },
        ];

  return (
    <section
      className="relative pt-4 sm:pt-6"
      aria-roledescription="carousel"
      aria-label="بنرهای اصلی"
      onMouseEnter={() => {
        if (timerRef.current) clearInterval(timerRef.current);
      }}
      onMouseLeave={startTimer}
    >
      <div className="container mx-auto px-4 sm:px-6">
        {/* ===== کارت بنر ===== */}
        <div className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2rem] border border-border/40 bg-stone-100 shadow-2xl shadow-black/[0.06] dark:border-white/[0.08] dark:bg-neutral-900 dark:shadow-black/40">
          {/* Slide media */}
          <div className="relative min-h-[400px] sm:min-h-[480px] lg:min-h-[560px]">
            {slides.map((banner, index) => {
              const isActive = index === current;
              return (
                <div
                  key={banner.id ?? index}
                  className={`absolute inset-0 transition-all duration-1000 ease-out ${
                    isActive ? 'z-10 opacity-100' : 'z-0 opacity-0'
                  }`}
                  aria-hidden={!isActive}
                >
                  <img
                    src={banner.image}
                    alt=""
                    className={`absolute inset-0 h-full w-full object-cover transition-transform ease-out ${
                      isActive ? 'scale-105' : 'scale-100'
                    }`}
                    style={{ transitionDuration: '7s' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  {/* Soft light wash (premium lifestyle look) */}
                  <div className="absolute inset-0 z-[1] bg-gradient-to-l from-transparent via-stone-100/40 to-stone-100/95 dark:via-neutral-950/50 dark:to-neutral-950/95" />
                  <div className="absolute inset-0 z-[1] bg-gradient-to-t from-stone-100/80 via-transparent to-stone-100/20 dark:from-neutral-950/90 dark:to-transparent" />
                </div>
              );
            })}

            {/* Content */}
            <div className="relative z-20 flex h-full min-h-[400px] items-end sm:min-h-[480px] lg:min-h-[560px]">
{/*               <div className="w-full p-4 pb-10 sm:p-6 sm:pb-10 lg:p-10 lg:pb-16"> */}
              <div className="w-full p-6 pb-10 sm:pb-12 lg:p-10 lg:pb-16">

                <div key={current} className="max-w-xl animate-fade-in-up">

                    {/* ✅ عنوان — یک پله کوچک‌تر */}
                    <h1 className="mb-3 text-2xl font-black leading-[1.2] tracking-tight text-foreground dark:text-white sm:mb-4 sm:text-3xl md:text-4xl lg:text-5xl">
                      {active.title}
                    </h1>

                    {/* subtitle */}
                    {active.subtitle && (
                      <div className="mb-5 sm:mb-7 inline-flex items-center gap-2 rounded-2xl border border-black/5 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-neutral-900 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-white/10 dark:text-white sm:px-4 sm:py-2 sm:text-sm">
                        <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-300 sm:h-4 sm:w-4" />
                        <span className="leading-relaxed">{active.subtitle}</span>
                      </div>
                    )}

                    {/* دکمه‌ها */}
                    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                      {active.link && (
                        <Button
                          asChild
                          size="lg"
                          className="group h-10 rounded-2xl bg-neutral-900 px-5 text-xs font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-white/95 sm:h-12 sm:px-7 sm:text-base"
                        >
                          <Link to={active.link} className="flex items-center gap-2">
                            {active.button_text || 'مشاهده محصولات'}
                            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                          </Link>
                        </Button>
                      )}
                      <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="h-10 rounded-2xl border-border/60 bg-white/60 px-5 text-xs font-bold backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/90 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:h-12 sm:px-7 sm:text-base"
                      >
                        <Link to="/new-arrivals">کالکشن جدید</Link>
                      </Button>
                    </div>
                </div>
              </div>
            </div>

            {/* Nav arrows */}
            {slides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  className="group absolute right-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl border border-black/5 bg-white/70 text-foreground shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:right-5 sm:h-11 sm:w-11"
                  aria-label="اسلاید قبلی"
                >
                  <ChevronRight className="h-5 w-5 transition-transform group-hover:scale-110" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="group absolute left-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl border border-black/5 bg-white/70 text-foreground shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:left-5 sm:h-11 sm:w-11"
                  aria-label="اسلاید بعدی"
                >
                  <ChevronLeft className="h-5 w-5 transition-transform group-hover:scale-110" />
                </button>
                {/* ✅ dot ها — حالا پایینِ خود بنر (چون strip دیگه روی بنر نیست) */}
                <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 sm:bottom-6">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => goTo(idx)}
                      className="group relative h-1.5 overflow-hidden rounded-full transition-all duration-500"
                      style={{ width: idx === current ? 28 : 7 }}
                      aria-label={`اسلاید ${idx + 1}`}
                      aria-current={idx === current}
                    >
                      <span
                        className={`absolute inset-0 rounded-full transition-colors ${
                          idx === current
                            ? 'bg-neutral-900 dark:bg-white'
                            : 'bg-neutral-900/25 group-hover:bg-neutral-900/50 dark:bg-white/35 dark:group-hover:bg-white/60'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ✅ نوار ویژگی‌ها — حالا زیر بنر (جدا از کارت بنر) */}
        <div className="relative z-10 mt-3 sm:mt-5">
          <div className="overflow-hidden rounded-xl border border-black/5 bg-white/80 shadow-lg shadow-black/[0.04] backdrop-blur-2xl dark:border-white/15 dark:bg-neutral-900/80 dark:shadow-black/30 sm:rounded-2xl">
            {/* موبایل: گرید ۲×۲ | دسکتاپ: ۴ ستون */}
            <div className="grid grid-cols-2 divide-x divide-y divide-neutral-200/70 dark:divide-white/10 sm:grid-cols-4 sm:divide-y-0">
              {stripFeatures.map((f) => {
                const IconComp = DEFAULT_FEATURE_ICONS[f.icon] || Truck;
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-2 px-2.5 py-2.5 sm:justify-center sm:gap-3 sm:px-5 sm:py-4"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${
                        f.bg_color || 'bg-neutral-900/10 dark:bg-white/10'
                      }`}
                    >
                      <IconComp
                        className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                          f.color || 'text-neutral-700 dark:text-white'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 text-right sm:text-center">
                      <p className="truncate text-xs font-bold tracking-tight text-neutral-900 dark:text-white sm:text-sm">
                        {f.title}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-neutral-900/70 dark:text-white/70 sm:text-xs">
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
    </section>
  );
};

export default BannerSlider;