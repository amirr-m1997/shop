import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

/**
 * Permanent 3D pose for each offset from the active (center) card.
 * Depth comes from translateZ / scale / rotation — not shadows alone.
 *
 * depthFactor:
 *   1.0  → desktop full cinematic depth
 *   0.55 → tablet reduced depth
 *   ~0.4 → mobile compact depth
 *
 * base: per-offset fan spacing in px (mobile uses a tighter fan).
 */
const getPose = (offset, depthFactor = 1, base = 145) => {
  const abs = Math.abs(offset);
  const d = depthFactor;

  // Fan spacing — tighter overlap like the reference
  const x = offset * (base + 42 * d);
  // Arc: sides drop slightly (hand-of-cards)
  const y = abs * (14 + 8 * d);
  // Real depth: center toward camera, sides recede
  const z = abs === 0 ? 110 * d : -(abs * (150 + 55 * d));
  // Face toward center (left = +rotateY, right = −rotateY)
  const rotateY = -offset * (18 + 14 * d);
  const rotateX = abs * (2 + 2 * d);
  const rotateZ = offset * (1 + 0.8 * d);
  const scale = Math.max(0.58, 1 - abs * (0.11 + 0.05 * d));

  return { x, y, z, rotateY, rotateX, rotateZ, scale, abs };
};

/** Depth-aware multi-layer shadow */
const getShadow = (abs, isHovered, isDark) => {
  if (isDark) {
    if (abs === 0 || isHovered) {
      return '0 28px 60px -12px rgba(0,0,0,.55), 0 12px 28px -8px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.06)';
    }
    if (abs === 1) {
      return '0 18px 40px -14px rgba(0,0,0,.42), 0 8px 18px -8px rgba(0,0,0,.28)';
    }
    return '0 10px 28px -16px rgba(0,0,0,.32), 0 4px 12px -6px rgba(0,0,0,.2)';
  }
  if (abs === 0 || isHovered) {
    return '0 32px 64px -14px rgba(15,20,40,.28), 0 14px 32px -10px rgba(15,20,40,.16), 0 0 0 1px rgba(0,0,0,.04)';
  }
  if (abs === 1) {
    return '0 20px 44px -16px rgba(15,20,40,.18), 0 8px 20px -8px rgba(15,20,40,.1)';
  }
  return '0 12px 28px -18px rgba(15,20,40,.12), 0 4px 12px -6px rgba(15,20,40,.07)';
};

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const TRANSITION = `transform 650ms ${EASE}, box-shadow 450ms ${EASE}, filter 450ms ${EASE}, opacity 450ms ${EASE}`;

/*
 * Adaptive scene sizing so the fan fits on every screen.
 * Desktop / tablet keep the wide 5-card fan; mobile uses a compact
 * 3-card fan (bigger center, tight overlap). Falls back to fewer side
 * cards first, then compresses depth.
 */
const SCENE_TOLERANCE = 32;
const computeSceneParams = (width) => {
  const isDesktop = width >= 1024;
  const isTablet = width >= 768;
  const avail = Math.min(width - 32, 1120);

  let cardW, base, baseDepth, height;
  if (isDesktop) {
    cardW = 248;
    base = 145;
    baseDepth = 1;
    height = 580;
  } else if (isTablet) {
    cardW = 210;
    base = 145;
    baseDepth = 0.55;
    height = 500;
  } else {
    // Mobile 3D — prominent center card with side cards peeking
    cardW = Math.round(avail * 0.62);
    base = Math.round(cardW * 0.3);
    baseDepth = 0.5;
    height = Math.round(cardW * 1.33 + 175);
  }

  const fit = (half, d) =>
    2 * half * (base + 42 * d) + cardW <= avail + SCENE_TOLERANCE;

  let d = baseDepth;
  let half = isDesktop || isTablet ? 2 : 1;
  if (!fit(half, d)) {
    half = Math.max(1, half - 1);
    while (!fit(half, d) && d > 0.1) {
      d = Math.max(0.1, +(d - 0.1).toFixed(2));
    }
  }

  return { depthFactor: d, half, cardW, height, base };
};

