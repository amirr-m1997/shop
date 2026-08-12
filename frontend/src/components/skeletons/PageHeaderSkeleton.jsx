import { cn } from '../../lib/utils';
import Skeleton from '../ui/Skeleton';

/**
 * Page header skeleton — icon + title + subtitle (used by Cart/Orders pages).
 */
const PageHeaderSkeleton = ({ className }) => (
  <div className={cn('mb-10 flex items-center gap-4', className)} aria-hidden="true">
    <Skeleton className="h-14 w-14 rounded-2xl" />
    <div className="space-y-2">
      <Skeleton className="h-7 w-40 rounded-lg" />
      <Skeleton className="h-4 w-28 rounded" />
    </div>
  </div>
);

export default PageHeaderSkeleton;
