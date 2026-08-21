import { useRef } from 'react';

/**
 * Detects a press-and-hold gesture (touch or mouse) without firing when the
 * pointer scrolls or moves beyond a small threshold.
 *
 * Returns pointer-event handlers plus a ref that tells whether the long press
 * actually fired, so callers can suppress the click/selection that follows.
 */
export const useLongPress = ({ onLongPress, delay = 450, moveThreshold = 10 }) => {
  const timerRef = useRef(null);
  const startPointRef = useRef(null);
  const pressIdRef = useRef(null);
  const firedRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    clearTimer();
    firedRef.current = false;
    startPointRef.current = { x: e.clientX, y: e.clientY };
    pressIdRef.current = e.pointerId;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
      onLongPress?.();
    }, delay);
  };

  const handlePointerMove = (e) => {
    if (!startPointRef.current || e.pointerId !== pressIdRef.current) return;
    const dx = e.clientX - startPointRef.current.x;
    const dy = e.clientY - startPointRef.current.y;
    if (Math.hypot(dx, dy) > moveThreshold) {
      clearTimer();
      startPointRef.current = null;
      pressIdRef.current = null;
    }
  };

  const handlePointerEnd = () => {
    clearTimer();
    startPointRef.current = null;
    pressIdRef.current = null;
  };

  return {
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerEnd,
      onPointerLeave: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
    },
    firedRef,
  };
};