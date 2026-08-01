import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'فروشگاه مد';
const SITE_URL = 'https://fashionshop.ir';
const DEFAULT_DESCRIPTION = 'فروشگاه آنلاین پوشاک مردانه و زنانه | جدیدترین مدل‌های روز با بهترین قیمت و کیفیت';
const DEFAULT_OG_IMAGE = '/og-default.jpg';

export function buildUrl(path) {
  return `${SITE_URL}${path}`;
}

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  image,
  url,
  type = 'website',
  noIndex = false,
  children,
}) {
  const location = useLocation();
  const canonicalUrl = url || buildUrl(location.pathname);
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | فروشگاه آنلاین پوشاک`;
  const ogImage = image || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="fa_IR" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {children}
    </Helmet>
  );
}

export function ProductSEO({ product }) {
  if (!product) return null;

  const title = product.name;
  const description = product.short_description
    || product.description?.substring(0, 160)
    || `${product.name} - ${product.category_name || 'محصول'} با بهترین قیمت در فروشگاه مد`;
  const image = product.primary_image || product.images?.[0]?.image;
  const canonicalUrl = buildUrl(`/product/${product.slug}`);

  const hasRating = product.rating && product.rating > 0;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.short_description || product.name,
    image: product.images?.map(img => img.image) || (image ? [image] : []),
    url: canonicalUrl,
    sku: product.sku || undefined,
    brand: product.brand_name ? {
      '@type': 'Brand',
      name: product.brand_name,
    } : undefined,
    category: product.category_name || undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'IRR',
      availability: product.stock > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: canonicalUrl,
      seller: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
    aggregateRating: hasRating ? {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.review_count || 0,
      bestRating: 5,
      worstRating: 1,
    } : undefined,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'خانه',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'محصولات',
        item: `${SITE_URL}/products`,
      },
    ],
  };

  if (product.category_name) {
    breadcrumbLd.itemListElement.splice(2, 0, {
      '@type': 'ListItem',
      position: 3,
      name: product.category_name,
      item: `${SITE_URL}/category/${product.category || ''}`,
    });
  }

  return (
    <SEO
      title={title}
      description={description}
      image={image}
      url={canonicalUrl}
      type="product"
    >
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbLd)}
      </script>
    </SEO>
  );
}

export function CategorySEO({ category, productCount }) {
  if (!category) return null;

  const title = `خرید ${category.name}`;
  const description = category.description
    || `خرید آنلاین ${category.name} با بهترین قیمت و کیفیت. ${productCount || ''} محصول موجود.`;
  const canonicalUrl = buildUrl(`/category/${category.slug}`);

  return (
    <SEO
      title={title}
      description={description}
      url={canonicalUrl}
      type="website"
    />
  );
}

export function BlogPostSEO({ post }) {
  if (!post) return null;

  const title = post.title;
  const description = post.excerpt
    || post.content?.replace(/<[^>]+>/g, '').substring(0, 160)
    || `${post.title} - مجله فروشگاه مد`;
  const image = post.image;
  const canonicalUrl = buildUrl(`/blog/${post.slug}`);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: description,
    image: image || undefined,
    url: canonicalUrl,
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    author: {
      '@type': 'Person',
      name: post.author_name || 'تیم مد',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
  };

  return (
    <SEO
      title={title}
      description={description}
      image={image}
      url={canonicalUrl}
      type="article"
    >
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </SEO>
  );
}

export function StyleSEO({ style }) {
  if (!style) return null;

  const title = `استایل ${style.title}`;
  const description = style.description
    || `کشف کنید: ${style.title} - مجموعه محصولات ست‌شده در فروشگاه مد`;
  const image = style.image;
  const canonicalUrl = buildUrl(`/style/${style.slug}`);

  return (
    <SEO
      title={title}
      description={description}
      image={image}
      url={canonicalUrl}
    />
  );
}

export default SEO;
