import { cn } from '../../lib/utils';
import Skeleton from '../ui/Skeleton';

/**
 * Generic list skeleton — rows for orders, login history, addresses, blog cards.
 * `className` applies to each row (height, radius, borders).
 */
const ListSkeleton = ({ count = 3, className, delayStep = 0.08 }) => (
  <div className="space-y-4" aria-hidden="true">
    {Array.from({ length: count }, (_, i) => (
      <Skeleton
        key={i}
        className={cn(
          'h-20 w-full rounded-2xl border border-border/40 bg-card/60',
          className
        )}
        delay={i * delayStep}
      />
    ))}
  </div>
);

export default ListSkeleton;
