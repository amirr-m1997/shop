import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Badge } from './ui/Badge';
import { productsAPI } from '../services/api';
import { formatPrice } from '../lib/formatPrice';

const RecommendationsSection = ({ productId, title = 'پیشنهاد ویژه برای شما' }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const params = productId ? { product_id: productId } : {};
        const res = await productsAPI.getRecommendations(params);
        setProducts(res.data.results || res.data || []);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  }, [productId]);

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        در حال بارگذاری پیشنهادات...
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {products.map(p => (
          <Link key={p.id} to={`/product/${p.slug}`}>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow group">
              <CardContent className="p-0">
                <div className="aspect-[3/4] bg-muted overflow-hidden relative">
                  <img
                    src={p.primary_image || 'https://via.placeholder.com/400x500?text=No+Image'}
                    alt={p.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {p.discount_percentage > 0 && (
                    <Badge className="absolute top-2 right-2 bg-destructive">
                      -{p.discount_percentage}%
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold truncate text-sm">{p.name}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-bold text-sm">{formatPrice(p.price)}</span>
                    {p.compare_price && (
                      <span className="text-xs text-red-500 line-through font-medium">
                        {formatPrice(p.compare_price)}
                      </span>
                    )}
                  </div>
                  {p.rating > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <span>★</span>
                      <span>{p.rating}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecommendationsSection;
