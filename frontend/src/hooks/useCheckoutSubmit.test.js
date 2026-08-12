import { describe, expect, it } from 'vitest';
import { EMAIL_INVALID_MSG } from '../components/checkout/constants';
import { validateCheckoutAddress } from './useCheckoutSubmit';

const guestCheckout = {
  isAuthenticated: false,
  selectedAddress: null,
  guestInfo: { email: 'buyer@example.com', phone: '' },
  address: {
    full_name: 'خریدار مهمان',
    address_line1: 'خیابان نمونه',
    state: 'تهران',
    city: 'تهران',
    postal_code: '1234567890',
  },
};

describe('checkout address validation', () => {
  it('requires a selected address for authenticated checkout', () => {
    expect(validateCheckoutAddress({ ...guestCheckout, isAuthenticated: true }))
      .toBe('لطفاً آدرس ارسال را انتخاب کنید');
    expect(validateCheckoutAddress({ ...guestCheckout, isAuthenticated: true, selectedAddress: 12 }))
      .toBeNull();
  });

  it('validates guest email before the shipping address', () => {
    expect(validateCheckoutAddress({
      ...guestCheckout,
      guestInfo: { ...guestCheckout.guestInfo, email: 'invalid' },
    })).toBe(EMAIL_INVALID_MSG);
  });

  it('requires a complete guest address and a ten-digit postal code', () => {
    expect(validateCheckoutAddress({
      ...guestCheckout,
      address: { ...guestCheckout.address, city: '' },
    })).toBe('تکمیل آدرس ارسال برای سفارش مهمان الزامی است.');
    expect(validateCheckoutAddress({
      ...guestCheckout,
      address: { ...guestCheckout.address, state: '' },
    })).toBe('تکمیل آدرس ارسال برای سفارش مهمان الزامی است.');
    expect(validateCheckoutAddress({
      ...guestCheckout,
      address: { ...guestCheckout.address, postal_code: '123' },
    })).toBe('کد پستی اجباری است و باید ۱۰ رقم باشد');
    expect(validateCheckoutAddress(guestCheckout)).toBeNull();
  });
});
