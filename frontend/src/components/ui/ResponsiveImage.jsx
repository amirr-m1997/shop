const DEFAULT_WIDTHS = [320, 480, 640, 768, 960, 1280, 1600];

const isOptimizable = (src) => {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return false;
  try {
    const url = new URL(src, window.location.origin);
    return url.pathname.startsWith('/media/');
  } catch {
    return false;
  }
};

const variantUrl = (src, width, format) => {
  const url = new URL('/api/images/optimized/', window.location.origin);
  const source = new URL(src, window.location.origin);
  // URL.pathname keeps existing percent escapes; decode once before
  // URLSearchParams encodes it, otherwise Persian filenames become %25D9...
  url.searchParams.set('src', decodeURIComponent(source.pathname));
  url.searchParams.set('w', width);
  url.searchParams.set('format', format);
  return `${url.pathname}${url.search}`;
};

const makeSrcSet = (src, widths, format) =>
  widths.map((width) => `${variantUrl(src, width, format)} ${width}w`).join(', ');

const ResponsiveImage = ({
  src,
  alt = '',
  widths = DEFAULT_WIDTHS,
  sizes = '100vw',
  width,
  height,
  loading = 'lazy',
  fetchPriority,
  decoding = 'async',
  ...imageProps
}) => {
  if (!isOptimizable(src)) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={decoding}
        {...imageProps}
      />
    );
  }

  return (
    <picture>
      <source type="image/avif" srcSet={makeSrcSet(src, widths, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={makeSrcSet(src, widths, 'webp')} sizes={sizes} />
      <img
        src={src}
        srcSet={makeSrcSet(src, widths, 'webp')}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={decoding}
        sizes={sizes}
        {...imageProps}
      />
    </picture>
  );
};

export default ResponsiveImage;
