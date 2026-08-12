import Skeleton from '../ui/Skeleton';

/**
 * Style page skeleton — matches the lookbook/style detail layout.
 */
const StylePageSkeleton = () => (
  <div className="container mx-auto px-4 py-8" aria-hidden="true">
    <Skeleton className="mb-8 h-8 w-56 rounded-xl" />
    <Skeleton className="mb-6 aspect-video w-full rounded-[2rem]" />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Skeleton className="h-6 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" delay={0.1} />
      </div>
    </div>
  </div>
);

export default StylePageSkeleton;
