import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft, ArrowLeft, Sparkles, MousePointer2 } from 'lucide-react';
import { Button } from './ui/Button';

/**
 * Cinematic hero slider — preserves all banner data & links.
 * Layered depth, glass CTAs, progress dots, scroll cue.
 */
const BannerSlider = ({ banners = [] }) => {
  const slides = banners;
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  const timerRef = useRef(null);
  const sectionRef = useRef(null);

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

  const handleMouseMove = (e) => {
    if (!sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    setMouse({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  };

  if (!slides.length) return null;

  const active = slides[current];

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => {
        if (timerRef.current) clearInterval(timerRef.current);
      }}
      onMouseLeave={startTimer}
      className="relative h-[min(92vh,780px)] min-h-[480px] overflow-hidden bg-neutral-950"
      aria-roledescription="carousel"
      aria-label="بنرهای اصلی"
    >
      {/* Ambient parallax orbs (mouse-reactive) */}
      <div
        className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute h-[40rem] w-[40rem] rounded-full bg-violet-500/20 blur-[100px] transition-transform duration-700 ease-out"
          style={{
            top: `${-10 + mouse.y * 12}%`,
            right: `${-15 + mouse.x * 10}%`,
            transform: `translate(${(mouse.x - 0.5) * 40}px, ${(mouse.y - 0.5) * 30}px)`,
          }}
        />
        <div
          className="absolute h-[28rem] w-[28rem] rounded-full bg-blue-500/15 blur-[90px] transition-transform duration-700 ease-out"
          style={{
            bottom: `${-5 + (1 - mouse.y) * 10}%`,
            left: `${-10 + (1 - mouse.x) * 12}%`,
            transform: `translate(${(mouse.x - 0.5) * -30}px, ${(mouse.y - 0.5) * -20}px)`,
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.45)_100%)]" />
      </div>

      {/* Slides */}
      {slides.map((banner, index) => {
        const isActive = index === current;
        return (
          <div
            key={banner.id ?? index}
            className={`absolute inset-0 transition-all duration-1000 ease-out ${
              isActive ? 'z-10 opacity-100 scale-100' : 'z-0 opacity-0 scale-105'
            }`}
            aria-hidden={!isActive}
          >
            {/* Ken Burns image */}
            <img
              src={banner.image}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover transition-transform ease-out ${
                isActive ? 'scale-110' : 'scale-100'
              }`}
              style={{ transitionDuration: '8s' }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            {/* Multi-stop cinematic gradient */}
            <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/90 via-black/45 to-black/25" />
            <div className="absolute inset-0 z-[1] bg-gradient-to-l from-black/50 via-transparent to-black/40" />
          </div>
        );
      })}

      {/* Content */}
      <div className="relative z-20 flex h-full items-end pb-20 sm:items-center sm:pb-0">
        <div className="container mx-auto px-4 sm:px-6">
          <div
            key={current}
            className="max-w-2xl animate-fade-in-up"
          >
            {/* Eyebrow */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 shadow-lg backdrop-blur-md sm:mb-5">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span className="tracking-wide">
                {slides.length > 1
                  ? `${(current + 1).toLocaleString('fa-IR')} / ${slides.length.toLocaleString('fa-IR')}`
                  : 'مجموعه ویژه'}
              </span>
            </div>

            <h1 className="mb-4 text-4xl font-black leading-[1.1] tracking-tight text-white drop-shadow-sm sm:mb-5 sm:text-5xl md:text-6xl lg:text-7xl">
              {active.title}
            </h1>

            {active.subtitle && (
              <p className="mb-7 max-w-lg text-base leading-relaxed text-white/80 sm:mb-9 sm:text-lg md:text-xl">
                {active.subtitle}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {active.link && (
                <Button
                  asChild
                  size="lg"
                  className="group h-12 rounded-2xl bg-white px-7 text-base font-bold text-neutral-900 shadow-xl shadow-black/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/95 hover:shadow-2xl sm:h-13 sm:px-8"
                >
                  <Link to={active.link} className="flex items-center gap-2">
                    {active.button_text || 'خرید کنید'}
                    <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                  </Link>
                </Button>
              )}
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-2xl border-white/25 bg-white/10 px-7 text-base font-bold text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 hover:text-white sm:h-13 sm:px-8"
              >
                <Link to="/new-arrivals">جدیدترین‌ها</Link>
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
            className="group absolute right-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-white/20 sm:right-6 sm:h-12 sm:w-12"
            aria-label="اسلاید قبلی"
          >
            <ChevronRight className="h-5 w-5 transition-transform group-hover:scale-110" />
          </button>
          <button
            type="button"
            onClick={next}
            className="group absolute left-3 top-1/2 z-30 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:bg-white/20 sm:left-6 sm:h-12 sm:w-12"
            aria-label="اسلاید بعدی"
          >
            <ChevronLeft className="h-5 w-5 transition-transform group-hover:scale-110" />
          </button>

          {/* Progress indicators */}
          <div className="absolute bottom-8 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 sm:bottom-10">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => goTo(idx)}
                className="group relative h-2 overflow-hidden rounded-full transition-all duration-500"
                style={{ width: idx === current ? 36 : 8 }}
                aria-label={`اسلاید ${idx + 1}`}
                aria-current={idx === current}
              >
                <span
                  className={`absolute inset-0 rounded-full transition-colors ${
                    idx === current ? 'bg-white' : 'bg-white/40 group-hover:bg-white/70'
                  }`}
                />
                {idx === current && (
                  <span className="absolute inset-y-0 right-0 w-full origin-right animate-[heroProgress_6s_linear] rounded-full bg-white/40" />
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Scroll indicator */}
      <button
        type="button"
        onClick={() => {
          const h = sectionRef.current?.offsetHeight;
          if (h) window.scrollTo({ top: h, behavior: 'smooth' });
        }}
        className="absolute bottom-8 right-6 z-30 hidden flex-col items-center gap-2 text-white/50 transition-colors hover:text-white/80 sm:flex"
        aria-label="اسکرول به پایین"
      >
        <span className="text-[10px] font-medium tracking-widest [writing-mode:vertical-rl]">
          اسکرول
        </span>
        <div className="flex h-10 w-6 items-start justify-center rounded-full border border-white/25 p-1.5">
          <div className="h-2 w-1 animate-bounce rounded-full bg-white/70" />
        </div>
      </button>

      {/* Decorative corner mark */}
      <div className="pointer-events-none absolute left-6 top-6 z-20 hidden items-center gap-2 text-white/40 sm:flex" aria-hidden>
        <MousePointer2 className="h-3.5 w-3.5" />
        <span className="text-[10px] font-medium tracking-wider">تجربه تعاملی</span>
      </div>
    </section>
  );
};

export default BannerSlider;
