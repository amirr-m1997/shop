import { describe, expect, it } from 'vitest';
import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  it('formats a numeric price without throwing', () => {
    expect(formatPrice(125000)).toContain('۱۲۵');
  });
});
