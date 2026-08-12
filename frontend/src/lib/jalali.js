/**
 * Central Persian (Jalali) date helpers.
 *
 * Dates stay Gregorian/ISO at the API boundary. Conversion happens only when
 * a value is rendered, so sorting, time zones and payment timestamps remain
 * reliable.
 */

const LOCALE = 'fa-IR-u-ca-persian-nu-persian';

const parseDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatter = (options) => new Intl.DateTimeFormat(LOCALE, options);

export function toJalali(dateInput, options = {}) {
  const date = parseDate(dateInput);
  if (!date) return '';

  if (options.format === 'relative') return getRelativeTime(date);

  if (options.format === 'timeOnly') {
    return formatter({ hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  }

  if (options.format === 'year') {
    return formatter({ year: 'numeric' }).format(date);
  }

  if (options.format === 'short') {
    return formatter({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }

  if (options.format === 'time') {
    return formatter({
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(date);
  }

  return formatter({
    year: 'numeric',
    month: options.format === 'full' ? 'long' : 'long',
    day: 'numeric',
  }).format(date);
}

export const toJalaliWithTime = (value) => toJalali(value, { format: 'time' });
export const toJalaliShort = (value) => toJalali(value, { format: 'short' });
export const getJalaliYear = (value = new Date()) => toJalali(value, { format: 'year' });
export const formatPersianTime = (value) => toJalali(value, { format: 'timeOnly' });

export function getRelativeTime(dateInput) {
  const date = parseDate(dateInput);
  if (!date) return '';

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absolute = Math.abs(diffSeconds);
  let value;
  let unit;

  if (absolute < 60) {
    value = diffSeconds;
    unit = 'second';
  } else if (absolute < 3600) {
    value = Math.round(diffSeconds / 60);
    unit = 'minute';
  } else if (absolute < 86400) {
    value = Math.round(diffSeconds / 3600);
    unit = 'hour';
  } else if (absolute < 2592000) {
    value = Math.round(diffSeconds / 86400);
    unit = 'day';
  } else if (absolute < 31536000) {
    value = Math.round(diffSeconds / 2592000);
    unit = 'month';
  } else {
    value = Math.round(diffSeconds / 31536000);
    unit = 'year';
  }

  return new Intl.RelativeTimeFormat('fa-IR', { numeric: 'auto' }).format(value, unit);
}

/** Convert a Jalali picker value back to a Gregorian Date. */
export function jalaliToGregorian(jy, jm, jd) {
  jy = Number(jy);
  jm = Number(jm);
  jd = Number(jd);
  let days = -355668 + (365 * (jy + 1595))
    + (Math.floor((jy + 1595) / 33) * 8)
    + Math.floor((((jy + 1595) % 33) + 3) / 4)
    + jd + (jm < 7 ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthDays = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 1;
  while (gm <= 12 && gd > monthDays[gm]) gd -= monthDays[gm++];
  return new Date(gy, gm - 1, gd);
}
