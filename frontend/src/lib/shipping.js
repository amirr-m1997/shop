import { useEffect, useState } from 'react';
import { pagesAPI } from '../services/api';

/** پیش‌فرض‌ها — هم‌راستا با SiteSettings در بک‌اند */
export const DEFAULT_SHIPPING = {
  freeShippingThreshold: 500000,
  shippingCost: 45000,
};

/**
 * محاسبه هزینه ارسال بر اساس جمع سبد و تنظیمات سایت.
 */
export function calcShipping(subtotal, config = DEFAULT_SHIPPING) {
  const threshold = Number(config.freeShippingThreshold) || DEFAULT_SHIPPING.freeShippingThreshold;
  const cost = Number(config.shippingCost) || DEFAULT_SHIPPING.shippingCost;
  const amount = Number(subtotal) || 0;
  const isFree = amount >= threshold;
  const remaining = Math.max(0, threshold - amount);
  const progress = threshold > 0 ? Math.min(100, (amount / threshold) * 100) : 100;

  return {
    shipping: isFree ? 0 : cost,
    isFree,
    threshold,
    cost,
    remaining,
    progress,
  };
}

/**
 * هوک: تنظیمات ارسال را از API می‌گیرد (SiteSettings).
 * SiteFeature فقط متن نمایشی است؛ منبع حقیقت اینجاست.
 */
export function useShippingConfig() {
  const [config, setConfig] = useState(DEFAULT_SHIPPING);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    pagesAPI
      .getSettings()
      .then((res) => {
        if (cancelled || !res?.data) return;
        setConfig({
          freeShippingThreshold:
            Number(res.data.free_shipping_threshold) || DEFAULT_SHIPPING.freeShippingThreshold,
          shippingCost:
            Number(res.data.shipping_cost) || DEFAULT_SHIPPING.shippingCost,
        });
      })
      .catch(() => {
        // fallback to defaults
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading };
}
