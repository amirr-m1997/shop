import AmbientBg from './AmbientBg';
import Skeleton from '../ui/Skeleton';
import PageHeaderSkeleton from '../skeletons/PageHeaderSkeleton';

const CartSkeleton = () => (
  <div className="relative min-h-[70vh]" aria-hidden="true">
    <AmbientBg />
    <div className="container relative mx-auto max-w-6xl px-4 py-10">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex gap-5 rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm"
            >
              <Skeleton className="h-32 w-28 shrink-0 rounded-2xl" delay={i * 0.08} />
              <div className="flex flex-1 flex-col justify-between py-1">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-3/4 rounded-lg" delay={i * 0.08} />
                  <Skeleton className="h-4 w-1/3 rounded" delay={i * 0.12} />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <Skeleton className="h-10 w-32 rounded-full" delay={i * 0.16} />
                  <Skeleton className="h-6 w-24 rounded" delay={i * 0.2} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-40 rounded-lg" />
          <Skeleton className="h-96 rounded-3xl border border-border/60 bg-card/80" />
        </div>
      </div>
    </div>
  </div>
);

export default CartSkeleton;
