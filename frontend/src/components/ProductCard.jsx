import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { formatPrice } from '../lib/formatPrice';
import { PLACEHOLDER_IMG } from '../lib/placeholders';
import WishlistButton from './WishlistButton';
import ShareButton from './ShareButton';

/**
 * Premium glassmorphism product card — used across home, listing, style, detail.
 */
const ProductCard = ({ product, onNavigate, className = '', size = 'default' }) => {
  const imageUrl =
    product.primary_image ||
    product.images?.[0]?.image ||
    PLACEHOLDER_IMG;

  const isNew = product.is_new_arrival;
  const hasDiscount = product.discount_percentage > 0;
  const isLarge = size === 'large';

  const handleClick = (e) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(`/product/${product.slug}`);
    }
  };

  const content = (
    <>
      {/* Image container */}
      <div className={`relative overflow-hidden bg-muted/60 ${isLarge ? 'aspect-[3/5.4]' : 'aspect-[3/4.7]'}`}>
        <img
          src={imageUrl}
          alt={`${product.name} - فروشگاه مد`}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            e.target.src = PLACEHOLDER_IMG;
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

        {/* Badges */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {hasDiscount && (
            <span className="rounded-xl bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground shadow-lg shadow-destructive/25">
              −{product.discount_percentage}٪
            </span>
          )}
          {isNew && (
            <span className="rounded-xl bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg shadow-emerald-500/25">
              جدید
            </span>
          )}
        </div>

        <div className="absolute right-2.5 top-2.5 z-10 flex flex-col gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <WishlistButton productId={product.id} />
          <ShareButton product={product} />
        </div>

        {/* Glassmorphism meta overlay at bottom */}
        <div className="absolute bottom-0 inset-x-0 z-10">
          <div className="relative px-3.5 sm:px-4 pb-2.5 sm:pb-3 pt-2 bg-gradient-to-t from-background/95 via-background/60 to-transparent backdrop-blur-xl">
            <h3 className="relative text-sm font-bold leading-snug tracking-tight line-clamp-1 transition-colors group-hover:text-primary">
              {product.name}
            </h3>

            <div className="relative mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-semibold tabular-nums">
                {product.rating || '0.00'}
              </span>
              {product.review_count > 0 && (
                <span className="text-muted-foreground/70">
                  ({product.review_count.toLocaleString('fa-IR')})
                </span>
              )}
            </div>

            <div className="relative mt-2 flex flex items-center gap-2 items-baseline gap-2">
              <span className="text-sm font-bold tabular-nums tracking-tight">
                {formatPrice(product.price)}
              </span>
              {product.compare_price && (
                <span className="text-xs font-medium text-red-500/80 line-through tabular-nums">
                  {formatPrice(product.compare_price)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

   const baseClass = `group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-border/30 bg-card shadow-sm shadow-black/[0.04] transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/25 hover:shadow-2xl hover:shadow-primary/[0.08] dark:border-white/[0.06] dark:bg-card ${className}`;


  if (onNavigate) {
    return (
      <div
        role="link"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick(e);
        }}
        className={`${baseClass} cursor-pointer`}
        data-product-card
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={`/product/${product.slug}`}
      className={baseClass}
      data-product-card
    >
      {content}
    </Link>
  );
};

export default ProductCard;
