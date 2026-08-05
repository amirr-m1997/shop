import { cn } from '../../lib/utils';
import Skeleton from '../ui/Skeleton';

/**
 * Product card skeleton — mirrors the new soft-3D ProductCard layout.
 */
const ProductCardSkeleton = ({ size = 'default', delay = 0 }) => {
  const isLarge = size === 'large';
  return (
    <div
      className={cn(
        'relative flex h-full flex-col overflow-hidden',
        'rounded-[22px]',
        'border border-white/40 dark:border-white/[0.08]'
      )}
      style={{
        background: 'linear-gradient(165deg, hsl(var(--card)) 0%, hsl(var(--card)/.95) 40%, hsl(var(--muted)/.25) 100%)',
        boxShadow: '0 1px 2px rgba(120,100,60,.04), 0 4px 12px rgba(120,100,60,.06), 0 12px 28px -6px rgba(120,100,60,.08), inset 0 1px 0 0 rgba(255,255,255,.45)',
      }}
      aria-hidden="true"
    >
      {/* Top highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1px] rounded-t-[22px]"
        style={{
          background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,.6) 50%, transparent 90%)',
        }}
      />

      {/* Image skeleton (floating inside card) */}
      <div
        className={cn(
          'relative mx-2.5 mt-2.5 overflow-hidden rounded-2xl',
          isLarge ? 'aspect-[3/4.5]' : 'aspect-[3/4]'
        )}
        style={{
          boxShadow: '0 4px 16px -2px rgba(0,0,0,.10)',
        }}
      >
        <Skeleton className="h-full w-full rounded-2xl" delay={delay} />
      </div>

      {/* Content skeleton */}
      <div className="relative z-10 flex flex-1 flex-col px-4 pt-3 pb-4">
        {/* Category */}
        <Skeleton className="mb-1 h-2.5 w-12 rounded" delay={delay + 0.03} />
        {/* Title */}
        <Skeleton className="h-4 w-3/4 rounded-md" delay={delay + 0.06} />
        {/* Rating */}
        <div className="mt-1.5 flex items-center gap-1.5">
          <Skeleton className="h-3 w-3 rounded-full" delay={delay + 0.09} />
          <Skeleton className="h-3 w-8 rounded" delay={delay + 0.12} />
        </div>

        <div className="flex-1" />

        {/* Price */}
        <div className="mt-3 flex items-baseline gap-2">
          <Skeleton className="h-5 w-20 rounded-md" delay={delay + 0.15} />
          <Skeleton className="h-3 w-12 rounded" delay={delay + 0.18} />
        </div>

        {/* Button */}
        <Skeleton className="mt-3 h-10 w-full rounded-xl" delay={delay + 0.21} />
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
