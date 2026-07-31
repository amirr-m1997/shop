import { Link } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';
import AmbientMesh from './AmbientMesh';
import SectionHeader from './SectionHeader';
import FashionVisual from '../FashionVisual';

const CategoriesSection = ({ categories }) => {
  if (!categories.length) return null;

  const showVisual = categories.length === 4;

  return (
    <section className="relative py-14 sm:py-20">
      <AmbientMesh />
      <div className="container relative mx-auto px-4">
        <SectionHeader
          eyebrow="کاوش"
          title="دسته‌بندی‌ها"
          subtitle="مجموعه‌های منتخب برای هر سلیقه — از کلاسیک تا مدرن"
          action={
            <Link
              to="/products"
              className="group inline-flex items-center gap-1.5 text-sm font-bold text-muted-foreground transition-colors hover:text-primary"
            >
              همه محصولات
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </Link>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2 lg:gap-5">
          {categories.map((cat, idx) => {
            const isFeatured = idx === 0 && categories.length > 1;
            return (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className={`group relative overflow-hidden rounded-[1.5rem] ${
                  isFeatured
                    ? 'col-span-2 row-span-2 min-h-[280px] sm:min-h-[360px] lg:min-h-[480px]'
                    : 'aspect-[4/5] sm:aspect-[3/4]'
                }`}
              >
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-violet-500/20 to-muted" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity duration-500 group-hover:from-black/90" />
                <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

                <div
                  className={`absolute bottom-0 right-0 w-full ${
                    isFeatured ? 'p-6 sm:p-8' : 'p-4 sm:p-5'
                  }`}
                >
                  {isFeatured && (
                    <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                      <Zap className="h-3 w-3 text-amber-300" />
                      محبوب‌ترین
                    </span>
                  )}
                  <h3
                    className={`font-black text-white tracking-tight ${
                      isFeatured
                        ? 'text-3xl sm:text-4xl md:text-5xl'
                        : 'text-lg sm:text-xl md:text-2xl'
                    }`}
                  >
                    {cat.name}
                  </h3>
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-white/70 transition-colors group-hover:text-white sm:text-sm">
                    مشاهده محصولات
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                  </p>
                </div>
              </Link>
            );
          })}

          {showVisual && (
            <div className="aspect-[4/5] sm:aspect-[3/4] animate-fade-in">
              <FashionVisual />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
