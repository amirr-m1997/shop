import { useEffect, useState } from 'react';

/**
 * Shared scroll state for compact sticky headers with hysteresis,
 * so tiny scroll changes near the boundary don't make the header flap.
 *
 * collapseAt: px scrolled before the header becomes compact.
 * expandAt:   px the user must scroll back to before it grows again.
 */
export function useHeaderScroll(collapseAt = 48, expandAt = 22) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled((prev) => (prev ? y > expandAt : y > collapseAt));
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [collapseAt, expandAt]);

  return scrolled;
}