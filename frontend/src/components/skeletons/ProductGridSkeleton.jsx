import ProductCardSkeleton from './ProductCardSkeleton';

/**
 * Product grid skeleton — mirrors listing grid: grid-cols-2 sm:grid-cols-3 lg:grid-cols-4.
 */
const ProductGridSkeleton = ({ count = 8, size = 'large' }) => (
  <div
    className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4"
    aria-hidden="true"
  >
    {Array.from({ length: count }, (_, i) => (
      <ProductCardSkeleton key={i} size={size} delay={(i % 4) * 0.06} />
    ))}
  </div>
);

export default ProductGridSkeleton;
