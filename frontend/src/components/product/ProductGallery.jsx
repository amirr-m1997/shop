import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import WishlistButton from '../WishlistButton';
import ShareButton from '../ShareButton';

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
    <div className="space-y-3">
      <div
        ref={mainImageRef}
        className="group relative aspect-square overflow-hidden rounded-[1.75rem] border border-border/40 bg-muted/40 shadow-xl shadow-black/[0.04] dark:border-white/[0.08] dark:shadow-black/30"
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={handleImageMouseMove}
      >
        <img
          src={images[selectedImage]?.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300"
          style={
            zooming
              ? {
                  transform: 'scale(1.75)',
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                }
              : undefined
          }
        />

        <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
          {product.discount_percentage > 0 && (
            <span className="rounded-xl bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground shadow-lg">
              −{product.discount_percentage}٪
            </span>
          )}
          {product.is_new_arrival && (
            <span className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
              جدید
            </span>
          )}
        </div>

        <WishlistButton
          productId={product.id}
          size="h-5 w-5"
          className="!top-4 !right-4 !h-11 !w-11 rounded-2xl bg-white/80 shadow-lg backdrop-blur-md dark:bg-black/50"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goImage(-1)}
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl border border-black/5 bg-white/80 text-foreground opacity-0 shadow-lg backdrop-blur-md transition-all group-hover:opacity-100 dark:border-white/10 dark:bg-black/50 dark:text-white"
              aria-label="تصویر قبلی"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goImage(1)}
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-2xl border border-black/5 bg-white/80 text-foreground opacity-0 shadow-lg backdrop-blur-md transition-all group-hover:opacity-100 dark:border-white/10 dark:bg-black/50 dark:text-white"
              aria-label="تصویر بعدی"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </>
        )}

        <div className="absolute bottom-4 left-4 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <ShareButton product={product} inline />
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.id ?? index}
              type="button"
              onClick={() => setSelectedImage(index)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 transition-all sm:h-24 sm:w-24 ${
                selectedImage === index
                  ? 'border-neutral-900 shadow-md dark:border-white'
                  : 'border-transparent opacity-70 hover:opacity-100'
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
      )}
    </div>
  );
};

export default ProductGallery;
