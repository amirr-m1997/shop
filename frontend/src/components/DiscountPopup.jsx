import { useState, useEffect, useCallback } from 'react';
import { X, Copy, Check, Gift } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { welcomeOfferAPI } from '../services/api';

const DELAY_MS = 2500;

const DiscountPopup = () => {
  const { user, isAuthenticated } = useAuth();
  const [offer, setOffer] = useState(null);
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const seenKey = `welcome_offer_seen_${user.id}`;
    if (localStorage.getItem(seenKey)) {
      return;
    }

    let mounted = true;
    const timer = setTimeout(async () => {
      try {
        const res = await welcomeOfferAPI.getOffer();
        if (!mounted) return;
        if (res.data.available && res.data.offer) {
          setOffer(res.data.offer);
          setShow(true);
          localStorage.setItem(seenKey, '1');
        }
      } catch {
        // ignore
      } finally {
        // Keep cleanup symmetrical even when the request finishes late.
      }
    }, DELAY_MS);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [isAuthenticated, user]);

  const claim = useCallback(async () => {
    if (claimed) return;
    setClaimed(true);
    try {
      await welcomeOfferAPI.claimOffer();
    } catch {
      // silent
    }
  }, [claimed]);

  const close = () => {
    claim();
    setShow(false);
  };

  const copyCode = () => {
    if (!offer) return;
    navigator.clipboard.writeText(offer.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!show || !offer) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={close}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border/50 bg-card shadow-2xl animate-fade-in-up">
        <button
          onClick={close}
          className="absolute left-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-foreground shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md dark:bg-black/40 dark:hover:bg-black/60"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-violet-600 px-6 py-10 text-center text-white">
          <div className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-violet-400/20 blur-2xl" />

          <div className="relative">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Gift className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">هدیه خوش‌آمدگویی</h2>
            <p className="mt-2 text-sm text-white/80">
              اولین خریدتان را با تخفیف ویژه شروع کنید
            </p>
          </div>
        </div>

        <div className="px-6 py-6 text-center">
          <div className="mb-5">
            <span className="inline-block rounded-2xl bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">
              {offer.discount_display}
            </span>
            <p className="mt-2 text-sm text-muted-foreground">
              تخفیف روی تمام محصولات
            </p>
          </div>

          <div className="mb-5 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">کد تخفیف شما</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl font-bold tracking-widest text-primary" dir="ltr">
                {offer.code}
              </span>
              <button
                onClick={copyCode}
                className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    کپی شد
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    کپی
                  </>
                )}
              </button>
            </div>
          </div>

          <button
            onClick={close}
            className="w-full rounded-2xl bg-gradient-to-l from-primary to-primary/80 px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
          >
            شروع خرید
          </button>

          <p className="mt-3 text-xs text-muted-foreground">
            این کد فقط یک بار قابل استفاده است
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiscountPopup;
