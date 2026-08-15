import ProductCarousel from '../ProductCarousel';

const PersonalizedSection = ({ products, isLoading = false, isFallback = false }) => {
  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-12 sm:py-16" aria-label="Personalized recommendations loading" dir="rtl">
        <div className="mx-auto mb-8 flex max-w-lg flex-col items-center gap-3 text-center">
          <div className="h-2 w-16 animate-pulse rounded-full bg-muted" />
          <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (!products?.length) return null;

  return (
    <ProductCarousel
      title="پیشنهادهایی برای شما"
      subtitle={isFallback ? 'انتخابی از محصولات محبوب فروشگاه' : 'بر اساس علاقه‌مندی‌های شما'}
      products={products}
      viewAllLink="/products"
      accentColor="primary"
    />
  );
};

export default PersonalizedSection;
