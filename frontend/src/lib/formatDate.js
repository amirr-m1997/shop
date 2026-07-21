import { toJalali } from './jalali';

/**
 * Format any date to Jalali string.
 * Handles: ISO strings, Unix timestamps, Date objects, null.
 */
export function formatDate(dateInput) {
  if (!dateInput) return '';
  return toJalali(dateInput);
}

/**
 * Format date with time in Jalali
 */
export function formatDateTime(dateInput) {
  if (!dateInput) return '';
  return toJalali(dateInput, { format: 'time' });
}

/**
 * Short Jalali date (YYYY/MM/DD)
 */
export function formatDateShort(dateInput) {
  if (!dateInput) return '';
  return toJalali(dateInput, { format: 'short' });
}

/**
 * Relative time in Persian
 */
export function formatRelativeDate(dateInput) {
  if (!dateInput) return '';
  return toJalali(dateInput, { format: 'relative' });
}
