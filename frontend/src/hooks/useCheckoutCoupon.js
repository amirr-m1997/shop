import { useEffect, useRef } from 'react';

export const useCheckoutCoupon = ({ initialCode, coupon, applyCoupon }) => {
  const initialCodeRef = useRef(initialCode);

  useEffect(() => {
    const code = initialCodeRef.current;
    if (code && !coupon) {
      applyCoupon(code).catch(() => {
        // CartContext exposes the user-facing coupon error.
      });
    }
  }, [applyCoupon, coupon]);
};
