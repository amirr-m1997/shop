import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Package, PackageX } from 'lucide-react';
import { Button } from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { productsAPI } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import RecommendationsSection from '../components/RecommendationsSection';
import ProductCard from '../components/ProductCard';
import ProductGallery from '../components/product/ProductGallery';
import ProductInfo from '../components/product/ProductInfo';
import VariantSelector from '../components/product/VariantSelector';
import ProductActions from '../components/product/ProductActions';
import ReviewsSection from '../components/product/ReviewsSection';
import ProductDetailSkeleton from '../components/skeletons/ProductDetailSkeleton';
import { PLACEHOLDER_IMG } from '../lib/placeholders';
import { ProductSEO } from '../lib/seo';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [cartError, setCartError] = useState('');
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
  const [zooming, setZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const mainImageRef = useRef(null);
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const response = await productsAPI.getProduct(slug);
        setProduct(response.data);
        setSelectedImage(0);
        setQuantity(1);
        if (response.data.available_sizes?.length > 0) {
          setSelectedSize(response.data.available_sizes[0].id);
        }
        if (response.data.available_colors?.length > 0) {
          setSelectedColor(response.data.available_colors[0].id);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        setProduct(null);
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
        const items = (res.data.results || res.data).filter((p) => p.id !== product.id).slice(0, 4);
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

    if (maxStock < 1) {
      setCartError('متأسفانه این ترکیب موجودی ندارد.');
      return;
    }

    if (quantity > maxStock) {
      setCartError(`حداکثر ${maxStock} عدد می‌توانید سفارش دهید.`);
      return;
    }

    setCartError('');

    try {
      let variantId = null;
      if (product.variants) {
        const variant = product.variants.find(
          (v) =>
            String(v.size) === String(selectedSize) &&
            String(v.color) === String(selectedColor)
        );
        if (variant) variantId = variant.id;
      }

      const payload = {
        product_id: product.id,
        quantity,
      };
      if (variantId) payload.variant_id = variantId;

      await addToCart(payload);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 3000);
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || 'خطا در افزودن به سبد خرید';
      setCartError(msg);
    }
  };

  const images = product?.images?.length
    ? product.images
    : [{ id: 0, image: PLACEHOLDER_IMG }];

  const goImage = (dir) => {
    setSelectedImage((prev) => {
      const next = prev + dir;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  };

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="min-h-[70vh]">
        <EmptyState
          icon={PackageX}
          badge="محصول"
          title="محصول مورد نظر یافت نشد"
          description="این محصول حذف شده یا در دسترس نیست. محصولات مشابه را کشف کنید."
          primaryLabel="مشاهده همه محصولات"
          primaryTo="/products"
          secondaryLabel="بازگشت به خانه"
          secondaryTo="/"
          accent="from-amber-500/15 via-orange-500/10 to-yellow-500/10"
        />
      </div>
    );
  }

  let maxStock = product.stock;
  if (product.variants?.length && selectedSize && selectedColor) {
    const v = product.variants.find(
      (v) => String(v.size) === String(selectedSize) && String(v.color) === String(selectedColor)
    );
    if (v) maxStock = v.effective_stock ?? maxStock;
  }

  return (
    <div className="min-h-screen pb-16">
      <ProductSEO product={product} />
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 pt-6">
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
          <Link to="/" className="transition-colors hover:text-foreground">
            خانه
          </Link>
          <ChevronLeft className="h-3.5 w-3.5 opacity-50" />
          <Link to="/products" className="transition-colors hover:text-foreground">
            فروشگاه
          </Link>
          {product.category_name && (
            <>
              <ChevronLeft className="h-3.5 w-3.5 opacity-50" />
              <span className="text-foreground/80">{product.category_name}</span>
            </>
          )}
          <ChevronLeft className="h-3.5 w-3.5 opacity-50" />
          <span className="line-clamp-1 font-medium text-foreground">{product.name}</span>
        </nav>
      </div>

      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          <ProductGallery
            images={images}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
            goImage={goImage}
            zooming={zooming}
            setZooming={setZooming}
            zoomPos={zoomPos}
            setZoomPos={setZoomPos}
            mainImageRef={mainImageRef}
            product={product}
          />

          {/* ═══ Product Info ═══ */}
          <div className="flex flex-col">
            <div className="rounded-[1.75rem] border border-border/40 bg-card/70 p-6 shadow-xl shadow-black/[0.03] backdrop-blur-xl dark:border-white/[0.08] dark:bg-card/50 sm:p-8">
              <ProductInfo product={product} maxStock={maxStock} selectedSize={selectedSize} selectedColor={selectedColor} />

              <VariantSelector
                product={product}
                selectedSize={selectedSize}
                setSelectedSize={setSelectedSize}
                selectedColor={selectedColor}
                setSelectedColor={setSelectedColor}
                quantity={quantity}
                setQuantity={setQuantity}
                maxStock={maxStock}
              />

              <ProductActions
                isAuthenticated={isAuthenticated}
                handleAddToCart={handleAddToCart}
                addedToCart={addedToCart}
                cartError={cartError}
                selectedSize={selectedSize}
                selectedColor={selectedColor}
                maxStock={maxStock}
                product={product}
              />
            </div>
          </div>
        </div>

        <ReviewsSection
          reviews={reviews}
          reviewRating={reviewRating}
          setReviewRating={setReviewRating}
          reviewTitle={reviewTitle}
          setReviewTitle={setReviewTitle}
          reviewComment={reviewComment}
          setReviewComment={setReviewComment}
          reviewSubmitting={reviewSubmitting}
          reviewSubmitted={reviewSubmitted}
          handleSubmitReview={handleSubmitReview}
          isAuthenticated={isAuthenticated}
        />

        {/* AI Recommendations */}
        <div className="mt-16">
          <RecommendationsSection productId={product?.id} />
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-7 text-2xl font-bold tracking-tight sm:text-3xl">
              شاید این را هم دوست داشته باشید
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} size="large" />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
