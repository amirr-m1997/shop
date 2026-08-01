import { Truck, Sparkles, CheckCircle2 } from 'lucide-react';
import { formatPrice } from '../../lib/formatPrice';

const FreeShippingBar = ({ shippingInfo }) => {
  const { isFree, remaining, progress, threshold } = shippingInfo;

  return (
    <div
      className={`group relative mb-7 overflow-hidden rounded-3xl border p-5 sm:p-6 animate-fade-in-up transition-all duration-500 ${
        isFree
          ? 'border-emerald-500/25 bg-gradient-to-l from-emerald-500/[0.12] via-emerald-500/[0.04] to-transparent shadow-lg shadow-emerald-500/5'
          : 'border-amber-500/20 bg-gradient-to-l from-amber-500/[0.10] via-orange-500/[0.04] to-transparent'
      }`}
    >
      <div className="pointer-events-none absolute -left-8 top-0 h-full w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100 dark:via-white/5" />

      <div className="relative flex items-start gap-4">
        <div
          className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner ${
            isFree
              ? 'bg-gradient-to-br from-emerald-500/20 to-green-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-400'
          }`}
        >
          {isFree ? (
            <Sparkles className="h-5 w-5 animate-[pulse_2s_ease-in-out_infinite]" />
          ) : (
            <Truck className="h-5 w-5" />
          )}
          {isFree && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-background">
              <CheckCircle2 className="h-2.5 w-2.5" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <p
              className={`text-sm font-bold sm:text-base ${
                isFree ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'
              }`}
            >
              {isFree ? (
                'ارسال این سفارش رایگان است'
              ) : (
                <>
                  فقط{' '}
                  <span className="bg-gradient-to-l from-amber-600 to-orange-500 bg-clip-text text-transparent dark:from-amber-300 dark:to-orange-300">
                    {formatPrice(remaining)}
                  </span>{' '}
                  تا ارسال رایگان
                </>
              )}
            </p>
            <span className="rounded-full bg-background/70 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground ring-1 ring-border/50 backdrop-blur-sm">
              {Math.round(progress).toLocaleString('fa-IR')}٪
            </span>
          </div>

          {!isFree && (
            <p className="mb-3 text-xs text-muted-foreground">
              با خرید بالای {formatPrice(threshold)}، ارسال رایگان می‌شود
            </p>
          )}

          <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-background/70 ring-1 ring-border/40 backdrop-blur-sm">
            <div
              className={`relative h-full rounded-full transition-all duration-1000 ease-out ${
                isFree
                  ? 'bg-gradient-to-l from-emerald-500 via-green-400 to-teal-400'
                  : 'bg-gradient-to-l from-amber-500 via-orange-400 to-amber-300'
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            >
              <div className="absolute inset-0 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreeShippingBar;
