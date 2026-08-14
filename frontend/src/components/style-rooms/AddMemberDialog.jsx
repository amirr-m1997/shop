import { useEffect } from 'react';
import { Loader2, Search, UserPlus } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Avatar } from '../chat/ChatDomainComponents';
import { useToast } from '../ui/use-toast';
import { useAddStyleRoomMember } from '../../queries/styleRoomQueries';
import { useChatUserSearch } from '../../hooks/useChatUserSearch';

const AddMemberDialog = ({ open, onOpenChange, roomId }) => {
  const { toast } = useToast();
  const addMember = useAddStyleRoomMember(roomId);
  const { query, setQuery, searchResults, setSearchResults, searching } = useChatUserSearch();

  useEffect(() => {
    if (open) {
      setQuery('');
      setSearchResults([]);
    }
  }, [open, setQuery, setSearchResults]);

  const handleAdd = (user) => {
    if (addMember.isPending) return;
    addMember.mutate(
      { user_id: user.id },
      {
        onSuccess: (response) => {
          const name = response.data?.user?.display_name || response.data?.user?.username || user.display_name || user.username;
          toast({ title: 'عضو اضافه شد', description: `${name} به اتاق دعوت شد.` });
          onOpenChange(false);
        },
        onError: (err) => {
          const message = err?.response?.data?.error || err?.response?.data?.detail || 'افزودن عضو ممکن نشد.';
          toast({ title: 'خطا', description: message, variant: 'destructive' });
        },
      }
    );
  };

  const isBusy = addMember.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-black">
              <UserPlus className="h-5 w-5" />
            </span>
            افزودن عضو
          </DialogTitle>
          <DialogDescription>
            نام کاربری دوست خود را جستجو کرده و به اتاق دعوت کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی نام کاربری..."
            autoFocus
            className="w-full rounded-xl border border-border/60 bg-secondary/40 py-2.5 pe-3 ps-10 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
          />
        </div>

        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {searching && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600 dark:text-amber-500" />
            </div>
          )}
          {!searching && query.trim() && searchResults.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">کاربری یافت نشد.</p>
          )}
          {!searching && !query.trim() && (
            <p className="py-8 text-center text-sm text-muted-foreground">برای پیدا کردن دوست خود جستجو کنید.</p>
          )}
          {searchResults.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleAdd(user)}
              disabled={isBusy}
              className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-secondary/30 p-2.5 text-start transition hover:border-amber-500/30 hover:bg-amber-500/5 disabled:opacity-50"
            >
              <Avatar user={user} size={40} ring />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">
                  {user.display_name || user.username}
                </p>
                {user.display_name && (
                  <p className="truncate text-[11px] text-muted-foreground" dir="ltr">
                    @{user.username}
                  </p>
                )}
              </div>
              {isBusy && <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-500" />}
              {!isBusy && <UserPlus className="h-4 w-4 shrink-0 text-amber-600/70 dark:text-amber-400/70" />}
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
            بستن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;