import { useState } from 'react';
import { ordersAPI, paymentsAPI } from '../services/api';
import { EMAIL_INVALID_MSG, EMAIL_REGEX } from '../components/checkout/constants';

const getOrderError = (data, fallback) => {
  if (typeof data === 'string') return data;
  if (data?.guest_email) {
    return Array.isArray(data.guest_email) ? data.guest_email[0] : data.guest_email;
  }
  if (data?.error) return data.error;
  if (data?.detail) return data.detail;
  if (data && typeof data === 'object') {
    const firstValue = data[Object.keys(data)[0]];
    if (Array.isArray(firstValue)) return firstValue[0] || fallback;
    if (typeof firstValue === 'string') return firstValue;
  }
  return fallback;
};

export const validateCheckoutAddress = ({ isAuthenticated, selectedAddress, guestInfo, address }) => {
  if (isAuthenticated) {
    return selectedAddress ? null : 'لطفاً آدرس ارسال را انتخاب کنید';
  }
  if (!guestInfo.email?.trim()) return 'لطفاً ایمیل خود را برای پیگیری سفارش وارد کنید';
  if (!EMAIL_REGEX.test(guestInfo.email.trim())) return EMAIL_INVALID_MSG;
  if (!address.full_name || !address.address_line1 || !address.city) {
    return 'لطفاً فیلدهای آدرس ارسال را تکمیل کنید';
  }
  if (!address.postal_code || !/^\d{10}$/.test(address.postal_code)) {
    return 'کد پستی اجباری است و باید ۱۰ رقم باشد';
  }
  return null;
};

export const useCheckoutSubmit = ({
  isAuthenticated,
  selectedAddress,
  guestInfo,
  address,
  paymentMethod,
  orderNotes,
  coupon,
  clearCart,
  removeCoupon,
  navigate,
  toast,
  setStep,
  setError,
  setGuestEmailError,
}) => {
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;
    const validationError = validateCheckoutAddress({
      isAuthenticated,
      selectedAddress,
      guestInfo,
      address,
    });
    if (validationError) {
      setError(validationError);
      if (!isAuthenticated && (!guestInfo.email?.trim() || !EMAIL_REGEX.test(guestInfo.email.trim()))) {
        setGuestEmailError(!guestInfo.email?.trim()
          ? 'لطفاً ایمیل خود را وارد کنید'
          : validationError);
      }
      setStep(2);
      return;
    }

    setLoading(true);
    setIsSubmitting(true);
    setError('');
    try {
      const payload = {
        payment_method: paymentMethod,
        notes: orderNotes,
        coupon_code: coupon?.code || '',
      };
      if (isAuthenticated) {
        payload.shipping_address_id = selectedAddress;
      } else {
        payload.guest_email = guestInfo.email.trim();
        payload.guest_phone = guestInfo.phone.trim();
        payload.full_name = address.full_name;
        payload.phone = address.phone || guestInfo.phone.trim();
        payload.address_line1 = address.address_line1;
        payload.address_line2 = address.address_line2;
        payload.city = address.city;
        payload.state = address.state;
        payload.postal_code = address.postal_code;
        payload.country = 'Iran';
      }

      const orderResponse = await ordersAPI.createOrder(payload);
      const finishLocally = async () => {
        try { await clearCart(); } catch { /* cart already emptied server-side */ }
        removeCoupon();
      };

      try {
        const paymentResponse = await paymentsAPI.initiate({ order_id: orderResponse.data.id });
        if (paymentResponse.data.gateway_url) {
          window.location.href = paymentResponse.data.gateway_url;
          return;
        }
      } catch (paymentError) {
        console.error('Payment initiation error:', paymentError);
        await finishLocally();
        const expiresAt = orderResponse.data.expires_at || '';
        navigate(`/order-success?order_number=${encodeURIComponent(orderResponse.data.order_number)}&expires_at=${encodeURIComponent(expiresAt)}&payment=pending`);
        return;
      }

      await finishLocally();
      const expiresAt = orderResponse.data.expires_at || '';
      navigate(`/order-success?order_number=${orderResponse.data.order_number}&expires_at=${encodeURIComponent(expiresAt)}`);
    } catch (error) {
      console.error('Error placing order:', error);
      const message = getOrderError(
        error.response?.data,
        'ثبت سفارش ناموفق بود. لطفاً دوباره تلاش کنید.',
      );
      if (error.response?.data?.guest_email) setGuestEmailError(message);
      setError(message);
      toast({ title: 'خطا در ثبت سفارش', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  return { loading, isSubmitting, handlePlaceOrder };
};
