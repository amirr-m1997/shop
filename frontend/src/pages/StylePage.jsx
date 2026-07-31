import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { productsAPI } from '../services/api';
import ProductCard from '../components/ProductCard';

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
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-muted rounded-2xl" />
          <div className="h-8 w-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (error || !style) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">{error || 'استایل یافت نشد'}</p>
        <Link to="/products" className="text-primary hover:underline">مشاهده همه محصولات</Link>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh]">
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
          <div className="text-center py-12 text-muted-foreground">
            <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>محصولی برای این استایل یافت نشد</p>
          </div>
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
