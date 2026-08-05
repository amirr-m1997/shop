import React, { useRef, useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart } from 'lucide-react';
import { formatPrice } from '../lib/formatPrice';
import { PLACEHOLDER_IMG } from '../lib/placeholders';
import WishlistButton from './WishlistButton';
import ShareButton from './ShareButton';

const MAX_TILT = 6;
const HOVER_Y = -10;
const HOVER_SCALE = 1.02;
const TRANSITION_MS = 350;

const MOBILE_HOVER_Y = -6;
const MOBILE_HOVER_SCALE = 1.01;

const IS_FINE_POINTER =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/**
 * Product card.
 *
 * layout="default" — standalone grid card with soft hover tilt
 * layout="scene"   — flat content for 3D parent composition
 *                    (no internal perspective/tilt — parent owns transforms)
 */
const ProductCard = ({
  product,
  onNavigate,
  className = '',
  size = 'default',
  layout = 'default',
  depth = 0,
  elevated = false,
}) => {
  const isScene = layout === 'scene';
  const navigate = useNavigate();
  const cardRef = useRef(null);
  const rafRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const goToProduct = useCallback(() => {
    if (!product?.slug) return;
    const path = `/product/${product.slug}`;
    if (onNavigate) onNavigate(path);
    else navigate(path);
  }, [product?.slug, onNavigate, navigate]);

  const imageUrl =
    product.primary_image ||
    product.images?.[0]?.image ||
    PLACEHOLDER_IMG;

  const isNew = product.is_new_arrival;
  const hasDiscount = product.discount_percentage > 0;
  // Safe fallback: if the stock field is missing, treat the product as available.
  const inStock = (product.stock ?? 1) > 0;
  const isLarge = size === 'large';
  const active = isScene ? elevated : isHovered;

  /* ── Single transform pipeline (default layout only) ─ */
  const buildTransform = useCallback((rx, ry, hoverActive) => {
    if (isScene) return 'none';
    const hoverY = IS_FINE_POINTER ? HOVER_Y : MOBILE_HOVER_Y;
    const scale = IS_FINE_POINTER ? HOVER_SCALE : MOBILE_HOVER_SCALE;
    const ty = hoverActive ? hoverY : 0;
    const sx = hoverActive ? scale : 1;
    const rxDeg = hoverActive ? rx : 0;
    const ryDeg = hoverActive ? ry : 0;
    return `perspective(800px) translateY(${ty}px) scale(${sx}) rotateX(${rxDeg}deg) rotateY(${ryDeg}deg)`;
  }, [isScene]);

  const handleMouseMove = useCallback((e) => {
    if (isScene || !IS_FINE_POINTER) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = cardRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;
      const x = px / 100;
      const y = py / 100;

      el.style.setProperty('--mouse-x', `${px.toFixed(2)}%`);
      el.style.setProperty('--mouse-y', `${py.toFixed(2)}%`);

      const rotateY = (x - 0.5) * MAX_TILT * 2;
      const rotateX = (0.5 - y) * MAX_TILT * 2;
      el.style.transform = buildTransform(rotateX, rotateY, true);
      el.style.transition = 'none';
    });
  }, [buildTransform, isScene]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (isScene || !cardRef.current) return;
    cardRef.current.style.transition = `transform ${TRANSITION_MS}ms cubic-bezier(.23,1,.32,1), box-shadow ${TRANSITION_MS}ms cubic-bezier(.23,1,.32,1)`;
    cardRef.current.style.transform = buildTransform(0, 0, true);
  }, [buildTransform, isScene]);

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsHovered(false);
    if (isScene || !cardRef.current) return;
    cardRef.current.style.transform = buildTransform(0, 0, false);
    cardRef.current.style.transition = `transform ${TRANSITION_MS}ms cubic-bezier(.23,1,.32,1), box-shadow ${TRANSITION_MS}ms cubic-bezier(.23,1,.32,1)`;
  }, [buildTransform, isScene]);

  const handleClick = (e) => {
    if (onNavigate) {
      e.preventDefault();
      e.stopPropagation();
      goToProduct();
    }
  };

  /* ── Shadows ─────────────────────────────────────── */
  const shadowRest = IS_FINE_POINTER
    ? '0 1px 2px rgba(120,100,60,.04), 0 4px 12px rgba(120,100,60,.06), 0 12px 28px -6px rgba(120,100,60,.08), inset 0 1px 0 0 rgba(255,255,255,.45)'
    : '0 1px 2px rgba(120,100,60,.03), 0 3px 8px rgba(120,100,60,.04), 0 8px 20px -6px rgba(120,100,60,.05), inset 0 1px 0 0 rgba(255,255,255,.4)';
  const shadowDarkRest = IS_FINE_POINTER
    ? '0 1px 2px rgba(60,80,140,.08), 0 4px 12px rgba(40,50,100,.12), 0 12px 28px -6px rgba(20,30,80,.20), inset 0 1px 0 0 rgba(255,255,255,.06)'
    : '0 1px 2px rgba(60,80,140,.06), 0 3px 8px rgba(40,50,100,.08), 0 8px 20px -6px rgba(20,30,80,.12), inset 0 1px 0 0 rgba(255,255,255,.05)';
  const shadowHover = IS_FINE_POINTER
    ? '0 2px 4px rgba(120,100,60,.05), 0 8px 24px rgba(120,100,60,.10), 0 24px 56px -12px rgba(120,100,60,.16), inset 0 1px 0 0 rgba(255,255,255,.5)'
    : '0 1px 3px rgba(120,100,60,.04), 0 6px 16px rgba(120,100,60,.07), 0 14px 32px -10px rgba(120,100,60,.10), inset 0 1px 0 0 rgba(255,255,255,.45)';
  const shadowDarkHover = IS_FINE_POINTER
    ? '0 2px 4px rgba(60,80,140,.10), 0 8px 24px rgba(40,50,100,.18), 0 24px 56px -12px rgba(20,30,80,.32), inset 0 1px 0 0 rgba(255,255,255,.08)'
    : '0 1px 3px rgba(60,80,140,.07), 0 6px 16px rgba(40,50,100,.11), 0 14px 32px -10px rgba(20,30,80,.18), inset 0 1px 0 0 rgba(255,255,255,.07)';

  // Scene layout: parent casts depth shadows; card only needs a light surface edge
  const sceneShadow =
    depth === 0 || elevated
      ? 'inset 0 1px 0 0 rgba(255,255,255,.55), 0 0 0 1px rgba(255,255,255,.35)'
      : depth === 1
        ? 'inset 0 1px 0 0 rgba(255,255,255,.4), 0 0 0 1px rgba(0,0,0,.03)'
        : 'inset 0 1px 0 0 rgba(255,255,255,.3), 0 0 0 1px rgba(0,0,0,.04)';

  const imgShadowRest = IS_FINE_POINTER
    ? '0 4px 16px -2px rgba(0,0,0,.10)'
    : '0 3px 10px -2px rgba(0,0,0,.08)';
  const imgShadowHover = IS_FINE_POINTER
    ? '0 8px 28px -4px rgba(0,0,0,.18)'
    : '0 6px 18px -4px rgba(0,0,0,.13)';

  const isDark =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark');

  const outerStyle = isScene
    ? {
        // Parent owns all 3D transforms — never write transform here
        willChange: 'auto',
      }
    : {
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        transform: buildTransform(0, 0, isHovered),
        transition: isHovered
          ? `box-shadow ${TRANSITION_MS}ms cubic-bezier(.23,1,.32,1)`
          : `transform ${TRANSITION_MS}ms cubic-bezier(.23,1,.32,1), box-shadow ${TRANSITION_MS}ms cubic-bezier(.23,1,.32,1)`,
      };

  const colors = product.available_colors || [];

  /* ── Content ─────────────────────────────────────── */
  const inner = (
    <>
      {/* ═══ IMAGE LAYER ═══ */}
      <div
        className={`relative mx-2.5 mt-2.5 overflow-hidden rounded-2xl ${
          isLarge || isScene ? 'aspect-[3/4]' : 'aspect-[3/4]'
        }`}
        style={{
          boxShadow: active ? imgShadowHover : imgShadowRest,
          transition: `box-shadow ${TRANSITION_MS}ms cubic-bezier(.23,1,.32,1), transform ${TRANSITION_MS}ms cubic-bezier(.23,1,.32,1)`,
          transform:
            !isScene && active
              ? IS_FINE_POINTER
                ? 'translateY(-3px) scale(1.01)'
                : 'translateY(-2px) scale(1.005)'
              : 'translateY(0) scale(1)',
          zIndex: 2,
        }}
      >
        <img
          src={imageUrl}
          alt={`${product.name} - فروشگاه مد`}
          className="h-full w-full object-cover"
          loading="lazy"
          draggable={false}
          onError={(e) => {
            e.target.src = PLACEHOLDER_IMG;
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"
          style={{ opacity: active ? 1 : 0, transition: 'opacity 500ms ease' }}
        />

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
          style={{
            transform: active ? 'translateX(100%)' : 'translateX(-100%)',
            transition: 'transform 900ms ease-out',
          }}
        />

        {/* Badges */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {hasDiscount && (
            <span
              className="rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wide text-white"
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                boxShadow:
                  '0 2px 6px rgba(185,28,28,.35), inset 0 1px 0 rgba(255,255,255,.2), inset 0 -1px 0 rgba(0,0,0,.15)',
              }}
            >
              −{product.discount_percentage}٪
            </span>
          )}
          {isNew && (
            <span
              className="rounded-full px-3 py-1 text-[11px] font-extrabold tracking-wide text-white"
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                boxShadow:
                  '0 2px 6px rgba(22,163,74,.35), inset 0 1px 0 rgba(255,255,255,.2), inset 0 -1px 0 rgba(0,0,0,.15)',
              }}
            >
              جدید
            </span>
          )}
          {!inStock && (
            <span
              className="rounded-full bg-black/70 px-3 py-1 text-[11px] font-extrabold tracking-wide text-white backdrop-blur-sm"
              style={{
                boxShadow:
                  '0 2px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.15)',
              }}
            >
              ناموجود
            </span>
          )}
        </div>

        {/* Wishlist + Share — always visible in scene (reference style) */}
        <div
          className="absolute right-3 top-3 z-10 flex flex-col gap-2"
          style={
            isScene
              ? undefined
              : {
                  opacity: isHovered ? 1 : 0,
                  transform: isHovered ? 'translateY(0)' : 'translateY(-4px)',
                  transition: `all ${TRANSITION_MS}ms cubic-bezier(.23,1,.32,1)`,
                }
          }
        >
          <WishlistButton
            productId={product.id}
            className="!relative !top-0 !right-0 h-9 w-9 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md shadow-sm"
          />
          <ShareButton
            product={product}
            className="!relative !bottom-0 !right-0"
            inline={false}
            openUp={false}
          />
        </div>
      </div>

      {/* ═══ CONTENT LAYER ═══ */}
      <div
        className={`relative z-10 flex flex-1 flex-col ${
          isScene ? 'px-3.5 pt-2.5 pb-3.5' : 'px-4 pt-3 pb-4'
        }`}
      >
        {product.category_name && !isScene && (
          <span className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            {product.category_name}
          </span>
        )}

        <h3
          className={`font-bold leading-snug tracking-tight line-clamp-1 text-foreground ${
            isLarge || isScene ? 'text-[14px]' : 'text-sm'
          }`}
        >
          {product.name}
        </h3>

        {/* Rating + availability (all layouts) */}
        <div className="mt-1.5">
          <div className="flex min-w-0 items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 shrink-0 ${
                  i < Math.floor(product.rating || 0)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-muted-foreground/25'
                }`}
              />
            ))}
            {product.review_count > 0 && (
              <span className="whitespace-nowrap text-[10px] tabular-nums text-muted-foreground/70">
                ({product.review_count.toLocaleString('fa-IR')})
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                inStock ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            <span
              className={`text-[11px] font-semibold ${
                inStock
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-500 dark:text-red-400'
              }`}
            >
              {inStock ? 'موجود' : 'ناموجود'}
            </span>
          </div>
        </div>

        {/* Color swatches (scene / reference style) */}
        {isScene && colors.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            {colors.slice(0, 5).map((c) => (
              <span
                key={c.id}
                className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10"
                style={{ background: c.hex_code || '#ccc' }}
                title={c.name}
              />
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Price */}
        <div className={`flex items-baseline gap-2 ${isScene ? 'mt-2' : 'mt-3'}`}>
          <span
            className={`tabular-nums tracking-tight text-foreground ${
              hasDiscount ? 'text-[15px] font-extrabold' : 'text-[15px] font-bold'
            }`}
          >
            {formatPrice(product.price)}
          </span>
          {hasDiscount && product.compare_price && (
            <span className="text-xs tabular-nums text-red-500/70 line-through dark:text-red-400/70">
              {formatPrice(product.compare_price)}
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            goToProduct();
          }}
          className={`mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
            isScene
              ? 'bg-foreground py-2.5 text-background'
              : 'px-4 py-2.5 text-primary-foreground'
          }`}
          style={
            isScene
              ? {
                  boxShadow: active
                    ? '0 4px 14px -2px rgba(0,0,0,.25)'
                    : '0 2px 8px -2px rgba(0,0,0,.15)',
                  transition: `all ${TRANSITION_MS}ms cubic-bezier(.23,1,.32,1)`,
                }
              : {
                  background:
                    'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/.9) 100%)',
                  boxShadow: active
                    ? '0 4px 14px -2px hsl(var(--primary)/.35), 0 1px 3px hsl(var(--primary)/.2), inset 0 1px 0 rgba(255,255,255,.15)'
                    : '0 2px 8px -2px hsl(var(--primary)/.25), 0 1px 2px hsl(var(--primary)/.15), inset 0 1px 0 rgba(255,255,255,.1)',
                  transform: active ? 'translateY(-1px)' : 'translateY(0)',
                  transition: `all ${TRANSITION_MS}ms cubic-bezier(.23,1,.32,1)`,
                }
          }
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>جزئیات محصول</span>
        </button>
      </div>
    </>
  );

  const outerClass = [
    'relative flex h-full flex-col overflow-hidden',
    'rounded-[22px]',
    isScene
      ? 'border border-black/[0.06] dark:border-white/[0.1]'
      : 'border border-white/40 dark:border-white/[0.08]',
    !isScene && IS_FINE_POINTER ? 'backdrop-blur-sm' : '',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const bgStyle = {
    background: isScene
      ? 'linear-gradient(180deg, #ffffff 0%, #f7f7f8 100%)'
      : 'linear-gradient(165deg, hsl(var(--card)) 0%, hsl(var(--card)/.95) 40%, hsl(var(--muted)/.25) 100%)',
    boxShadow: isScene
      ? sceneShadow
      : active
        ? isDark
          ? shadowDarkHover
          : shadowHover
        : isDark
          ? shadowDarkRest
          : shadowRest,
    transition: `box-shadow ${TRANSITION_MS}ms cubic-bezier(.23,1,.32,1)`,
  };

  // Dark mode surface for scene cards
  const darkSceneBg = isScene && isDark
    ? {
        background: 'linear-gradient(180deg, hsl(240 6% 12%) 0%, hsl(240 6% 10%) 100%)',
      }
    : null;

  // Scene side-cards pass no onNavigate (parent re-centers). Mobile scene
  // cards and default cards use Link. Center scene card uses onNavigate.
  const Wrapper = onNavigate ? 'div' : Link;
  const wrapperProps = onNavigate
    ? {
        role: 'link',
        tabIndex: 0,
        onClick: handleClick,
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick(e);
        },
        className: `${outerClass} cursor-pointer`,
        'data-product-card': true,
        'data-layout': layout,
      }
    : {
        to: `/product/${product.slug}`,
        className: outerClass,
        'data-product-card': true,
        'data-layout': layout,
        // Side cards in the 3D fan: block shell navigation so the click can
        // bubble up to the parent for re-centering. Interactive children
        // (CTA / wishlist / share) call stopPropagation before this handler
        // runs, and cards that should navigate pass `onNavigate` (div wrapper).
        onClick: isScene
          ? (e) => {
              e.preventDefault();
            }
          : undefined,
      };

  return (
    <Wrapper {...wrapperProps}>
      <div
        ref={cardRef}
        className="relative flex h-full flex-col overflow-hidden rounded-[22px]"
        style={outerStyle}
        onMouseMove={isScene ? undefined : handleMouseMove}
        onMouseEnter={isScene ? () => setIsHovered(true) : handleMouseEnter}
        onMouseLeave={isScene ? () => setIsHovered(false) : handleMouseLeave}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-[22px]"
          style={{ ...bgStyle, ...darkSceneBg }}
        />

        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] rounded-t-[22px]"
          style={{
            background:
              'linear-gradient(90deg, transparent 10%, rgba(255,255,255,.6) 50%, transparent 90%)',
          }}
        />

        <div
          className="pointer-events-none absolute inset-0 rounded-[22px]"
          style={{
            boxShadow:
              'inset 0 1px 1px rgba(255,255,255,.08), inset 0 -1px 1px rgba(0,0,0,.03)',
          }}
        />

        {!isScene && IS_FINE_POINTER && (
          <div
            className="pointer-events-none absolute inset-0 z-[1] rounded-[22px]"
            style={{
              opacity: isHovered ? 1 : 0,
              transition: `opacity ${TRANSITION_MS}ms ease`,
              background:
                'radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,.18), transparent 45%)',
            }}
          />
        )}

        <div className="relative z-10 flex h-full flex-col">{inner}</div>
      </div>
    </Wrapper>
  );
};

export default ProductCard;
