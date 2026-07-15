import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { productsAPI } from '../services/api';

const HomePage = () => {
  const [newArrivals, setNewArrivals] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [newRes, trendingRes] = await Promise.all([
          productsAPI.getProducts({ is_new_arrival: true, limit: 8 }),
          productsAPI.getProducts({ is_trending: true, limit: 8 }),
        ]);
        setNewArrivals(newRes.data.results || newRes.data);
        setTrendingProducts(trendingRes.data.results || trendingRes.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const categories = [
    { name: 'مردانه', slug: 'men', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&h=600&fit=crop' },
    { name: 'زنانه', slug: 'women', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=600&fit=crop' },
    { name: 'بچگانه', slug: 'kids', image: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&h=600&fit=crop' },
  ];

  const ProductCard = ({ product }) => {
    const imageUrl = product.primary_image || product.images?.[0]?.image || 'https://via.placeholder.com/400x500?text=No+Image';
    
    return (
      <Link to={`/product/${product.id}`}>
        <Card className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg">
          <CardContent className="p-0">
            <div className="relative aspect-[3/4] overflow-hidden bg-muted">
              <img
                src={imageUrl}
                alt={product.name}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/400x500?text=No+Image';
                }}
              />
              {product.discount_percentage > 0 && (
                <Badge className="absolute left-2 top-2 bg-destructive">
                  -{product.discount_percentage}%
                </Badge>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold truncate">{product.name}</h3>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm text-muted-foreground">{product.rating}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-bold">${product.price}</span>
                {product.compare_price && (
                  <span className="text-sm text-muted-foreground line-through">
                    ${product.compare_price}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30 z-10" />
        <img
          src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop"
          alt="Hero"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="relative z-20 text-center text-white px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">استایل خود را کشف کنید</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
            مد و فشن با کیفیت برای مردان، زنان و کودکان
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/products">
              <Button size="lg" className="bg-white text-black hover:bg-gray-100">
                خرید کنید
              </Button>
            </Link>
            <Link to="/new-arrivals">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                جدیدترین‌ها
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Category Grid */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-8 text-center">خرید بر اساس دسته‌بندی</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link key={category.slug} to={`/category/${category.slug}`}>
              <Card className="group cursor-pointer overflow-hidden">
                <CardContent className="p-0 relative h-80">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                    <h3 className="text-3xl font-bold text-white">{category.name}</h3>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">جدیدترین‌ها</h2>
            <Link to="/new-arrivals" className="flex items-center gap-2 hover:underline">
              مشاهده همه <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-12">در حال بارگذاری...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trending Now */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">محبوب‌ترین‌ها</h2>
            <Link to="/trending" className="flex items-center gap-2 hover:underline">
              مشاهده همه <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {loading ? (
            <div className="text-center py-12">در حال بارگذاری...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {trendingProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl mb-4">🚚</div>
              <h3 className="text-xl font-semibold mb-2">ارسال رایگان</h3>
              <p className="text-muted-foreground">برای سفارش‌های بالای ۱۰۰ دلار</p>
            </div>
            <div>
              <div className="text-4xl mb-4">↩️</div>
              <h3 className="text-xl font-semibold mb-2">بازگشت آسان</h3>
              <p className="text-muted-foreground">سیاست بازگشت ۳۰ روزه</p>
            </div>
            <div>
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-2">پرداخت امن</h3>
              <p className="text-muted-foreground">۱۰۰٪ امن در پرداخت</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
