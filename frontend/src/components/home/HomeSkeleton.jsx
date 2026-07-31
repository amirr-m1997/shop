const HomeSkeleton = () => (
  <div className="min-h-screen">
    <div className="container mx-auto px-4 pt-4 sm:pt-6">
      <div className="h-[420px] animate-pulse rounded-[1.75rem] bg-muted sm:h-[480px] lg:h-[560px]" />
    </div>
    <div className="container mx-auto space-y-10 px-4 py-14">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-[1.5rem] bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-52 animate-pulse rounded-[1.5rem] bg-muted" />
        ))}
      </div>
      {[1, 2].map((i) => (
        <div key={i}>
          <div className="mb-4 h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-72 w-48 shrink-0 animate-pulse rounded-[1.35rem] bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default HomeSkeleton;
