import { cn } from '../../lib/utils';

/**
 * Premium skeleton base — theme-aware shimmer with anti-flicker delay.
 * The `skeleton-delay` class prevents flash on fast loads (300ms delay).
 * Staggered `delay` prop adds additional per-element offset.
 */
const Skeleton = ({ className, delay = 0, noDelay = false }) => (
  <div
    className={cn(
      'skeleton',
      noDelay ? 'skeleton-fade-in' : 'skeleton-delay',
      className
    )}
    style={delay ? { animationDelay: `${noDelay ? 0 : 0.3 + delay}s`, animationFillMode: 'both' } : undefined}
    aria-hidden="true"
  />
);

export default Skeleton;
