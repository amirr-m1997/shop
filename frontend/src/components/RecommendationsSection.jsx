import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { productsAPI } from '../services/api';
import ProductCard from './ProductCard';
import ProductGridSkeleton from './skeletons/ProductGridSkeleton';
import Skeleton from './ui/Skeleton';

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
      <div>
        <div className="mb-7">
          <Skeleton className="h-9 w-64 rounded-xl" />
        </div>
        <ProductGridSkeleton count={4} size="default" />
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div>
      <div className="mb-7 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
};

export default RecommendationsSection;