/* ─── 3D Scene (all devices) ─── */
const Product3DScene = ({
  products,
  activeIndex,
  setActiveIndex,
  depthFactor,
  half,
  cardW,
  height,
  base,
}) => {
  const navigate = useNavigate();
  const [hoveredOffset, setHoveredOffset] = useState(null);
  const sceneRef = useRef(null);
  const dragStartX = useRef(null);
  const dragCurrentX = useRef(null);
  const isDragging = useRef(false);
  const ignoreClick = useRef(false);
  const clickTimer = useRef(null);
  const dragCleanupRef = useRef(null);
  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark');

  const count = products.length;
  const windowSize = Math.min(2 * half + 1, count);
  const h = Math.floor(windowSize / 2);

  const handlePointerDown = (e) => {
    if (count <= 1) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    isDragging.current = true;
    ignoreClick.current = false;
    dragStartX.current = e.clientX;
    dragCurrentX.current = e.clientX;
    if (sceneRef.current) sceneRef.current.style.cursor = 'grabbing';

    // Track the drag on window (NOT setPointerCapture, which redirects
    // clicks away from buttons/links and breaks card controls).
    dragCleanupRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    dragCurrentX.current = e.clientX;
  };

  const handlePointerUp = (e) => {
    if (!isDragging.current) return;

    const diff = dragCurrentX.current - dragStartX.current;

    dragCleanupRef.current?.();
    dragCleanupRef.current = null;
    isDragging.current = false;
    ignoreClick.current = false;
    if (sceneRef.current) sceneRef.current.style.cursor = 'grab';

    // Below the swipe threshold → this was a tap; the following "click"
    // re-centers the card (single click) or opens the product (double click).
    if (Math.abs(diff) < 50) return;

    // Real swipe → rotate one step, cancel any pending single-click, and
    // suppress the synthesized click so the drag never navigates anywhere.
    if (clickTimer.current) {
      clearTimeout(clickTimer.current.id);
      clickTimer.current = null;
    }
    ignoreClick.current = true;
    if (diff > 0) {
      setActiveIndex((prev) => (prev - 1 + count) % count);
    } else {
      setActiveIndex((prev) => (prev + 1) % count);
    }
  };

  const handlePointerCancel = () => {
    if (!isDragging.current) return;
    dragCleanupRef.current?.();
    dragCleanupRef.current = null;
    isDragging.current = false;
    dragStartX.current = null;
    dragCurrentX.current = null;
    if (sceneRef.current) sceneRef.current.style.cursor = 'grab';
  };

  // Drop any window drag listeners if the carousel unmounts mid-drag.
  useEffect(() => {
    return () => dragCleanupRef.current?.();
  }, []);

  // Single click → bring the card to the front. A second click on the same
  // card within the window → open the product details page directly.
const handleCardClick = (product, index, isCenter) => {

  // اگر کلیک قبلی هنوز منتظر است
  if (clickTimer.current) {

    // اگر همان کارت دوباره کلیک شد
    if (clickTimer.current.productId === product.id) {

      clearTimeout(clickTimer.current.timer);
      clickTimer.current = null;

      navigate(`/product/${product.slug}`);
      return;
    }


    // کارت جدید زده شده
    clearTimeout(clickTimer.current.timer);
    clickTimer.current = null;
  }


  // کلیک اول
  const timer = setTimeout(() => {

    clickTimer.current = null;


    // کارت وسط همان لحظه جزئیات باز شود
    if (isCenter) {
      navigate(`/product/${product.slug}`);
      return;
    }


    // کارت کناری بیاید وسط
    setActiveIndex(index);


  }, 250);


  clickTimer.current = {
    productId: product.id,
    timer
  };

};

  const visible = useMemo(() => {
    const items = [];
    if (count === 0) return items;
    for (let o = -h; o <= h; o++) {
      // Wrap indices so short lists still fill the fan
      let idx = activeIndex + o;
      idx = ((idx % count) + count) % count;
      // Never show the same product twice (short / even-count lists)
      if (items.some((it) => it.index === idx)) continue;
      items.push({ product: products[idx], offset: o, index: idx });
    }
    return items;
  }, [products, activeIndex, count, h]);

  return (
    <div
      ref={sceneRef}
      className="relative mx-auto w-full select-none touch-none cursor-grab"
      style={{
        perspective: '1200px',
        perspectiveOrigin: '50% 42%',
        height,
        maxWidth: 1120,
        // Allow rotated cards to paint outside without being clipped mid-fan
        overflow: 'visible',
      }}
      onPointerDown={handlePointerDown}
      onClickCapture={(e) => {
        // A swipe that rotated the fan also fires a synthesized "click"
        // afterwards. Swallow it in the capture phase (before ProductCard /
        // CTA / wishlist handlers run) so the drag never navigates anywhere.
        if (ignoreClick.current) {
          e.preventDefault();
          e.stopPropagation();
          ignoreClick.current = false;
        }
      }}
    >
      {/* Soft stage floor glow */}
      <div
        className="pointer-events-none absolute inset-x-[10%] bottom-[6%] h-24 rounded-[100%] opacity-60 blur-2xl"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse, rgba(255,255,255,.06), transparent 70%)'
            : 'radial-gradient(ellipse, rgba(15,20,40,.1), transparent 70%)',
        }}
        aria-hidden
      />

      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {visible.map(({ product, offset, index }) => {
          const pose = getPose(offset, depthFactor, base);
          const isCenter = offset === 0;
          const isHovered = hoveredOffset === offset;

          // Hover: pull card toward camera; neighbors react subtly
          let hoverZ = 0;
          let hoverScale = 0;
          let hoverY = 0;
          if (hoveredOffset !== null) {
            if (offset === hoveredOffset) {
              hoverZ = 70 * depthFactor;
              hoverScale = 0.04;
              hoverY = -8;
            } else if (Math.abs(offset - hoveredOffset) === 1) {
              hoverZ = -18 * depthFactor;
              hoverScale = -0.015;
              hoverY = 4;
            } else {
              hoverZ = -28 * depthFactor;
              hoverScale = -0.02;
            }
          }

          const tx = pose.x;
          const ty = pose.y + hoverY;
          const tz = pose.z + hoverZ;
          const sc = pose.scale + hoverScale;
          const zIndex = 50 - pose.abs * 10 + (isHovered ? 20 : 0) + (isCenter ? 5 : 0);

          return (
            <div
              // Stable per-product key: when a click changes the active card,
              // React keeps this DOM node and the CSS transform transition
              // animates it directly from its old pose into the new one.
              // (Keying by offset would remount every card and kill the
              // smooth direct-to-center animation.)
              key={product.id}
              role="button"
              tabIndex={0}
              aria-label={product.name}
              aria-current={isCenter ? 'true' : undefined}
              className="absolute cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              style={{
                width: cardW,
                left: '50%',
                top: '48%',
                transformStyle: 'preserve-3d',
                // Center origin first, then place in 3D space
                transform: [
                  'translate(-50%, -50%)',
                  `translateX(${tx}px)`,
                  `translateY(${ty}px)`,
                  `translateZ(${tz}px)`,
                  `rotateX(${pose.rotateX}deg)`,
                  `rotateY(${pose.rotateY}deg)`,
                  `rotateZ(${pose.rotateZ}deg)`,
                  `scale(${sc})`,
                ].join(' '),
                zIndex,
                transition: TRANSITION,
                filter:
                  pose.abs >= 2 && !isHovered
                    ? 'brightness(0.92)'
                    : 'brightness(1)',
              }}
              onMouseEnter={() => setHoveredOffset(offset)}
              onMouseLeave={() => setHoveredOffset(null)}
              onClick={(e) => {
                // Interactive children (CTA / wishlist) already stopPropagation.
                // The card's own link wrapper is excluded via data-product-card.
                // Single click → re-center; double click → product details.
                if (
                  e.target.closest(
                    'a:not([data-product-card]), button, input, select, textarea, [data-interactive]'
                  )
                ) {
                  return;
                }
                handleCardClick(product, index, isCenter);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!isCenter) setActiveIndex(index);
                }
              }}
            >
              {/* Shadow plane — separate from card so depth reads clearly */}
              <div
                className="pointer-events-none absolute -inset-1 rounded-[26px]"
                style={{
                  boxShadow: getShadow(pose.abs, isHovered, isDark),
                  transition: `box-shadow 450ms ${EASE}`,
                  transform: 'translateZ(-1px)',
                  opacity: 1,
                }}
                aria-hidden
              />

              <div
                className="relative h-full w-full"
                style={{
                  // Slight opacity falloff for far cards
                  opacity: pose.abs >= 2 ? 0.88 : 1,
                  transition: `opacity 450ms ${EASE}`,
                }}
              >
                <ProductCard
                  product={product}
                  layout="scene"
                  depth={pose.abs}
                  elevated={isCenter || isHovered}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Main export ─── */
