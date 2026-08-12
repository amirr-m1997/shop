import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import WishlistButton from '../WishlistButton';
import ShareButton from '../ShareButton';
import ResponsiveImage from '../ui/ResponsiveImage';

const ProductGallery = ({
  images,
  selectedImage,
  setSelectedImage,
  goImage,
  zooming,
  setZooming,
  zoomPos,
  setZoomPos,
  mainImageRef,
  product,
}) => {
  const handleImageMouseMove = (e) => {
    if (!mainImageRef.current) return;
    const rect = mainImageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  return (
    <div className="space-y-3 lg:space-y-4">
      <div className="relative">
        <div className="pointer-events-none absolute -inset-3 rounded-[2.5rem] bg-gradient-to-br from-primary/[0.04] via-transparent to-primary/[0.06] blur-2xl dark:from-white/[0.04] dark:to-white/[0.03]" />

        <div
          ref={mainImageRef}
          className="group relative aspect-square overflow-hidden rounded-[2rem] border border-border/50 bg-card shadow-[0_24px_80px_-32px_hsl(var(--foreground)/0.28)] ring-1 ring-white/20 backdrop-blur-sm transition-shadow duration-500 hover:shadow-[0_30px_90px_-30px_hsl(var(--foreground)/0.34)] lg:rounded-[2.25rem] dark:ring-white/5"
          onMouseEnter={() => setZooming(true)}
          onMouseLeave={() => setZooming(false)}
          onMouseMove={handleImageMouseMove}
        >
          <ResponsiveImage
            src={images[selectedImage]?.image}
            alt={product.name}
            widths={[320, 384, 480, 640, 768, 960, 1280]}
            sizes="(min-width: 1280px) 650px, (min-width: 1024px) 52vw, calc(100vw - 2rem)"
            width="1200"
            height="1200"
            loading="eager"
            fetchPriority="high"
            className="h-full w-full object-cover transition-transform duration-500 ease-out will-change-transform"
            style={
              zooming
                ? {
                    transform: 'scale(1.7)',
                    transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  }
                : undefined
            }
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/[0.08] via-transparent to-white/[0.04] dark:to-white/[0.02]" />

          <div className="absolute right-4 top-4 z-10 flex flex-col gap-2.5">
            {product.discount_percentage > 0 && (
              <span className="rounded-full bg-destructive px-3 py-1.5 text-[11px] font-extrabold text-destructive-foreground shadow-lg shadow-destructive/20 backdrop-blur-md">
                −{product.discount_percentage}٪
              </span>
            )}
            {product.is_new_arrival && (
              <span className="rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-extrabold text-white shadow-lg shadow-emerald-500/25 backdrop-blur-md">
                جدید
              </span>
            )}
          </div>

          <WishlistButton
            productId={product.id}
            size="h-[18px] w-[18px]"
            className="!static flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-background/70 shadow-xl shadow-black/10 backdrop-blur-xl dark:border-white/10"
          />

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => goImage(-1)}
                className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-background/70 text-foreground opacity-0 shadow-xl shadow-black/10 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:bg-background group-hover:opacity-100 focus-visible:opacity-100 dark:border-white/10"
                aria-label="تصویر قبلی"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => goImage(1)}
                className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 bg-background/70 text-foreground opacity-0 shadow-xl shadow-black/10 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:bg-background group-hover:opacity-100 focus-visible:opacity-100 dark:border-white/10"
                aria-label="تصویر بعدی"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden items-center gap-2 rounded-full border border-white/30 bg-background/70 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground opacity-0 shadow-lg backdrop-blur-xl transition-opacity duration-300 group-hover:opacity-100 dark:border-white/10 lg:flex">
            <Maximize2 className="h-3.5 w-3.5" />
            برای زوم نزدیک شوید
          </div>

          <div className="absolute bottom-4 right-4 z-10 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2">
            <ShareButton product={product} inline />
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/30 bg-background/70 px-2.5 py-2 shadow-xl backdrop-blur-xl dark:border-white/10 lg:flex">
              {images.map((image, index) => (
                <button
                  key={image.id ?? index}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  aria-label={`نمایش تصویر ${(index + 1).toLocaleString('fa-IR')}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    selectedImage === index
                      ? 'w-6 bg-foreground'
                      : 'w-1.5 bg-foreground/25 hover:bg-foreground/45'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1 lg:gap-3 scrollbar-hide">
          {images.map((image, index) => (
            <button
              key={image.id ?? index}
              type="button"
              onClick={() => setSelectedImage(index)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-muted transition-all duration-300 sm:h-24 sm:w-24 ${
                selectedImage === index
                  ? 'border-foreground/80 shadow-lg shadow-foreground/10 ring-2 ring-foreground/10'
                  : 'border-border/60 opacity-65 hover:opacity-100 hover:border-foreground/25'
              }`}
            >
              <ResponsiveImage
                src={image.image}
                alt={`${product.name} ${(index + 1).toLocaleString('fa-IR')}`}
                widths={[160, 240]}
                sizes="(min-width: 640px) 96px, 80px"
                width="96"
                height="96"
                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductGallery;
