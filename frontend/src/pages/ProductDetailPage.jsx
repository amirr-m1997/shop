import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Heart, Share2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { productsAPI } from '../services/api';
import { useCart } from '../contexts/CartContext';

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await productsAPI.getProduct(id);
        setProduct(response.data);
        if (response.data.available_sizes?.length > 0) {
          setSelectedSize(response.data.available_sizes[0].id);
        }
        if (response.data.available_colors?.length > 0) {
          setSelectedColor(response.data.available_colors[0].id);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    try {
      // Find the variant matching selected size and color
      let variantId = null;
      if (selectedSize && selectedColor && product.variants) {
        const variant = product.variants.find(
          v => v.size === selectedSize && v.color === selectedColor
        );
        if (variant) {
          variantId = variant.id;
        }
      }

      await addToCart({
        product_id: product.id,
        variant_id: variantId,
        quantity,
      });
      alert('به سبد خرید اضافه شد!');
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">در حال بارگذاری...</div>;
  }

  if (!product) {
    return <div className="container mx-auto px-4 py-8">محصول یافت نشد</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div>
          <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-4">
            <img
              src={product.images[selectedImage]?.image || 'https://via.placeholder.com/600x600'}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {product.images?.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setSelectedImage(index)}
                className={`aspect-square rounded-lg overflow-hidden border-2 ${
                  selectedImage === index ? 'border-primary' : 'border-transparent'
                }`}
              >
                <img
                  src={image.image}
                  alt={`${product.name} ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div>
          <Badge className="mb-2">{product.category_name}</Badge>
          <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < Math.floor(product.rating || 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-muted-foreground">({product.review_count || 0} reviews)</span>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-bold">${product.price || 0}</span>
            {product.compare_price && (
              <>
                <span className="text-xl text-muted-foreground line-through">
                  ${product.compare_price}
                </span>
                <Badge className="bg-destructive">-{product.discount_percentage || 0}%</Badge>
              </>
            )}
          </div>

          <p className="text-muted-foreground mb-6">{product.description}</p>

          {/* Size Selection */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">سایز</h3>
            <div className="flex flex-wrap gap-2">
              {product.available_sizes?.map(size => (
                <Button
                  key={size.id}
                  variant={selectedSize === size.id ? 'default' : 'outline'}
                  onClick={() => setSelectedSize(size.id)}
                >
                  {size.name}
                </Button>
              ))}
            </div>
            <Button variant="link" className="p-0 h-auto mt-2">
              راهنمای سایز
            </Button>
          </div>

          {/* Color Selection */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">رنگ</h3>
            <div className="flex flex-wrap gap-2">
              {product.available_colors?.map(color => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={`w-10 h-10 rounded-full border-2 ${
                    selectedColor === color.id ? 'border-primary' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.hex_code }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">تعداد</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-semibold">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mb-6">
            <Button size="lg" className="flex-1" onClick={handleAddToCart}>
              <ShoppingCart className="mr-2 h-5 w-5" />
              افزودن به سبد خرید
            </Button>
            <Button size="lg" variant="outline">
              خرید فوری
            </Button>
            <Button size="lg" variant="outline">
              <Heart className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          {/* Product Details */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">کد محصول:</span>
                  <span>{product.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">برند:</span>
                  <span>{product.brand_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">جنس پارچه:</span>
                  <span>{product.fabric_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">موجودی:</span>
                  <span>{product.stock > 0 ? 'موجود' : 'ناموجود'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recommended Products */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">شاید این را هم دوست داشته باشید</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="aspect-[3/4] bg-muted" />
                <div className="p-4">
                  <h3 className="font-semibold truncate">محصول مشابه {i}</h3>
                  <div className="mt-2 font-bold">$99.99</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
