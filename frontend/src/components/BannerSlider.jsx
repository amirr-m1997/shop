import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from './ui/Button';

const BannerSlider = ({ banners = [] }) => {
  const slides = banners;
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (slides.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
      }, 5000);
    }
  };

  useEffect(() => {
    setCurrent(0);
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length]);

  const next = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
    startTimer();
  };

  const prev = () => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
    startTimer();
  };

  const goTo = (idx) => {
    setCurrent(idx);
    startTimer();
  };

  return (
    <section
      className="relative h-[420px] sm:h-[520px] md:h-[600px] overflow-hidden"
      onMouseEnter={() => { if (timerRef.current) clearInterval(timerRef.current); }}
      onMouseLeave={startTimer}
    >
      {slides.map((banner, index) => (
        <div
          key={banner.id ?? index}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/40 to-black/20 z-10" />
          <img
            src={banner.image}
            alt={banner.title}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <div className="relative z-20 h-full flex items-center justify-center text-center text-white px-4">
            <div className="max-w-3xl">
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-black mb-4 sm:mb-6 leading-tight">
                {banner.title}
              </h1>
              {banner.subtitle && (
                <p className="text-base sm:text-xl md:text-2xl mb-6 sm:mb-8 opacity-90">
                  {banner.subtitle}
                </p>
              )}
              <div className="flex gap-3 sm:gap-4 justify-center flex-wrap">
                {banner.link && (
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-foreground/50 text-foreground hover:text-white hover:bg-white/10 dark:border-current dark:text-current dark:hover:bg-foreground/10"
                  >
                    <Link to={banner.link}>{banner.button_text || 'خرید کنید'}</Link>
                  </Button>
                )}
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-foreground/50 text-foreground hover:text-white hover:bg-white/10 dark:border-current dark:text-current dark:hover:bg-foreground/10"
                >
                  <Link to="/new-arrivals">جدیدترین‌ها</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="قبلی"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 h-10 w-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
            aria-label="بعدی"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goTo(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === current ? 'w-7 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`اسلاید ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default BannerSlider;
