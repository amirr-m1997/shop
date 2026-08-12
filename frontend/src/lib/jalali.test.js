import { describe, expect, it } from 'vitest';

import { getJalaliYear, toJalali } from './jalali';


describe('Jalali date formatting', () => {
  const nowruz = new Date(2024, 2, 20, 12, 30);

  it('formats Nowruz with Persian calendar and digits', () => {
    expect(toJalali(nowruz, { format: 'short' })).toBe('۱۴۰۳/۰۱/۰۱');
    expect(getJalaliYear(nowruz)).toBe('۱۴۰۳');
  });

  it('returns an empty string for missing or invalid values', () => {
    expect(toJalali(null)).toBe('');
    expect(toJalali('not-a-date')).toBe('');
  });
});
