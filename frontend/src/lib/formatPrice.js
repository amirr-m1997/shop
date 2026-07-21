/**
 * Format a price value as Tomans (Iranian currency).
 * Prices in the backend are already in Tomans.
 */
export function formatPrice(price) {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (num == null || isNaN(num)) return '۰ تومان';
  return Math.round(num).toLocaleString('fa-IR') + ' ';
}

/**
 * Format a price value as Tomans without the label (just the number).
 */
export function formatPriceNumber(price) {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (num == null || isNaN(num)) return '۰';
  return Math.round(num).toLocaleString('fa-IR');
}
