import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, Heart, Share2, Plus, Minus, ShoppingCart, Send, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { productsAPI } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice } from '../lib/formatPrice';
import { formatDate } from '../lib/formatDate';
import RecommendationsSection from '../components/RecommendationsSection';
import WishlistButton from '../components/WishlistButton';
import ShareButton from '../components/ShareButton';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addedToCart, setAddedToCart] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await productsAPI.getProduct(slug);
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
  }, [slug]);

  useEffect(() => {
    if (!product?.category) return;
    const fetchRelated = async () => {
      try {
        const res = await productsAPI.getProducts({ category: product.category, limit: 4 });
        const items = (res.data.results || res.data).filter(p => p.id !== product.id).slice(0, 4);
        setRelatedProducts(items);
      } catch (err) {
        console.error('Error fetching related products:', err);
      }
    };
    fetchRelated();
  }, [product?.category, product?.id]);

  useEffect(() => {
    if (!product?.id) return;
    const fetchReviews = async () => {
      try {
        const res = await productsAPI.getReviews(product.id);
        setReviews(res.data.results || res.data || []);
      } catch (err) {
        console.error('Error fetching reviews:', err);
      }
    };
    fetchReviews();
  }, [product?.id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setReviewSubmitting(true);
    try {
      await productsAPI.submitReview({
        product: product.id,
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
      });
      setReviewSubmitted(true);
      setReviewTitle('');
      setReviewComment('');
      setReviewRating(5);
      // Refresh reviews
      const res = await productsAPI.getReviews(product.id);
      setReviews(res.data.results || res.data || []);
    } catch (err) {
      console.error('Error submitting review:', err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!selectedSize || !selectedColor) {
      alert('لطفاً سایز و رنگ مورد نظر را انتخاب کنید.');
      return;
    }

    try {
      let variantId = null;

      if (product.variants) {
        const variant = product.variants.find(
          v => String(v.size) === String(selectedSize) && String(v.color) === String(selectedColor)
        );

        if (variant) {
          variantId = variant.id;
        }
      }

      const payload = {
        product_id: product.id,
        quantity: quantity,
      };

      if (variantId) {
        payload.variant_id = variantId;
      }

      await addToCart(payload);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 3000);
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
          <div className="relative aspect-square bg-muted rounded-lg overflow-hidden mb-4">
            <img
              src={product.images?.[selectedImage]?.image || 'https://via.placeholder.com/600x600'}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            <WishlistButton productId={product.id} size="h-6 w-6" className="top-4 right-4" />
            <ShareButton product={product} className="bottom-4 right-4" />
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
            <span className="text-muted-foreground">({product.review_count || 0} نظر)</span>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <span className="text-3xl font-bold">{formatPrice(product.price || 0)}</span>
            {product.compare_price && (
              <>
                <span className="text-xl text-red-500 line-through font-medium">
                  {formatPrice(product.compare_price)}
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
            <Link to="/size-finder">
              <Button variant="link" className="p-0 h-auto mt-2">
                راهنمای سایز
              </Button>
            </Link>
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
          <div className="mb-6">
            <Button size="lg" className="w-full" onClick={handleAddToCart}>
              <ShoppingCart className="ml-2 h-5 w-5" />
              افزودن به سبد خرید
            </Button>
          </div>

          {addedToCart && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
              محصول با موفقیت به سبد خرید اضافه شد!
            </div>
          )}

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

      {/* Reviews Section */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold mb-6">نظرات کاربران ({reviews.length})</h2>

        {/* Review Form */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">نظر خود را بنویسید</h3>
            {reviewSubmitted ? (
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-300">
                <CheckCircle className="h-5 w-5" />
                <span>نظر شما با موفقیت ثبت شد!</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">امتیاز</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-0.5"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            star <= reviewRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  placeholder="عنوان نظر"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  required
                />
                <textarea
                  placeholder="متن نظر خود را بنویسید..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                />
                <Button type="submit" disabled={reviewSubmitting}>
                  <Send className="ml-2 h-4 w-4" />
                  {reviewSubmitting ? 'در حال ارسال...' : 'ارسال نظر'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Reviews List */}
        <div className="space-y-4">
          {reviews.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              هنوز نظری ثبت نشده است. اولین نفری باشید که نظر می‌دهید!
            </p>
          ) : (
            reviews.map(review => (
              <Card key={review.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{review.owner_name || 'کاربر'}</span>
                        {review.is_verified_purchase && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 ml-1" />
                            خریدار تایید شده
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.created_at)}
                    </span>
                  </div>
                  {review.title && (
                    <h4 className="font-semibold mb-1">{review.title}</h4>
                  )}
                  <p className="text-muted-foreground text-sm">{review.comment}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* AI Recommendations */}
      <div className="mt-16">
        <RecommendationsSection productId={product?.id} />
      </div>

      {/* Recommended Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">شاید این را هم دوست داشته باشید</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {relatedProducts.map(p => (
              <Link key={p.id} to={`/product/${p.slug}`}>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                      <img
                        src={p.primary_image || 'https://via.placeholder.com/400x500?text=No+Image'}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                      <WishlistButton productId={p.id} />
                      <ShareButton product={p} />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold truncate">{p.name}</h3>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="font-bold">{formatPrice(p.price)}</span>
                        {p.compare_price && (
                          <span className="text-xs text-red-500 line-through font-medium">
                            {formatPrice(p.compare_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
