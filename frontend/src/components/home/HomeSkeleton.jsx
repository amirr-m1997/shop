import Skeleton from '../ui/Skeleton';

const HomeSkeleton = () => (
  <div className="min-h-screen" aria-hidden="true">
    <div className="container mx-auto px-4 pt-4 sm:pt-6">
      <Skeleton className="h-[420px] rounded-[1.75rem] sm:h-[480px] lg:h-[560px]" />
    </div>
    <div className="container mx-auto space-y-10 px-4 py-14">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-[1.5rem]" delay={i * 0.08} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-52 rounded-[1.5rem]" delay={i * 0.1} />
        ))}
      </div>
      {[1, 2].map((i) => (
        <div key={i}>
          <Skeleton className="mb-4 h-6 w-40 rounded" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} className="h-72 w-48 shrink-0 rounded-[1.35rem]" delay={(j + i) * 0.06} />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default HomeSkeleton;
