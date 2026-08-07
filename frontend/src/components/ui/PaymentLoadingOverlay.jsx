import React from 'react';
import { Lock } from 'lucide-react';

const PaymentLoadingOverlay = () => {
  return (
    <div
      className="animate-pay-overlay-in fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-overlay-title"
      aria-busy="true"
    >
      <div className="animate-pay-card-in flex flex-col items-center gap-7 px-6 text-center">
        {/* Spinner */}
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="pay-ring-pulse absolute inset-0 rounded-full border-2 border-white/15" />
          <div className="pay-ring-pulse absolute inset-0 rounded-full border-2 border-white/10" style={{ animationDelay: '0.6s' }} />
          <div className="pay-spinner relative h-16 w-16 rounded-full border-[3px] border-white/15 border-t-white/90">
            <div className="absolute inset-[5px] rounded-full border border-white/10" />
          </div>
          <div className="absolute flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
            <Lock className="h-3 w-3 text-white/80" strokeWidth={2.5} />
          </div>
        </div>

        {/* Message */}
        <div className="flex flex-col items-center gap-2.5">
          <h3 id="pay-overlay-title" className="text-lg font-bold tracking-tight text-white sm:text-xl">
            در حال اتصال به درگاه پرداخت...
          </h3>
          <p className="max-w-xs text-sm leading-relaxed text-white/65">
            لطفاً چند لحظه صبر کنید و صفحه را نبندید.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="pay-dot h-1.5 w-1.5 rounded-full bg-white/70" />
          <span className="pay-dot h-1.5 w-1.5 rounded-full bg-white/70" style={{ animationDelay: '0.2s' }} />
          <span className="pay-dot h-1.5 w-1.5 rounded-full bg-white/70" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
};

export default PaymentLoadingOverlay;
