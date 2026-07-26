import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowLeft, Star } from 'lucide-react';
import { formatPrice } from '../lib/formatPrice';
import WishlistButton from './WishlistButton';
import ShareButton from './ShareButton';

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

/* ─── Premium Product Card ─── */
const ProductCard = ({ product }) => {
  const imageUrl =
    product.primary_image ||
    product.images?.[0]?.image ||
    'https://via.placeholder.com/400x500?text=No+Image';

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-border/50 bg-card/80 shadow-sm shadow-black/[0.03] backdrop-blur-sm transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/[0.07]"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/400x500?text=No+Image';
          }}
        />
        {/* Soft bottom fade */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        {/* Shine sweep */}
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

        {product.discount_percentage > 0 && (
          <span className="absolute left-3 top-3 z-10 rounded-xl bg-destructive px-2.5 py-1 text-[11px] font-black text-destructive-foreground shadow-lg shadow-destructive/30">
            −{product.discount_percentage}٪
          </span>
        )}

        <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <WishlistButton productId={product.id} />
          <ShareButton product={product} />
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <h3 className="line-clamp-1 text-sm font-bold leading-snug tracking-tight transition-colors group-hover:text-primary">
          {product.name}
        </h3>

        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-semibold tabular-nums">
            {product.rating || '0.00'}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap items-baseline gap-2 pt-2.5">
          <span className="text-sm font-black tabular-nums tracking-tight">
            {formatPrice(product.price)}
          </span>
          {product.compare_price && (
            <span className="text-xs font-medium text-red-500/80 line-through tabular-nums">
              {formatPrice(product.compare_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

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
                className="text-[11px] font-bold uppercase tracking-[0.18em]"
                style={{ color: accent }}
              >
                مجموعه
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
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

        {/* Progress dots (mobile-friendly) */}
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
