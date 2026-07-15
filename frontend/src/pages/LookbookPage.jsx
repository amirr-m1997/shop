import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

const LookbookPage = () => {
  const looks = [
    {
      id: 1,
      title: 'Summer Casual',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=1000&fit=crop',
      description: 'Effortless summer style with light fabrics and neutral tones.',
      products: [1, 2, 3],
    },
    {
      id: 2,
      title: 'Office Chic',
      image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&h=1000&fit=crop',
      description: 'Professional yet stylish outfits for the modern workplace.',
      products: [4, 5, 6],
    },
    {
      id: 3,
      title: 'Weekend Vibes',
      image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&h=1000&fit=crop',
      description: 'Relaxed and comfortable looks for your weekend adventures.',
      products: [7, 8, 9],
    },
    {
      id: 4,
      title: 'Evening Elegance',
      image: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=1000&fit=crop',
      description: 'Sophisticated ensembles for special occasions and nights out.',
      products: [10, 11, 12],
    },
    {
      id: 5,
      title: 'Street Style',
      image: 'https://images.unsplash.com/photo-1485230946086-1d99d5297182?w=800&h=1000&fit=crop',
      description: 'Bold and trendy urban fashion statements.',
      products: [13, 14, 15],
    },
    {
      id: 6,
      title: 'Minimalist',
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=1000&fit=crop',
      description: 'Clean lines and simple silhouettes for a timeless look.',
      products: [16, 17, 18],
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30 z-10" />
        <img
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&h=600&fit=crop"
          alt="Lookbook"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="relative z-20 text-center text-white px-4">
          <h1 className="text-5xl font-bold mb-4">Lookbook</h1>
          <p className="text-xl max-w-2xl mx-auto">
            Get inspired by our curated collection of outfits and styles
          </p>
        </div>
      </section>

      {/* Looks Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {looks.map(look => (
            <Card key={look.id} className="group overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-[3/4] overflow-hidden">
                  <img
                    src={look.image}
                    alt={look.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <Button size="icon" variant="secondary">
                      <Heart className="h-5 w-5" />
                    </Button>
                    <Button size="icon" variant="secondary">
                      <ShoppingCart className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{look.title}</h3>
                  <p className="text-muted-foreground mb-4">{look.description}</p>
                  <Button variant="outline" className="w-full">
                    Shop the Look
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-muted/50 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Create Your Own Style</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Explore our collection and mix and match to create your perfect look
          </p>
          <Link to="/products">
            <Button size="lg">Start Shopping</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default LookbookPage;
