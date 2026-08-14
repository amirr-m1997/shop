import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/use-toast';
import { useJoinStyleRoom } from '../../queries/styleRoomQueries';

/**
 * Self-service join screen for invited visitors. Requires the room id in the
 * URL (matching the backend `POST /{pk}/join/`) plus the invite token — either
 * auto-filled from the shared link (`?invite=`) or pasted manually.
 */
const JoinRoomPrompt = ({ roomId, initialToken = '', onJoined, onBack }) => {
  const { toast } = useToast();
  const joinRoom = useJoinStyleRoom(roomId);
  const [token, setToken] = useState(initialToken);
  const [error, setError] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('کد دعوت را وارد کنید.');
      return;
    }
    setError('');
    joinRoom.mutate(token, {
      onSuccess: (response) => {
        toast({ title: 'عضویت موفق', description: `به اتاق «${response.data.title}» پیوستید.` });
        onJoined?.(response.data);
      },
      onError: (err) => {
        const message = err?.response?.data?.error || err?.response?.data?.detail || 'امکان پیوستن به اتاق وجود ندارد.';
        setError(message);
        toast({ title: 'خطا', description: message, variant: 'destructive' });
      },
    });
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-700/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30 shadow-2xl shadow-amber-500/10">
        <KeyRound className="h-12 w-12" />
      </div>
      <h1 className="mb-3 text-2xl font-black tracking-tight text-foreground">شما به یک اتاق استایل دعوت شده‌اید</h1>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground leading-relaxed">
        با کد دعوت می‌توانید به اتاق بپیوندید و محصولات و ایده‌های استایل را با دوستان به‌اشتراک بگذارید.
      </p>

      <form onSubmit={handleJoin} className="w-full space-y-3">
        <Input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="کد دعوت را وارد کنید..."
          dir="ltr"
          autoFocus
          disabled={joinRoom.isPending}
          aria-label="کد دعوت"
        />
        {error && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={joinRoom.isPending}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold shadow-lg shadow-amber-500/25 hover:brightness-110"
        >
          {joinRoom.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'پیوستن به اتاق'}
        </Button>
      </form>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-5 text-xs font-bold text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
        >
          بازگشت به اتاق‌های من
        </button>
      )}
    </div>
  );
};

export default JoinRoomPrompt;