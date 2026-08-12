import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Palette, PackageOpen } from 'lucide-react';
import { productsAPI } from '../services/api';
import ProductCard from '../components/ProductCard';
import EmptyState from '../components/ui/EmptyState';
import StylePageSkeleton from '../components/skeletons/StylePageSkeleton';
import { StyleSEO } from '../lib/seo';

const StylePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [style, setStyle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStyle = async () => {
      setLoading(true);
      try {
        const styleRes = await productsAPI.getStyle(slug);
        setStyle(styleRes.data);
      } catch (err) {
        console.error('Error fetching style:', err);
        setError('استایل مورد نظر یافت نشد');
      } finally {
        setLoading(false);
      }
    };
    fetchStyle();
  }, [slug]);

  const products = style?.products || [];

  if (loading) {
    return <StylePageSkeleton />;
  }

  if (error || !style) {
    return (
      <div className="min-h-[70vh]">
        <EmptyState
          icon={Palette}
          badge="استایل"
          title="استایل مورد نظر یافت نشد"
          description="این استایل حذف شده یا وجود ندارد. استایل‌های دیگر را کشف کنید."
          primaryLabel="مشاهده همه محصولات"
          primaryTo="/products"
          secondaryLabel="بازگشت به خانه"
          secondaryTo="/"
          accent="from-violet-500/15 via-purple-500/10 to-fuchsia-500/10"
        />
      </div>
    );
  }

  return (
    <div className="min-h-[70vh]">
      <StyleSEO style={style} />
      {/* Hero Banner */}
      <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden">
        {style.image ? (
          <img src={style.image} alt={style.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 right-0 p-6 sm:p-8 md:p-10 w-full">
          <div className="container mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2">{style.title}</h1>
            {style.description && (
              <p className="text-sm sm:text-base text-white/70 max-w-xl">{style.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold">محصولات این استایل</h2>
          <span className="text-sm text-muted-foreground">{products.length} محصول</span>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            badge="استایل"
            title="هنوز محصولی در این استایل نیست"
            description="به‌زودی محصولات این استایل اضافه می‌شوند. در این فاصله بقیه مجموعه‌ها را کشف کنید."
            primaryLabel="مشاهده همه محصولات"
            primaryTo="/products"
            secondaryLabel="بازگشت به خانه"
            secondaryTo="/"
            accent="from-violet-500/15 via-purple-500/10 to-fuchsia-500/10"
            size="compact"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} size="large" onNavigate={(path) => navigate(path)} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            مشاهده همه محصولات
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StylePage;
