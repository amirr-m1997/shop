/**
 * Shared navigation config for desktop + mobile header systems.
 * Visual layouts differ; data and routes stay unified.
 */

export const STATIC_NAV = [
  { id: 'home', label: 'خانه', href: '/' },
  { id: 'products', label: 'محصولات', href: '/products' },
  { id: 'new', label: 'جدیدترین', href: '/new-arrivals' },
  { id: 'sale', label: 'حراج', href: '/sale', accent: true },
  { id: 'blog', label: 'مجله', href: '/blog' },
  { id: 'size', label: 'راهنمای سایز', href: '/size-finder' },
  { id: 'about', label: 'درباره ما', href: '/about' },
];

/** Horizontal chips under mobile search */
export const MOBILE_CHIPS = [
  { id: 'new', label: 'جدیدترین', href: '/new-arrivals' },
  { id: 'trending', label: 'ترندها', href: '/trending' },
  { id: 'sale', label: 'تخفیف', href: '/sale', accent: true },
];

/** Desktop level-2 static links (categories injected between products & new) */
export const DESKTOP_STATIC_BEFORE = [
  { id: 'home', label: 'خانه', href: '/' },
  { id: 'products', label: 'محصولات', href: '/products' },
];

export const DESKTOP_STATIC_AFTER = [
  { id: 'new', label: 'جدیدترین', href: '/new-arrivals' },
  { id: 'sale', label: 'حراج', href: '/sale', accent: true },
  { id: 'blog', label: 'مجله', href: '/blog' },
  { id: 'size', label: 'راهنمای سایز', href: '/size-finder' },
];

/** Group children into columns for mega menu */
export function groupChildren(children = [], columns = 3) {
  if (!children.length) return [];
  const cols = Array.from({ length: Math.min(columns, children.length) }, () => []);
  children.forEach((child, i) => {
    cols[i % cols.length].push(child);
  });
  return cols.filter((c) => c.length > 0);
}

/** Heuristic: treat top-level categories with several children as mega-menu worthy */
export function isMegaCategory(cat) {
  return Boolean(cat?.children && cat.children.length >= 2);
}
