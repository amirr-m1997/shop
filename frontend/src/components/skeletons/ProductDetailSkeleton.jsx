import Skeleton from '../ui/Skeleton';

/**
 * Product detail skeleton — mirrors ProductDetailPage two-column layout.
 */
const ProductDetailSkeleton = () => (
  <div className="container mx-auto px-4 py-8">
    <div className="mb-6">
      <Skeleton className="h-4 w-56 rounded-md" />
    </div>
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
      <Skeleton className="aspect-square w-full rounded-[1.75rem]" />
      <div className="space-y-4 pt-2 lg:pt-8">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-10 w-3/4 rounded-xl" />
        <Skeleton className="h-8 w-40 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-12 rounded-xl" delay={i * 0.05} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    </div>
  </div>
);

export default ProductDetailSkeleton;
