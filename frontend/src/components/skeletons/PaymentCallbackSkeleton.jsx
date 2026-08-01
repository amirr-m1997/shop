import Skeleton from '../ui/Skeleton';

/**
 * Payment callback skeleton — shown while verifying payment status.
 * Matches the callback page layout with centered content.
 */
const PaymentCallbackSkeleton = () => (
  <div className="flex min-h-[70vh] items-center justify-center px-4" aria-hidden="true">
    <div className="w-full max-w-md space-y-6 text-center">
      <Skeleton className="mx-auto h-20 w-20 rounded-3xl" />
      <Skeleton className="mx-auto h-8 w-64 rounded-xl" />
      <Skeleton className="mx-auto h-5 w-48 rounded-lg" />
      <div className="space-y-3 pt-4">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" delay={0.1} />
      </div>
    </div>
  </div>
);

export default PaymentCallbackSkeleton;
