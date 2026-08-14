import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Link2, Loader2, RefreshCw } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { useToast } from '../ui/use-toast';
import { useGenerateInvite } from '../../queries/styleRoomQueries';
import { formatDateShort } from '../../lib/formatDate';

const copyToClipboard = async (text) => {
  if (!navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const InviteTokenDialog = ({ open, onOpenChange, roomId, roomTitle }) => {
  const { toast } = useToast();
  const generateInvite = useGenerateInvite(roomId);
  const [token, setToken] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [copied, setCopied] = useState(null);

  const shareLink = token
    ? `${window.location.origin}/style-rooms/${roomId}?invite=${encodeURIComponent(token)}`
    : '';

  const reset = () => {
    setToken('');
    setExpiresAt(null);
    setCopied(null);
  };

  useEffect(() => {
    if (open) {
      reset();
      generateInvite.mutate(undefined, {
        onSuccess: (response) => {
          setToken(response.data.token);
          setExpiresAt(response.data.expires_at);
        },
        onError: (err) => {
          const message = err?.response?.data?.error || err?.response?.data?.detail || 'ساخت دعوت‌نامه ممکن نشد.';
          toast({ title: 'خطا', description: message, variant: 'destructive' });
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roomId]);

  const handleRegenerate = () => {
    generateInvite.mutate(undefined, {
      onSuccess: (response) => {
        setToken(response.data.token);
        setExpiresAt(response.data.expires_at);
        setCopied(null);
        toast({ title: 'دعوت‌نامه جدید', description: 'دعوت‌نامه قبلی باطل شد و دعوت‌نامه جدید ساخته شد.' });
      },
      onError: (err) => {
        const message = err?.response?.data?.error || err?.response?.data?.detail || 'ساخت دعوت‌نامه ممکن نشد.';
        toast({ title: 'خطا', description: message, variant: 'destructive' });
      },
    });
  };

  const handleCopy = async (text, key) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(key);
      toast({ title: 'کپی شد', description: 'متن مورد نظر در کلیپ‌بورد کپی شد.' });
      setTimeout(() => setCopied(null), 2000);
    } else {
      toast({ title: 'خطا', description: 'کپی کردن ممکن نشد.', variant: 'destructive' });
    }
  };

  const busy = generateInvite.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md overflow-x-hidden overflow-y-auto p-4 sm:p-6"
      >
        <DialogHeader className="min-w-0">
          <DialogTitle className="flex min-w-0 flex-wrap items-center gap-2 leading-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-black">
              <KeyRound className="h-5 w-5" />
            </span>
            دعوت به اتاق استایل
          </DialogTitle>
          <DialogDescription className="break-words leading-6">
            {roomTitle ? `دوستان را به اتاق «${roomTitle}» دعوت کنید.` : 'دوستان را به اتاق استایل دعوت کنید.'}{' '}
            با هر کلیک، دعوت‌نامه قبلی باطل می‌شود.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {busy && !token ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-border/60 bg-secondary/30 py-8 text-sm font-bold text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-amber-600 dark:text-amber-500" />
              در حال ساخت دعوت‌نامه...
            </div>
          ) : token ? (
            <>
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">لینک دعوت</span>
                <div className="flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden">
                  <div className="w-0 min-w-0 flex-1 truncate rounded-xl border border-border/60 bg-secondary/40 px-3 py-2.5 text-xs text-muted-foreground" dir="ltr">
                    {shareLink}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => handleCopy(shareLink, 'link')}
                    aria-label="کپی لینک دعوت"
                  >
                    {copied === 'link' ? <Check className="h-4 w-4 text-emerald-500" /> : <Link2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-bold text-foreground">کد دعوت</span>
                <div className="flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden">
                  <div className="w-0 min-w-0 flex-1 truncate rounded-xl border border-border/60 bg-secondary/40 px-3 py-2.5 text-xs font-bold tracking-wide text-foreground" dir="ltr">
                    {token}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => handleCopy(token, 'token')}
                    aria-label="کپی کد دعوت"
                  >
                    {copied === 'token' ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {expiresAt && (
                <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] font-bold text-amber-600/90 dark:text-amber-400/90">
                  این دعوت‌نامه تا {formatDateShort(expiresAt)} معتبر است.
                </p>
              )}
            </>
          ) : (
            <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400">
              ساخت دعوت‌نامه ناموفق بود. لطفاً دوباره تلاش کنید.
            </p>
          )}
        </div>

        <DialogFooter className="w-full gap-2 sm:flex-row sm:justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="w-full sm:w-auto"
          >
            بستن
          </Button>
          <Button
            type="button"
            onClick={handleRegenerate}
            disabled={busy || !token}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 font-bold text-black shadow-lg shadow-amber-500/20 hover:brightness-110 sm:w-auto"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            ساخت دعوت‌نامه جدید
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteTokenDialog;
