import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { pagesAPI } from '../services/api';

const LookbookPage = () => {
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pagesAPI.getLookbook().then(res => {
      setLooks(res.data.results || res.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container mx-auto px-4 py-16 text-center">در حال بارگذاری...</div>;

  return (
    <div className="min-h-screen">
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30 z-10" />
        <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=600&fit=crop" alt="Lookbook" className="absolute inset-0 h-full w-full object-cover" />
        <div className="relative z-20 text-center text-white px-4">
          <h1 className="text-5xl font-bold mb-4">کتاب استایل</h1>
          <p className="text-xl max-w-2xl mx-auto">از مجموعه استایل‌های ما الهام بگیرید</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        {looks.length === 0 ? (
          <p className="text-center text-muted-foreground">هنوز استایلی اضافه نشده است</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {looks.map(look => (
              <Card key={look.id} className="group overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <img src={look.image} alt={look.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" onError={(e) => { e.target.src = 'https://via.placeholder.com/600x800?text=Lookbook'; e.target.alt = 'تصویر موجود نیست'; }} />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{look.title}</h3>
                    <p className="text-muted-foreground mb-4">{look.description}</p>
                    <Button asChild variant="outline" className="w-full"><Link to="/products">مشاهده محصولات</Link></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default LookbookPage;
