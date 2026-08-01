import React, { Suspense } from 'react';
import Skeleton from './ui/Skeleton';

/**
 * Minimal loading skeleton shown while a lazy page chunk loads.
 * Only appears on slow connections or first visit per route.
 */
function PageFallback() {
  return (
    <div className="min-h-[60vh]" aria-busy="true" aria-label="بارگذاری صفحه">
      <div className="container mx-auto space-y-6 px-4 py-10">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <Skeleton className="h-4 w-80 rounded" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-2xl" delay={i * 0.06} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Error boundary that catches chunk-loading failures (network errors,
 * deployment cache invalidation, etc.) and shows a retry UI instead
 * of a blank page.
 */
class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[ChunkErrorBoundary]', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false }, () => {
      window.location.reload();
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            <p className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              بارگذاری صفحه ناموفق بود
            </p>
            <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
              اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید.
            </p>
            <button
              onClick={this.handleRetry}
              className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Wraps a React.lazy component with Suspense + error boundary.
 * Usage: <LazyPageLoader Component={lazy(() => import('./pages/Foo'))} />
 */
export default function LazyPageLoader({ Component }) {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Component />
      </Suspense>
    </ChunkErrorBoundary>
  );
}
