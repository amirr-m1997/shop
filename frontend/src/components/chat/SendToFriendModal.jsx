import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Send, Search, Loader2, CheckCircle, MessageCircle, Users } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { chatAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/use-toast';
import { formatPrice } from '../../lib/formatPrice';
import { PLACEHOLDER_IMG } from '../../lib/placeholders';

const Avatar = ({ user, size = 40 }) => (
  <div
    className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/15 to-violet-500/15 text-primary ring-1 ring-primary/10`}
    style={{ width: size, height: size }}
  >
    {user?.avatar ? (
      <img src={user.avatar} alt={user?.display_name} className="h-full w-full object-cover" />
    ) : (
      <span className="text-sm font-bold">{(user?.display_name || user?.username || '؟').trim().charAt(0)}</span>
    )}
  </div>
);

/**
 * ارسال محصول به دوست از طریق استایل چت.
 */
const SendToFriendModal = ({ product, open, onOpenChange }) => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [tab, setTab] = useState('chats'); // 'chats' | 'search'
  const [conversations, setConversations] = useState([]);
  const [convsLoading, setConvsLoading] = useState(false);

  // reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelected(null);
      setMessage('');
      setSent(false);
      setTab('chats');
    }
  }, [open]);

  // load recent conversations on open (authenticated)
  useEffect(() => {
    if (!open || !isAuthenticated) return;
    let cancelled = false;
    setConvsLoading(true);
    chatAPI.getConversations()
      .then((res) => {
        if (cancelled) return;
        const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        setConversations(data);
      })
      .catch(() => { /* silent */ })
      .finally(() => { if (!cancelled) setConvsLoading(false); });
    return () => { cancelled = true; };
  }, [open, isAuthenticated]);

  useEffect(() => {
    if (!open || !isAuthenticated || !query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await chatAPI.searchUsers(query);
        setResults(res.data.results);
      } catch { /* silent */ }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [query, open, isAuthenticated]);

  const handleSend = async () => {
    if (!selected) return;
    setSending(true);
    try {
      let targetConvId = selected.conversation_id;
      let convStatus = selected.conversation_status || null;
      if (!targetConvId) {
        const createRes = await chatAPI.createConversation({ user_id: selected.id });
        targetConvId = createRes.data?.id;
        convStatus = createRes.data?.status;
      }

      // If the conversation is still pending, the product can't be delivered
      // until the other side accepts. We send the request and explain instead
      // of surfacing a confusing 403.
      if (convStatus === 'pending') {
        setSelected((prev) => prev ? { ...prev, conversation_id: targetConvId, conversation_status: 'pending' } : prev);
        toast({
          title: 'درخواست گفتگو ارسال شد',
          description: 'به محض پذیرش درخواست توسط دوستتان، می‌توانید محصول را برای او بفرستید.',
        });
        onOpenChange(false);
        navigate(`/chat/${targetConvId}`);
        return;
      }
      if (convStatus === 'declined') {
        toast({
          title: 'امکان ارسال نیست',
          description: 'این درخواست گفتگو رد شده است.',
          variant: 'destructive',
        });
        return;
      }

      const messageText = message.trim();
      await chatAPI.sendProduct(targetConvId, {
        product_id: product.id,
        text: messageText,
      });
      setSelected((prev) => prev ? { ...prev, conversation_id: targetConvId, conversation_status: 'accepted' } : prev);
      setSent(true);
    } catch (e) {
      const errMsg = e.response?.data?.error || 'ارسال محصول ممکن نشد. دوباره تلاش کنید.';
      toast({ title: 'خطا', description: errMsg, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  // normalise a conversation entry into a selectable target
  const pickConversation = (conv) => {
    setSelected({
      id: conv.other_user.id,
      display_name: conv.other_user.display_name || conv.other_user.username,
      username: conv.other_user.username,
      avatar: conv.other_user.avatar,
      conversation_id: conv.id,
    });
  };

  const handleClose = () => {
    if (sent) {
      // navigate to the chat after successful send
      onOpenChange(false);
      navigate(`/chat/${selected?.conversation_id}`);
    } else {
      onOpenChange(false);
    }
  };

  const previewImage =
    product?.primary_image ||
    product?.image ||
    product?.images?.[0]?.image ||
    PLACEHOLDER_IMG;

  if (!isAuthenticated) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="overflow-hidden rounded-3xl border-border/50 sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <MessageCircle className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-lg font-bold">ارسال به دوست</DialogTitle>
            <DialogDescription className="pt-1">
              برای ارسال محصول به دوستان، ابتدا وارد حساب کاربری شوید.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse sm:flex-row sm:justify-center">
            <Link to="/login" className="flex-1 sm:flex-none">
              <Button className="w-full rounded-xl font-bold">ورود / ثبت‌نام</Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-3xl border-border/50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Send className="h-5 w-5 rotate-180" />
            </div>
            ارسال به دوست
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center py-8 text-center animate-fade-in">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-base font-bold">محصول با موفقیت ارسال شد</p>
            <p className="mt-1 text-sm text-muted-foreground">
              برای {selected?.display_name} ارسال شد. گفتگو را ادامه دهید.
            </p>
            <Button onClick={handleClose} className="mt-5 rounded-xl font-bold">
              <MessageCircle className="h-4 w-4" />
              باز کردن گفتگو
            </Button>
          </div>
        ) : (
          <>
            {/* Product preview */}
            <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/30 p-3">
              <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg">
                <img
                  src={previewImage}
                  alt={product?.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{product?.name}</p>
                <p className="text-xs font-extrabold tabular-nums text-primary">{formatPrice(product?.price)}</p>
              </div>
            </div>

            {/* Tabs: recent chats vs friend search */}
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-muted/50 p-1">
              <button
                onClick={() => setTab('chats')}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                  tab === 'chats' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                گفتگوها
              </button>
              <button
                onClick={() => setTab('search')}
                className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                  tab === 'search' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <Users className="h-4 w-4" />
                دوستان
              </button>
            </div>

            {/* Friend search input (search tab) */}
            {tab === 'search' && (
              <div className="relative mt-3">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جستجوی دوستان..."
                  className="ps-4 pe-10 h-10 rounded-2xl"
                />
              </div>
            )}

            <div className="mt-2 max-h-44 overflow-y-auto rounded-2xl border border-border/40">
              {/* Recent chats */}
              {tab === 'chats' && convsLoading && (
                <div className="flex justify-center py-5"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              )}
              {tab === 'chats' && !convsLoading && conversations.length === 0 && (
                <p className="py-5 text-center text-sm text-muted-foreground">
                  هنوز گفتگویی ندارید. با جستجوی دوستان شروع کنید.
                </p>
              )}
              {tab === 'chats' && conversations.map((c) => {
                const isSel = selected?.conversation_id === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => pickConversation(c)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors hover:bg-muted/40 ${
                      isSel ? 'bg-primary/10' : ''
                    }`}
                  >
                    <Avatar user={c.other_user} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold">{c.other_user.display_name || c.other_user.username}</p>
                        {c.unread_count > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground tabular-nums">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {c.last_message?.has_product
                          ? '🛍️ یک محصول ارسال شده'
                          : (c.last_message?.text || 'شروع گفتگو')}
                      </p>
                    </div>
                    {isSel && <CheckCircle className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}

              {/* Friend search results */}
              {tab === 'search' && searching && (
                <div className="flex justify-center py-5"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              )}
              {tab === 'search' && !searching && query.trim() && results.length === 0 && (
                <p className="py-5 text-center text-sm text-muted-foreground">کاربری یافت نشد.</p>
              )}
              {tab === 'search' && !searching && !query.trim() && (
                <p className="py-5 text-center text-xs text-muted-foreground">
                  نام کاربری دوست خود را وارد کنید
                </p>
              )}
              {tab === 'search' && results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors hover:bg-muted/40 ${
                    selected?.id === r.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <Avatar user={r} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{r.display_name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">@{r.username}</p>
                  </div>
                  {selected?.id === r.id && <CheckCircle className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              ))}
            </div>

            {selected && (
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`پیام برای ${selected.display_name}... (اختیاری)`}
                rows={2}
                className="mt-2 w-full resize-none rounded-2xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            )}

            <DialogFooter className="mt-3 flex-row-reverse gap-2 sm:flex-row">
              <Button
                onClick={handleSend}
                disabled={!selected || sending}
                className="flex-1 rounded-xl font-bold sm:flex-none"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rotate-180" />}
                {selected ? `ارسال به ${selected.display_name}` : 'انتخاب دوست'}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                انصراف
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendToFriendModal;
