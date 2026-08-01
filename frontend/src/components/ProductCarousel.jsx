import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import ProductCard from './ProductCard';

/* Map filter-type tokens → real CSS colors */
const ACCENT_MAP = {
  destructive: '#ef4444',
  'red-500': '#ef4444',
  'blue-500': '#3b82f6',
  'amber-500': '#f59e0b',
  'purple-500': '#a855f7',
  'green-500': '#22c55e',
  'cyan-500': '#06b6d4',
  primary: 'hsl(var(--primary))',
};

const resolveAccent = (accent) => ACCENT_MAP[accent] || accent || 'hsl(var(--primary))';

/* ─── Carousel ─── */
const ProductCarousel = ({
  title,
  subtitle,
  products,
  viewAllLink,
  accentColor = 'primary',
}) => {
  const accent = resolveAccent(accentColor);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(4);
  const containerRef = useRef(null);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setVisibleCount(1);
      else if (w < 768) setVisibleCount(2);
      else if (w < 1024) setVisibleCount(3);
      else setVisibleCount(4);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const maxSlide = Math.max(0, products.length - visibleCount);
  const next = useCallback(
    () => setCurrent((prev) => (prev >= maxSlide ? 0 : prev + 1)),
    [maxSlide]
  );
  const prev = useCallback(
    () => setCurrent((prev) => (prev <= 0 ? maxSlide : prev - 1)),
    [maxSlide]
  );

  useEffect(() => {
    if (paused || products.length <= visibleCount) return;
    const t = setInterval(next, 4500);
    return () => clearInterval(t);
  }, [paused, next, products.length, visibleCount]);

  if (!products || products.length === 0) return null;

  const GAP = 16;

  return (
    <section
      className="relative py-10 sm:py-14"
      dir="rtl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="mb-7 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2.5">
              <div
                className="h-8 w-1.5 rounded-full"
                style={{ background: accent }}
              />
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: accent }}
              >
                مجموعه
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {maxSlide > 0 && (
              <div className="flex items-center gap-1.5 rounded-2xl border border-border/50 bg-card/70 p-1 shadow-sm backdrop-blur-sm">
                <button
                  type="button"
                  onClick={prev}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-foreground transition-all hover:bg-muted active:scale-95"
                  aria-label="قبلی"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-foreground transition-all hover:bg-muted active:scale-95"
                  aria-label="بعدی"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            )}
            {viewAllLink && (
              <Link
                to={viewAllLink}
                className="group inline-flex h-11 items-center gap-1.5 rounded-2xl border border-border/50 bg-card/70 px-4 text-sm font-bold shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-primary/30 hover:shadow-md"
                style={{ color: accent }}
              >
                نمایش همه
                <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Track */}
        <div className="overflow-hidden" ref={containerRef}>
          <div
            className="flex transition-transform duration-600 ease-out"
            style={{
              gap: `${GAP}px`,
              transform: `translateX(calc(${current} * (100% / ${visibleCount} + ${GAP / visibleCount}px)))`,
            }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="shrink-0"
                style={{
                  width: `calc((100% - ${GAP * (visibleCount - 1)}px) / ${visibleCount})`,
                }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>

        {/* Progress dots */}
        {maxSlide > 0 && (
          <div className="mt-6 flex items-center justify-center gap-1.5">
            {Array.from({ length: maxSlide + 1 }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrent(idx)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: idx === current ? 28 : 6,
                  background:
                    idx === current
                      ? accent
                      : 'hsl(var(--muted-foreground) / 0.25)',
                }}
                aria-label={`صفحه ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductCarousel;
