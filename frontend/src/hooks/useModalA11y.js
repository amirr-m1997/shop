import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useModalA11y(open, onClose) {
  const dialogRef = useRef(null);
  const restoreRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    restoreRef.current = document.activeElement;
    const dialog = dialogRef.current;
    const focusInitial = () => {
      const first = dialog?.querySelector(FOCUSABLE);
      (first || dialog)?.focus();
    };
    const timer = window.setTimeout(focusInitial, 0);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const nodes = [...dialog.querySelectorAll(FOCUSABLE)];
      if (!nodes.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      if (restoreRef.current?.focus) restoreRef.current.focus();
    };
  }, [open]);

  return dialogRef;
}