const ProductCarousel = ({
  title,
  subtitle,
  products,
  viewAllLink,
  accentColor = 'primary',
}) => {
  const accent = resolveAccent(accentColor);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sceneParams, setSceneParams] = useState(() =>
    computeSceneParams(
      typeof window !== 'undefined' ? window.innerWidth : 1024
    )
  );

  useEffect(() => {
    const update = () => {
      setSceneParams(computeSceneParams(window.innerWidth));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const count = products?.length || 0;

  const next = useCallback(() => {
    if (count === 0) return;
    setActiveIndex((prev) => (prev + 1) % count);
  }, [count]);

  const prev = useCallback(() => {
    if (count === 0) return;
    setActiveIndex((prev) => (prev - 1 + count) % count);
  }, [count]);

  // Auto-rotate the 3D fan on every device (paused on hover / touch)
  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setInterval(next, 2400);
    return () => clearInterval(t);
  }, [paused, next, count]);

  if (!products || products.length === 0) return null;

  return (
    <section
      className="relative overflow-x-clip overflow-y-visible py-12 sm:py-16"
      dir="rtl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {/* Cinematic stage background — matches reference dark→light wash */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div
          className="absolute inset-0 opacity-90 dark:opacity-100"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--muted) / 0.55) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 50% 100%, hsl(var(--background)) 0%, transparent 55%)',
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[55%]"
          style={{
            background:
              'linear-gradient(180deg, hsl(220 15% 12% / 0.06) 0%, transparent 100%)',
          }}
        />
      </div>

      <div className="container relative mx-auto px-4">
        {/* Section header — centered like the reference */}
        <div className="mb-8 flex flex-col items-center text-center sm:mb-10">
          <div className="mb-3 flex items-center gap-2.5">
            <div
              className="h-1.5 w-8 rounded-full"
              style={{ background: accent }}
            />
            <span
              className="text-xs font-bold uppercase tracking-[0.2em]"
              style={{ color: accent }}
            >
              مجموعه
            </span>
            <div
              className="h-1.5 w-8 rounded-full"
              style={{ background: accent }}
            />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              {subtitle}
            </p>
          )}
        </div>

        {/* ── 3D scene — all devices ── */}
        <Product3DScene
          products={products}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          depthFactor={sceneParams.depthFactor}
          half={sceneParams.half}
          cardW={sceneParams.cardW}
          height={sceneParams.height}
          base={sceneParams.base}
        />

        {/* Nav controls under the stage */}
        {count > 1 && (
          <div className="mt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={prev}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/80 text-foreground shadow-sm backdrop-blur-sm transition-all hover:bg-muted active:scale-95"
              aria-label="قبلی"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              {products.slice(0, Math.min(count, 8)).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: idx === activeIndex ? 24 : 6,
                    background:
                      idx === activeIndex
                        ? accent
                        : 'hsl(var(--muted-foreground) / 0.28)',
                  }}
                  aria-label={`محصول ${idx + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={next}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/80 text-foreground shadow-sm backdrop-blur-sm transition-all hover:bg-muted active:scale-95"
              aria-label="بعدی"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* View-all pill — matches reference */}
        {viewAllLink && (
          <div className="mt-8 flex justify-center sm:mt-10">
            <Link
              to={viewAllLink}
              className="group inline-flex h-12 items-center gap-2 rounded-full border border-border/50 bg-card/90 px-6 text-sm font-bold shadow-md backdrop-blur-md transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
              style={{ color: accent }}
            >
              مشاهده همه محصولات
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductCarousel;
