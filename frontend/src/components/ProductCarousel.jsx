import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/formatPrice';
import WishlistButton from './WishlistButton';
import ShareButton from './ShareButton';

const ProductCard = ({ product }) => {
  const imageUrl = product.primary_image || product.images?.[0]?.image || 'https://via.placeholder.com/400x500?text=No+Image';
  return (
    <Link to={`/product/${product.id}`} className="h-full flex flex-col bg-card rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border border-border block">
      <div className="relative flex-1 overflow-hidden" style={{ minHeight: '200px' }}>
        <img src={imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" onError={(e) => { e.target.src = 'https://via.placeholder.com/400x500?text=No+Image'; }} />
        {product.discount_percentage > 0 && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {product.discount_percentage}%-
          </span>
        )}
        <WishlistButton productId={product.id} />
        <ShareButton product={product} />
      </div>
      <div className="p-3 text-right">
        <h3 className="font-bold text-sm text-foreground truncate">{product.name}</h3>
        <div className="flex items-center gap-1 mt-1 justify-end">
          <span className="text-xs text-muted-foreground">{product.rating || '0.00'}</span>
          <span className="text-amber-400 text-xs">★</span>
        </div>
        <div className="mt-2">
          <span className="font-black text-foreground text-sm">{formatPrice(product.price)} تومان</span>
          {product.compare_price && <div className="text-xs text-red-500 line-through font-medium">{formatPrice(product.compare_price)} تومان</div>}
        </div>
      </div>
    </Link>
  );
};

const ProductCarousel = ({ title, subtitle, products, viewAllLink, accentColor = '#ef4444' }) => {
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
  const next = useCallback(() => setCurrent(prev => prev >= maxSlide ? 0 : prev + 1), [maxSlide]);
  const prev = useCallback(() => setCurrent(prev => prev <= 0 ? maxSlide : prev - 1), [maxSlide]);

  useEffect(() => {
    if (paused || products.length <= visibleCount) return;
    const t = setInterval(next, 4000);
    return () => clearInterval(t);
  }, [paused, next, products.length, visibleCount]);

  if (!products || products.length === 0) return null;

  const GAP = 12;

  return (
    <section className="py-6 bg-background" dir="rtl" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="container mx-auto px-4">
        <div className="flex gap-3 items-stretch">

          {/* Banner ثابت */}
          <div className="hidden lg:flex flex-col justify-between rounded-2xl p-6 shrink-0 bg-muted border border-border"
            style={{ width: `calc((100% - ${GAP * visibleCount}px) / ${visibleCount + 1})` }}>
            <div>
              <div className="w-8 h-1 rounded-full mb-4" style={{ background: accentColor }} />
              <h2 className="text-2xl font-black text-foreground leading-tight">{title}</h2>
              {subtitle && <p className="text-muted-foreground text-xs mt-2 leading-relaxed">{subtitle}</p>}
            </div>
            <div className="flex flex-col gap-3">
              {maxSlide > 0 && (
                <div className="flex gap-1.5">
                  {Array.from({ length: maxSlide + 1 }).map((_, idx) => (
                    <button key={idx} onClick={() => setCurrent(idx)}
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: idx === current ? '24px' : '6px', background: idx === current ? accentColor : 'hsl(var(--muted-foreground) / 0.3)' }} />
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={prev} className="h-9 w-9 rounded-full flex items-center justify-center text-foreground text-lg bg-border hover:bg-muted-foreground/20 transition-colors">›</button>
                <button onClick={next} className="h-9 w-9 rounded-full flex items-center justify-center text-foreground text-lg bg-border hover:bg-muted-foreground/20 transition-colors">‹</button>
              </div>
              {viewAllLink && (
                <Link to={viewAllLink} className="text-sm font-bold flex items-center gap-1" style={{ color: accentColor }}>
                  نمایش همه ←
                </Link>
              )}
            </div>
          </div>

          {/* اسلایدر */}
          <div className="flex-1 overflow-hidden" ref={containerRef}>
            <div className="flex transition-transform duration-500 ease-in-out h-full"
              style={{ gap: `${GAP}px`, transform: `translateX(calc(${current} * (100% / ${visibleCount} + ${GAP / visibleCount}px)))` }}>
              {products.map(product => (
                <div key={product.id} className="shrink-0 h-full"
                  style={{ width: `calc((100% - ${GAP * (visibleCount - 1)}px) / ${visibleCount})` }}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ProductCarousel;
