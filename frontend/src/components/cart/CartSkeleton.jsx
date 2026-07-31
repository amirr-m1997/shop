import AmbientBg from './AmbientBg';

const CartSkeleton = () => (
  <div className="relative min-h-[70vh]">
    <AmbientBg />
    <div className="container relative mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10 flex items-center gap-4">
        <div className="h-14 w-14 animate-pulse rounded-2xl bg-muted" />
        <div className="space-y-2">
          <div className="h-7 w-40 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex gap-5 rounded-3xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="h-32 w-28 shrink-0 animate-pulse rounded-2xl bg-muted" />
              <div className="flex flex-1 flex-col justify-between py-1">
                <div className="space-y-3">
                  <div className="h-5 w-3/4 animate-pulse rounded-lg bg-muted" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="h-10 w-32 animate-pulse rounded-full bg-muted" />
                  <div className="h-6 w-24 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-3xl border border-border/60 bg-card/80" />
      </div>
    </div>
  </div>
);

export default CartSkeleton;
