import React, { useState, useRef, useCallback } from 'react';
import { ShoppingCart, Check, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

function flyToCartAnimation(imageEl, cartIconEl) {
  if (!imageEl || !cartIconEl) return Promise.resolve();

  const imgRect = imageEl.getBoundingClientRect();
  const cartRect = cartIconEl.getBoundingClientRect();

  const clone = imageEl.cloneNode(true);
  clone.style.cssText = `
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    transition: none;
    left: ${imgRect.left + imgRect.width / 2 - 30}px;
    top: ${imgRect.top + imgRect.height / 2 - 30}px;
    opacity: 1;
    transform: scale(1);
  `;
  document.body.appendChild(clone);

  const targetX = cartRect.left + cartRect.width / 2 - 30;
  const targetY = cartRect.top + cartRect.height / 2 - 30;

  return new Promise((resolve) => {
    const duration = 600;
    const start = performance.now();

    function animate(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const currentLeft = imgRect.left + imgRect.width / 2 - 30 + (targetX - (imgRect.left + imgRect.width / 2 - 30)) * ease;
      const currentTop = imgRect.top + imgRect.height / 2 - 30 + (targetY - (imgRect.top + imgRect.height / 2 - 30)) * ease;
      const scale = 1 - 0.6 * ease;
      const opacity = 1 - 0.3 * ease;

      clone.style.left = `${currentLeft}px`;
      clone.style.top = `${currentTop}px`;
      clone.style.transform = `scale(${scale})`;
      clone.style.opacity = opacity;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        clone.style.transition = 'opacity 0.15s';
        clone.style.opacity = '0';
        setTimeout(() => {
          clone.remove();
          resolve();
        }, 150);
      }
    }

    requestAnimationFrame(animate);
  });
}

export default function AddToCartButton({ product, onAdd, className, children, compact = false }) {
  const [state, setState] = useState('idle');
  const buttonRef = useRef(null);
  const timerRef = useRef(null);

  const findCartIcon = useCallback(() => {
    return document.querySelector('[data-cart-icon]');
  }, []);

  const handleClick = async () => {
    if (state !== 'idle' || !product) return;

    setState('adding');

    const imgEl = buttonRef.current?.closest('[data-product-card]')?.querySelector('img');
    const cartIcon = findCartIcon();

    if (imgEl && cartIcon) {
      flyToCartAnimation(imgEl, cartIcon);
    }

    try {
      if (onAdd) await onAdd(product);
      setState('added');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setState('idle'), 1500);
    } catch {
      setState('idle');
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      disabled={state !== 'idle'}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-300',
        compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm',
        state === 'added'
          ? 'bg-emerald-500 text-white scale-95'
          : state === 'adding'
          ? 'bg-primary/70 text-primary-foreground cursor-wait'
          : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95',
        className
      )}
    >
      {state === 'adding' ? (
        <Loader2 className={cn('animate-spin', compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      ) : state === 'added' ? (
        <Check className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      ) : (
        <ShoppingCart className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      )}
      <span>
        {state === 'adding' ? 'در حال افزودن...'
          : state === 'added' ? 'افزوده شد ✓'
          : children || 'افزودن به سبد'}
      </span>
    </button>
  );
}
