import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, PackageX, ShoppingCart, Truck, ShieldCheck, RefreshCcw, Sparkles } from 'lucide-react';
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
import { useProductDetailQuery } from '../queries/productQueries';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const { data: product, isPending: loading, isError: productError } = useProductDetailQuery(slug);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [cartError, setCartError] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
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
    if (!product) return;
    setSelectedImage(0);
    setQuantity(1);
    setCartError('');
    setReviewSubmitted(false);
    setSelectedSize(product.available_sizes?.[0]?.id ?? null);
    setSelectedColor(product.available_colors?.[0]?.id ?? null);
  }, [product]);

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
    if (!selectedSize || !selectedColor) {
      setCartError('لطفاً سایز و رنگ مورد نظر را انتخاب کنید.');
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
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || 'خطا در افزودن به سبد خرید';
      setCartError(msg);
    }
  };

  const closeSuccessModal = () => setAddedToCart(false);
  const closeErrorModal = () => setCartError('');

  const productImages = product?.images?.length
    ? product.images
    : [{ id: 0, image: PLACEHOLDER_IMG, color: null }];

  const colorImages = productImages.filter((image) => String(image.color) === String(selectedColor));
  const uncategorizedImages = productImages.filter((image) => image.color == null);
  const images = (selectedColor && colorImages.length > 0 ? colorImages : uncategorizedImages.length > 0 ? uncategorizedImages : productImages)
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  useEffect(() => {
    setSelectedImage(0);
  }, [selectedColor, product?.id]);

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

  if (productError || !product) {
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
      (variant) =>
        String(variant.size) === String(selectedSize) &&
        String(variant.color) === String(selectedColor)
    );
    if (v) maxStock = v.effective_stock ?? maxStock;
  }

  const breadcrumbItems = [
    { label: 'خانه', to: '/' },
    { label: 'فروشگاه', to: '/products' },
    ...(product.category_name ? [{ label: product.category_name, to: `/products?category=${encodeURIComponent(product.category || product.category_name)}` }] : []),
    { label: product.name, to: null },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-20">
      <ProductSEO product={product} />

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute right-[-10%] top-[-8rem] h-72 w-72 rounded-full bg-primary/[0.045] blur-3xl" />
          <div className="absolute left-[-8%] top-24 h-80 w-80 rounded-full bg-primary/[0.035] blur-3xl" />
        </div>

        <div className="container mx-auto px-4 pt-5 sm:px-6 lg:px-8">
          <nav aria-label="مسیر محصول" className="mb-5 flex min-h-8 flex-wrap items-center gap-1 text-[11px] text-muted-foreground sm:mb-8 sm:text-xs">
            {breadcrumbItems.map((item, index) => (
              <React.Fragment key={`${item.label}-${index}`}>
                {item.to ? (
                  <Link
                    to={item.to}
                    className="rounded-full px-2 py-1 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="line-clamp-1 rounded-full bg-muted/55 px-2 py-1 font-semibold text-foreground/85">
                    {item.label}
                  </span>
                )}
                {index < breadcrumbItems.length - 1 && (
                  <ChevronLeft className="h-3 w-3 opacity-40" />
                )}
              </React.Fragment>
            ))}
          </nav>

          <div className="grid grid-cols-1 gap-8 pb-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-x-12 lg:gap-y-10 lg:pb-16">
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

            <aside className="relative lg:sticky lg:top-28 lg:self-start">
              <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent blur-2xl" />
              <div className="rounded-[2rem] border border-border/45 bg-card/55 p-5 shadow-[0_28px_90px_-48px_hsl(var(--foreground)/0.35)] ring-1 ring-white/20 backdrop-blur-2xl sm:p-7 lg:p-8 dark:ring-white/5">
                <ProductInfo
                  product={product}
                  maxStock={maxStock}
                  selectedSize={selectedSize}
                  selectedColor={selectedColor}
                />

                <div className="my-7 h-px bg-gradient-to-l from-border via-border/60 to-transparent" />

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

                <div className="my-7 h-px bg-gradient-to-l from-border via-border/60 to-transparent" />

                <ProductActions
                  isAuthenticated={isAuthenticated}
                  handleAddToCart={handleAddToCart}
                  addedToCart={addedToCart}
                  cartError={cartError}
                  onCloseSuccess={closeSuccessModal}
                  onCloseError={closeErrorModal}
                  selectedSize={selectedSize}
                  selectedColor={selectedColor}
                  maxStock={maxStock}
                  product={product}
                />

                <div className="mt-6 grid grid-cols-1 gap-2.5 rounded-[1.5rem] border border-border/45 bg-background/45 p-3 backdrop-blur-sm sm:grid-cols-3">
                  <div className="flex items-center gap-3 rounded-2xl px-3 py-2">
                    <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] font-extrabold text-foreground">ارسال سریع</p>
                      <p className="text-[10px] text-muted-foreground">بسته‌بندی ویژه</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl px-3 py-2">
                    <RefreshCcw className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] font-extrabold text-foreground">بازگشت آسان</p>
                      <p className="text-[10px] text-muted-foreground">تا ۳۰ روز</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl px-3 py-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] font-extrabold text-foreground">پرداخت امن</p>
                      <p className="text-[10px] text-muted-foreground">درگاه معتبر</p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
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
          productRating={product.rating}
        />

        <div className="mt-16 sm:mt-24">
          <RecommendationsSection productId={product?.id} />
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-16 sm:mt-24">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground/70">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  استایل مکمل
                </p>
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                  شاید این را هم دوست داشته باشید
                </h2>
              </div>
              <Link
                to="/products"
                className="hidden rounded-full border border-border/70 px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
              >
                مشاهده همه
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} size="large" />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 px-4 py-3 shadow-[0_-18px_50px_-30px_hsl(var(--foreground)/0.45)] backdrop-blur-2xl lg:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-foreground">{product.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {maxStock > 0 ? `${maxStock.toLocaleString('fa-IR')} عدد موجود` : 'ناموجود'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={maxStock < 1}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-foreground px-5 text-sm font-black text-background shadow-xl shadow-foreground/20 transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            <ShoppingCart className="h-4 w-4" />
            افزودن
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
