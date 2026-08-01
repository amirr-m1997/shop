import { cn } from '../../lib/utils';
import Skeleton from '../ui/Skeleton';

/**
 * Product card skeleton — mirrors ProductCard layout to prevent layout shift.
 */
const ProductCardSkeleton = ({ size = 'default', delay = 0 }) => {
  const isLarge = size === 'large';
  return (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-border/30 bg-card shadow-sm shadow-black/[0.04] dark:border-white/[0.06] dark:bg-card'
      )}
      aria-hidden="true"
    >
      <Skeleton
        className={cn(isLarge ? 'aspect-[3/5.4]' : 'aspect-[3/4.7]', 'rounded-none')}
        delay={delay}
      />
      <div className="absolute bottom-0 inset-x-0 z-10">
        <div className="relative px-3.5 pb-3 pt-6 bg-gradient-to-t from-background/95 via-background/60 to-transparent backdrop-blur-xl sm:px-4">
          <Skeleton className="mb-2 h-4 w-3/4 rounded-md" delay={delay + 0.05} />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-12 rounded" delay={delay + 0.1} />
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded-md" delay={delay + 0.15} />
            <Skeleton className="h-3 w-10 rounded" delay={delay + 0.2} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
