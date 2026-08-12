import { Link } from 'react-router-dom';
import { Heart, HeartOff, ShoppingBag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';
import { SEO } from '../lib/seo';
import AmbientBg from '../components/orders/AmbientBg';
import EmptyState from '../components/ui/EmptyState';
import ProductCard from '../components/ProductCard';
import Skeleton from '../components/ui/Skeleton';

const WishlistPage = () => {
  const { isAuthenticated } = useAuth();
  const { wishlist, loading } = useWishlist();

  /* ── Not logged in ── */
  if (!isAuthenticated) {
    return (
      <div className="relative flex min-h-[70vh] items-center justify-center">
        <SEO title="علاقه‌مندی‌ها" noIndex />
        <AmbientBg />
        <div className="relative mx-4 w-full max-w-lg">
          <EmptyState
            icon={Heart}
            badge="علاقه‌مندی‌ها"
            title="برای دیدن علاقه‌مندی‌ها وارد شوید"
            description="با ورود به حساب، محصولات مورد علاقه‌تان را در یک‌جا نگه دارید تا بعداً راحت انتخاب کنید."
            primaryLabel="ورود به حساب"
            primaryTo="/login"
            secondaryLabel="ثبت‌نام"
            secondaryTo="/register"
          />
        </div>
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="relative min-h-[70vh]" aria-hidden="true">
        <SEO title="علاقه‌مندی‌ها" noIndex />
        <AmbientBg />
        <div className="container relative mx-auto max-w-6xl px-4 py-10">
          <div className="mb-8">
            <Skeleton className="h-10 w-52 rounded-2xl" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-80 rounded-[22px]" delay={i * 0.05} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Empty state ── */
  if (wishlist.length === 0) {
    return (
      <div className="relative flex min-h-[70vh] items-center justify-center">
        <SEO title="علاقه‌مندی‌ها" noIndex />
        <AmbientBg />
        <div className="relative mx-4 w-full max-w-lg">
          <EmptyState
            icon={HeartOff}
            badge="علاقه‌مندی‌ها"
            title="هنوز چیزی ذخیره نکرده‌اید"
            description="با لمس قلب روی محصولات، آن‌ها را اینجا نگه دارید تا بعداً راحت انتخاب کنید."
            primaryLabel="کشف محصولات"
            primaryTo="/products"
            secondaryLabel="بازگشت به خانه"
            secondaryTo="/"
          >
            <div className="mt-12 grid w-full max-w-sm grid-cols-3 gap-3">
              {[
                { icon: Heart, label: 'ذخیره سریع' },
                { icon: ShoppingBag, label: 'خرید آسان' },
                { icon: HeartOff, label: 'دسترسی همیشه' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border/50 bg-card/60 p-3.5 shadow-sm backdrop-blur-md"
                >
                  <Icon className="mx-auto mb-2 h-[18px] w-[18px] text-primary/70" />
                  <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </EmptyState>
        </div>
      </div>
    );
  }

  /* ── Main render ── */
  return (
    <div className="relative min-h-screen pb-12">
      <SEO title={`علاقه‌مندی‌ها (${wishlist.length.toLocaleString('fa-IR')})`} noIndex />
      <AmbientBg />
      <div className="container relative mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              محصولات مورد علاقه
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {wishlist.length.toLocaleString('fa-IR')} محصول در لیست شما
            </p>
          </div>
          <Link
            to="/products"
            className="shrink-0 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 text-sm font-bold text-foreground shadow-sm backdrop-blur-md transition hover:border-primary/30 hover:text-primary"
          >
            مشاهده همه محصولات
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
          {wishlist.map((item) => (
            <ProductCard key={item.id} product={item.product} size="large" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WishlistPage;
