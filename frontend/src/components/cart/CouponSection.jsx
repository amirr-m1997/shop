import { useState } from 'react';
import { Percent, X, CheckCircle2 } from 'lucide-react';

const CouponSection = ({ coupon, couponError, couponLoading, onApplyCoupon, onRemoveCoupon }) => {
  const [couponCode, setCouponCode] = useState('');

  const handleApply = () => {
    if (!couponCode.trim()) return;
    onApplyCoupon(couponCode.trim());
  };

  return (
    <div className="rounded-3xl border border-border/50 bg-card/90 p-6 shadow-sm backdrop-blur-xl ring-1 ring-black/[0.03] dark:ring-white/[0.04]">
      <div className="flex items-center gap-3">
        <div className={`relative flex-1 ${coupon ? 'opacity-50 pointer-events-none' : ''}`}>
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            placeholder="کد تخفیف"
            className="w-full rounded-2xl border border-border/70 bg-background/80 px-4 py-3 pr-10 text-sm font-medium placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
          />
          <Percent className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
        </div>
        {coupon ? (
          <button
            onClick={onRemoveCoupon}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-500 transition-all hover:bg-red-100 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleApply}
            disabled={!couponCode.trim() || couponLoading}
            className="h-12 shrink-0 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25 disabled:opacity-40 disabled:pointer-events-none"
          >
            {couponLoading ? '...' : 'اعمال'}
          </button>
        )}
      </div>
      {couponError && (
        <p className="mt-3 text-xs font-medium text-red-500 flex items-center gap-2 px-1">
          <X className="h-3 w-3" />
          {couponError}
        </p>
      )}
      {coupon && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>کد {coupon.code} اعمال شد · {coupon.discount_type === 'percentage' ? `${coupon.discount_value}٪` : `${Number(coupon.discount_value).toLocaleString('fa-IR')} تومان`} تخفیف</span>
        </div>
      )}
    </div>
  );
};

export default CouponSection;
