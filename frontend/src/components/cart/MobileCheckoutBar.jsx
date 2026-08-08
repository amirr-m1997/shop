import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatPrice } from '../../lib/formatPrice';

const MobileCheckoutBar = ({ total, itemCount, discount, coupon }) => (
  <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 border-t border-border/60 bg-background/85 p-4 shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.15)] backdrop-blur-xl lg:hidden">
    <div className="mx-auto flex max-w-lg items-center gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">
          {itemCount.toLocaleString('fa-IR')} کالا
        </p>
        {discount > 0 && (
          <p className="text-xs font-medium text-emerald-500">
            -{formatPrice(discount)} تخفیف
          </p>
        )}
        <p className="truncate text-base font-bold tabular-nums tracking-tight">
          {formatPrice(Math.max(total - discount, 0))}
        </p>
      </div>
      <Button
        asChild
        size="lg"
        className="h-12 shrink-0 rounded-2xl px-6 font-bold shadow-lg shadow-primary/20 text-base"
      >
        <Link to={`/checkout${coupon ? `?coupon=${encodeURIComponent(coupon.code)}` : ''}`} className="flex items-center gap-2">
          تسویه حساب
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  </div>
);

export default MobileCheckoutBar;
