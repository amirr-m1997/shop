/**
 * Jalali (Persian/Solar) date utilities
 * Converts Gregorian dates to Jalali format
 */

// Days in each Jalali month
const JALALI_MONTH_DAYS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];

function gregorianToJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy, jm, jd;
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
  jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return [jy, jm, jd];
}

/**
 * Format a date string or Date object to Jalali
 * @param {string|Date} dateInput - ISO date string or Date object
 * @param {object} options - Format options
 * @returns {string} Formatted Jalali date string
 */
export function toJalali(dateInput, options = {}) {
  if (!dateInput) return '';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();

  const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);

  const months = [
    'ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن',
    'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'
  ];

  const jalaliMonths = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  const jdStr = String(jd).padStart(2, '0');
  const jmStr = String(jm).padStart(2, '0');

  if (options.format === 'full') {
    return `${jd} ${jalaliMonths[jm - 1]} ${jy}`;
  }

  if (options.format === 'short') {
    return `${jdStr}/${jmStr}/${jy}`;
  }

  if (options.format === 'time') {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${jdStr}/${jmStr}/${jy} ${hours}:${minutes}`;
  }

  if (options.format === 'relative') {
    return getRelativeTime(date);
  }

  // Default: "۱۵ فروردین ۱۴۰۳"
  return `${jd} ${jalaliMonths[jm - 1]} ${jy}`;
}

/**
 * Format date to Jalali with time
 */
export function toJalaliWithTime(dateInput) {
  return toJalali(dateInput, { format: 'time' });
}

/**
 * Format date to short Jalali (YYYY/MM/DD)
 */
export function toJalaliShort(dateInput) {
  return toJalali(dateInput, { format: 'short' });
}

/**
 * Get relative time in Persian
 */
export function getRelativeTime(dateInput) {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'همین الان';
  if (diffMin < 60) return `${diffMin} دقیقه پیش`;
  if (diffHour < 24) return `${diffHour} ساعت پیش`;
  if (diffDay < 7) return `${diffDay} روز پیش`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} هفته پیش`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} ماه پیش`;
  return `${Math.floor(diffDay / 365)} سال پیش`;
}

/**
 * Convert Jalali to Gregorian (for date pickers)
 */
export function jalaliToGregorian(jy, jm, jd) {
  let sal_a, sm, sd;

  jy += 1595;
  const days = -355668 + (365 * jy) + Math.floor(jy / 33 * 8) + Math.floor(((jy % 33) + 3) / 4) + jd;

  if (jm < 7) {
    sm = jm;
  } else {
    sm = jm + 1;
  }
  if (sm > 12) {
    sm -= 12;
    jy += 1;
  }

  const jdm = [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  sd = days - jdm[sm];

  const gy = jy + 621;
  let gm;

  if (sd >= 0) {
    gm = sm + 1;
  } else {
    gm = sm;
    sd += 31;
  }

  return new Date(gy, gm - 1, sd);
}
