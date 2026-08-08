import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  MessageCircle, Send, Search, ArrowRight, ShoppingBag, Check, CheckCheck,
  MessageSquare, Loader2, X, Heart, Smile, Gift,
  MoreVertical, Eye, ShoppingCart, Star, Users, Crown,
  UserCheck, Clock, User, RefreshCw,
  Trash2, Ban
} from 'lucide-react';
import { chatAPI, productsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../components/ui/use-toast';
import { formatRelativeDate } from '../lib/formatDate';
import { formatPrice } from '../lib/formatPrice';
import { PLACEHOLDER_IMG } from '../lib/placeholders';
import Skeleton from '../components/ui/Skeleton';

const REACTIONS = ['❤️', '😂', '👍', '👏', '🔥', '✨'];
const EMOJIS = ['😀', '😍', '🔥', '❤️', '👍', '😂', '✨', '👏', '🤩', '💯', '🛍️', '👗'];

/* ── Luxury Avatar ── */
const Avatar = ({ user, size = 42, online = false, ring = true }) => (
  <div className="relative shrink-0">
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-500/20 via-yellow-600/10 to-amber-700/20 text-amber-600 dark:text-amber-400 ${ring ? 'ring-1 ring-amber-500/30' : ''}`}
      style={{ width: size, height: size }}
    >
      {user?.avatar ? (
        <img src={user.avatar} alt={user?.display_name || user?.username} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-extrabold tracking-wider">
          {(user?.display_name || user?.username || '؟').trim().charAt(0)}
        </span>
      )}
    </div>
    {online && (
      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
    )}
  </div>
);

/* ── Product card inside chat ── */
const ProductMessageCard = ({ product }) => {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const img = product?.primary_image || product?.image || product?.images?.[0]?.image || PLACEHOLDER_IMG;
  const hasDiscount = product?.discount_percentage > 0;
  const compare = product?.original_price || product?.compare_price;

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product?.id || adding) return;
    setAdding(true);
    try {
      await addToCart({ product_id: product.id, quantity: 1 });
      toast({ title: 'افزوده شد', description: 'محصول به سبد خرید اضافه شد.' });
    } catch {
      toast({ title: 'خطا', description: 'افزودن به سبد ممکن نشد.', variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mt-1 w-[260px] sm:w-[280px] overflow-hidden rounded-2xl border border-amber-500/20 bg-popover shadow-xl shadow-amber-500/5">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
        <img src={img} alt={product?.name} className="h-full w-full object-cover" loading="lazy" />
        <span className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-black/45 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          پیشنهاد استایل
        </span>
        {hasDiscount && (
          <span className="absolute bottom-2 left-2 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 px-2 py-0.5 text-[10px] font-black text-black shadow-lg">
            {product.discount_percentage}٪-
          </span>
        )}
      </div>
      <div className="p-3.5 space-y-2.5">
        <div>
          <p className="text-sm font-bold text-foreground leading-snug line-clamp-2">{product?.name}</p>
          {(product?.brand_name || product?.category_name) && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{product.brand_name || product.category_name}</p>
          )}
        </div>
        {(product?.rating > 0 || product?.review_count > 0) && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-0.5 text-amber-500">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className={`h-3 w-3 ${i <= Math.round(product.rating || 0) ? 'fill-amber-500' : ''}`} />
              ))}
            </div>
            {product.review_count > 0 && (
              <span>({Number(product.review_count).toLocaleString('fa-IR')})</span>
            )}
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <span className="text-base font-black text-amber-600 dark:text-amber-400 tabular-nums">{formatPrice(product?.price)}</span>
          {compare && Number(compare) > Number(product?.price) && (
            <span className="text-xs text-muted-foreground line-through tabular-nums">{formatPrice(compare)}</span>
          )}
        </div>
        <div className="flex gap-2 pt-0.5">
          <Link
            to={`/product/${product?.slug}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-transparent px-3 py-2 text-[11px] font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/10"
          >
            <Eye className="h-3.5 w-3.5" />
            مشاهده
          </Link>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 px-3 py-2 text-[11px] font-bold text-black shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:opacity-60"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
            افزودن
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Message bubble ── */
const MessageBubble = ({ message, isMine }) => {
  const [showReactions, setShowReactions] = useState(false);
  const { toast } = useToast();

  const react = async (emoji) => {
    try {
      await chatAPI.react(message.id, message.reaction === emoji ? '' : emoji);
      setShowReactions(false);
    } catch {
      toast({ title: 'خطا', description: 'ارسال واکنش ممکن نشد.', variant: 'destructive' });
    }
  };

  const isProduct = Boolean(message.product);
  const timeStr = message.created_at
    ? new Date(message.created_at).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className={`flex items-end gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
      {!isMine && (
        <Avatar
          user={{ display_name: message.sender_name, avatar: null, username: message.sender_username }}
          size={32}
          ring={false}
        />
      )}

      <div className={`max-w-[85%] sm:max-w-[70%] animate-fade-in-up`} style={{ animationDuration: '0.35s' }}>
        {!isMine && (
          <p className="mb-1 px-1 text-[11px] font-semibold text-muted-foreground">{message.sender_name}</p>
        )}
        <div className="group relative">
      <div
        className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed transition-all ${
          isMine
            ? 'bg-[#effdde] dark:bg-[#2b5278] text-foreground rounded-tr-md shadow-sm'
            : 'bg-card border border-border/60 text-foreground rounded-tl-md'
        }`}
            onDoubleClick={() => typeof message.id === 'number' && setShowReactions(true)}
          >
            {isProduct && <ProductMessageCard product={message.product} />}
            {message.text && (
              <p className={`${isProduct ? 'mt-2.5' : ''} whitespace-pre-wrap break-words font-medium ${isMine ? 'text-black/90' : 'text-foreground'}`}>
                {message.text}
              </p>
            )}

            {message.reaction && (
              <button
                type="button"
                onClick={() => setShowReactions(true)}
                className="mt-1.5 flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-2 py-0.5 text-xs backdrop-blur transition hover:scale-110"
              >
                {message.reaction}
              </button>
            )}

            <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] font-semibold ${isMine ? 'text-emerald-700/80 dark:text-sky-200/70' : 'text-muted-foreground'}`}>
              <span dir="ltr">{timeStr}</span>
              {isMine && (
                message.is_read
                  ? <CheckCheck className="h-3.5 w-3.5 text-sky-500 dark:text-sky-300" />
                  : <Check className="h-3.5 w-3.5 opacity-70" />
              )}
            </div>
          </div>

          {showReactions && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowReactions(false)} />
              <div className={`absolute z-50 flex gap-1 rounded-full border border-border/60 bg-popover p-1.5 shadow-2xl ${isMine ? 'left-0' : 'right-0'} -top-12`}>
                {REACTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => react(r)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition hover:scale-125 ${message.reaction === r ? 'bg-amber-500/20 ring-1 ring-amber-500/40' : 'hover:bg-muted'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Send Product Modal ── */
const SendProductModal = ({ open, onClose, conversationId, onSent }) => {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setNote('');
    setProducts([]);
    setLoading(true);
    productsAPI.getProducts({ page_size: 12, is_active: true })
      .then((res) => {
        const data = res.data?.results || res.data || [];
        setProducts(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open || !query.trim()) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await productsAPI.getProducts({ search: query.trim(), page_size: 12 });
        const data = res.data?.results || res.data || [];
        setProducts(Array.isArray(data) ? data : []);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query, open]);

  const send = async (product) => {
    if (!conversationId || sending) return;
    setSending(product.id);
    try {
      await chatAPI.sendProduct(conversationId, {
        product_id: product.id,
        text: note.trim() || '',
      });
      toast({ title: 'ارسال شد', description: 'محصول برای دوست شما ارسال شد.' });
      onSent?.();
      onClose();
    } catch {
      toast({ title: 'خطا', description: 'ارسال محصول ممکن نشد.', variant: 'destructive' });
    } finally {
      setSending(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex w-full max-w-lg max-h-[85vh] flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-border/60 bg-popover shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-700 text-black">
              <Gift className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground">ارسال محصول</h3>
              <p className="text-[11px] text-muted-foreground">یک محصول را برای دوستتان بفرستید</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pt-3 space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی محصول..."
              className="w-full rounded-xl border border-border/60 bg-secondary/40 py-2.5 pe-3 ps-10 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20"
              autoFocus
            />
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="پیام همراه (اختیاری)..."
            className="w-full rounded-xl border border-border/60 bg-secondary/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-amber-500/40"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-amber-600 dark:text-amber-500" />
            </div>
          )}
          {!loading && products.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">محصولی یافت نشد</p>
          )}
          {!loading && products.map((p) => {
            const img = p.primary_image || PLACEHOLDER_IMG;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => send(p)}
                disabled={sending === p.id}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/50 bg-secondary/30 p-2.5 text-start transition hover:border-amber-500/30 hover:bg-amber-500/5 disabled:opacity-50"
              >
                <img src={img} alt={p.name} className="h-14 w-12 shrink-0 rounded-xl object-cover bg-muted/30" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{p.name}</p>
                  <p className="mt-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatPrice(p.price)}</p>
                </div>
                {sending === p.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-600 dark:text-amber-500" />
                ) : (
                  <Send className="h-4 w-4 text-amber-600/70 dark:text-amber-400/70 rotate-180" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════ Main Chat Page ═══════════════════════ */
export default function ChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { conversationId } = useParams();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [convLoading, setConvLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mobilePane, setMobilePane] = useState('list'); // list | chat | profile
  const [showEmoji, setShowEmoji] = useState(false);
  const [sendProductOpen, setSendProductOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all | friends
  const [profileOpen, setProfileOpen] = useState(true);
  const [sharedOpen, setSharedOpen] = useState(false);

  const sharedProducts = useMemo(
    () => messages.filter((m) => m.product).map((m) => m.product).reverse(),
    [messages]
  );

  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);
  const textareaRef = useRef(null);

  const currentUserId = user?.id;
  const active = useMemo(
    () => conversations.find((c) => c.id === Number(activeId)) || null,
    [conversations, activeId]
  );

  /* Load conversations */
  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    chatAPI.getConversations()
      .then((res) => {
        if (cancelled) return;
        const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        setConversations(data);
        setLoading(false);
        // Only open a conversation if it was explicitly deep-linked (e.g. /chat/:id).
        // On first visit, stay on the list / welcome screen instead of auto-opening the last chat.
        if (conversationId) {
          const target = data.find((c) => c.id === Number(conversationId));
          if (target) {
            setActiveId(target.id);
            setMobilePane('chat');
          } else {
            setActiveId(null);
            setMessages([]);
            setMobilePane('list');
          }
        } else {
          setActiveId(null);
          setMessages([]);
          setMobilePane('list');
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentUserId, conversationId]);

  const loadMessages = useCallback(async (id) => {
    setConvLoading(true);
    try {
      const res = await chatAPI.getMessages(id);
      setMessages(res.data?.results ?? (Array.isArray(res.data) ? res.data : []));
      await chatAPI.markRead(id);
      setConversations((prev) => prev.map((c) => (c.id === Number(id) ? { ...c, unread_count: 0 } : c)));
    } catch {
      toast({ title: 'خطا', description: 'بارگذاری پیام‌ها ممکن نشد.', variant: 'destructive' });
    } finally {
      setConvLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    else setMessages([]);
  }, [activeId, loadMessages]);

  /* Polling — lightweight unread badge every 20s; only refresh conversations
     and messages when the tab is visible to avoid burning the API quota. */
  useEffect(() => {
    if (!currentUserId) return undefined;
    let cancelled = false;

    const refresh = async ({ full = false } = {}) => {
      if (document.hidden && !full) return;
      try {
        const uRes = await chatAPI.getUnreadCount();
        if (cancelled) return;
        window.dispatchEvent(new CustomEvent('chat:unread', { detail: uRes.data?.count || 0 }));

        if (!full) return;

        const cRes = await chatAPI.getConversations();
        if (cancelled) return;
        const data = Array.isArray(cRes.data) ? cRes.data : (cRes.data?.results || []);
        setConversations(data);
        if (activeId) {
          const stillActive = data.some((c) => c.id === Number(activeId));
          if (stillActive) {
            const mRes = await chatAPI.getMessages(activeId);
            if (cancelled) return;
            const payload = mRes.data?.results ?? (Array.isArray(mRes.data) ? mRes.data : []);
            setMessages(payload);
            const otherUnread = payload.some((m) => !m.is_read && m.sender_id !== currentUserId);
            if (otherUnread) {
              await chatAPI.markRead(activeId);
            }
          }
        }
      } catch { /* silent */ }
    };

    // Refresh immediately on mount / when returning to the tab.
    refresh({ full: true });
    const onVisibility = () => { if (!document.hidden) refresh({ full: true }); };
    document.addEventListener('visibilitychange', onVisibility);

    pollingRef.current = setInterval(() => refresh({ full: false }), 20000);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(pollingRef.current);
    };
  }, [activeId, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, convLoading]);

  const selectConversation = (id) => {
    setActiveId(id);
    setMenuOpen(false);
    setMobilePane('chat');
    navigate(`/chat/${id}`, { replace: true });
  };

  /* User search */
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await chatAPI.searchUsers(query);
        setSearchResults(res.data?.results || []);
      } catch { /* silent */ }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const startConversation = async (result) => {
    setQuery('');
    setSearchResults([]);
    try {
      const res = await chatAPI.createConversation({ user_id: result.id });
      const conv = res.data;
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === conv.id);
        return exists ? prev.map((c) => (c.id === conv.id ? conv : c)) : [conv, ...prev];
      });
      selectConversation(conv.id);
      if (conv.status === 'pending') {
        if (conv.is_requester) {
          toast({
            title: 'درخواست گفتگو ارسال شد',
            description: `درخواست شما به ${result.display_name || result.username} ارسال شد. پس از تایید ایشان می‌توانید پیام ارسال کنید.`,
          });
        } else {
          toast({ title: 'درخواست گفتگو', description: 'کاربری می‌خواهد با شما گفتگو کند. در صورت تمایل درخواست را تایید کنید.' });
        }
      } else if (conv.status === 'accepted') {
        toast({ title: 'گفتگو', description: 'شما می‌توانید پیام ارسال کنید.' });
      }
    } catch {
      toast({ title: 'خطا', description: 'ایجاد گفتگو ممکن نشد.', variant: 'destructive' });
    }
  };

  const handleStartRequest = (result) => {
    if (result.conversation_status === 'accepted') {
      startConversation(result);
      return;
    }
    const name = result.display_name || result.username;
    askConfirm({
      title: result.conversation_status === 'pending' ? 'درخواست قبلی' : 'ارسال درخواست گفتگو',
      message:
        result.conversation_status === 'pending'
          ? `قبلاً به ${name} درخواست داده‌اید و در انتظار تایید است. آیا باز هم می‌خواهید ادامه دهید؟`
          : `آیا می‌خواهید درخواست گفتگو به ${name} ارسال شود؟`,
      confirm: result.conversation_status === 'pending' ? 'باز کردن' : 'ارسال درخواست',
      danger: false,
      onConfirm: () => startConversation(result),
    });
  };

  const handleAcceptRequest = async () => {
    if (!activeId) return;
    try {
      const res = await chatAPI.acceptConversation(activeId);
      setConversations((prev) => prev.map((c) => (c.id === activeId ? res.data : c)));
      toast({ title: 'تایید شد', description: 'درخواست گفتگو پذیرفته شد. می‌توانید پیام ارسال کنید.' });
      loadMessages(activeId);
    } catch (err) {
      const detail =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'تایید درخواست انجام نشد. لطفاً دوباره تلاش کنید.';
      toast({ title: 'خطا', description: detail, variant: 'destructive' });
      try {
        const cRes = await chatAPI.getConversations();
        const data = Array.isArray(cRes.data) ? cRes.data : (cRes.data?.results || []);
        setConversations(data);
      } catch { /* silent */ }
    }
  };

  const handleDeclineRequest = async () => {
    if (!activeId) return;
    try {
      const res = await chatAPI.declineConversation(activeId);
      setConversations((prev) => prev.map((c) => (c.id === activeId ? res.data : c)));
      toast({ title: 'رد شد', description: 'درخواست گفتگو رد شد.' });
    } catch (err) {
      const detail =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'رد درخواست انجام نشد. لطفاً دوباره تلاش کنید.';
      toast({ title: 'خطا', description: detail, variant: 'destructive' });
      try {
        const cRes = await chatAPI.getConversations();
        const data = Array.isArray(cRes.data) ? cRes.data : (cRes.data?.results || []);
        setConversations(data);
      } catch { /* silent */ }
    }
  };

  const handleReopenRequest = async () => {
    if (!activeId || !active?.other_user?.id) return;
    try {
      const res = await chatAPI.createConversation({ user_id: active.other_user.id });
      setConversations((prev) => prev.map((c) => (c.id === activeId ? res.data : c)));
      const isRequester = res.data.is_requester;
      toast({
        title: isRequester ? 'درخواست دوباره ارسال شد' : 'درخواست گفتگو ارسال شد',
        description: isRequester
          ? `درخواست شما دوباره به ${active.other_user.display_name || active.other_user.username} ارسال شد. منتظر تایید ایشان باشید.`
          : `درخواست گفتگو برای ${active.other_user.display_name || active.other_user.username} ارسال شد.`,
      });
      loadMessages(activeId);
    } catch {
      toast({ title: 'خطا', description: 'ارسال مجدد درخواست ممکن نشد.', variant: 'destructive' });
    }
  };

  const handleCancelRequest = async () => {
    if (!activeId) return;
    try {
      await chatAPI.cancelConversation(activeId);
      setConversations((prev) => prev.filter((c) => c.id !== activeId));
      setMessages([]);
      toast({ title: 'لغو شد', description: 'درخواست گفتگو لغو شد.' });
    } catch {
      toast({ title: 'خطا', description: 'لغو درخواست ممکن نشد.', variant: 'destructive' });
    }
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const askConfirm = (options) => setConfirmDialog(options);
  const closeConfirm = () => setConfirmDialog(null);

  const handleClearChat = async () => {
    if (!activeId) return;
    try {
      await chatAPI.clearConversation(activeId);
      setMessages([]);
      setMenuOpen(false);
      toast({ title: 'پاک شد', description: 'سابقه گفتگو فقط برای شما پاک شد.' });
    } catch {
      toast({ title: 'خطا', description: 'پاک کردن گفتگو ممکن نشد.', variant: 'destructive' });
    }
  };

  const handleBlock = async () => {
    if (!activeId || !active?.other_user?.id) return;
    const name = active.other_user.display_name || active.other_user.username;
    try {
      const res = await chatAPI.blockConversation(activeId);
      setConversations((prev) => prev.map((c) => (c.id === activeId ? res.data : c)));
      setMenuOpen(false);
      toast({ title: 'بلاک شد', description: `${name} بلاک شد.` });
    } catch {
      toast({ title: 'خطا', description: 'بلاک کردن ممکن نشد.', variant: 'destructive' });
    }
  };

  const handleUnblock = async () => {
    if (!activeId || !active?.other_user?.id) return;
    const name = active.other_user.display_name || active.other_user.username;
    try {
      const res = await chatAPI.unblockConversation(activeId);
      setConversations((prev) => prev.map((c) => (c.id === activeId ? res.data : c)));
      setMenuOpen(false);
      toast({ title: 'رفع بلاک شد', description: `${name} از حالت بلاک خارج شد.` });
    } catch {
      toast({ title: 'خطا', description: 'رفع بلاک ممکن نشد.', variant: 'destructive' });
    }
  };

  const handleSend = async (e, overrideText) => {
    e?.preventDefault();
    const payload = (overrideText ?? text).trim();
    if (!activeId || !payload || sending) return;
    setSending(true);
    const optimistic = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      sender_username: user?.username,
      sender_name: user?.username,
      text: payload,
      product: null,
      is_read: false,
      reaction: '',
      is_favorite: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    setShowEmoji(false);
    try {
      const res = await chatAPI.sendMessage(activeId, { text: payload });
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? res.data : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      toast({ title: 'خطا', description: 'ارسال پیام ممکن نشد.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const insertEmoji = (emoji) => {
    setText((t) => t + emoji);
    textareaRef.current?.focus();
  };

  const filteredConversations = useMemo(() => {
    if (filter === 'friends') {
      return conversations.filter((c) => c.status === 'accepted');
    }
    return conversations;
  }, [conversations, filter]);

  /* ── Login gate ── */
  if (!currentUserId) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-20 text-center bg-background">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-700/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30 shadow-2xl shadow-amber-500/10">
          <MessageCircle className="h-12 w-12" />
        </div>
        <h1 className="mb-3 text-3xl font-black tracking-tight text-foreground">استایل چت</h1>
        <p className="mb-8 max-w-md text-sm text-muted-foreground leading-relaxed">
          برای گفتگو با دوستان، تبادل نظر درباره مد و به اشتراک‌گذاری محصولات، وارد حساب کاربری خود شوید.
        </p>
        <Link
          to="/login"
          className="inline-flex h-12 items-center rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 px-8 font-bold text-black shadow-lg shadow-amber-500/25 transition hover:brightness-110"
        >
          ورود به حساب کاربری
        </Link>
      </div>
    );
  }

  return (
    <div className="luxe-chat flex h-full w-full flex-col bg-background text-foreground" dir="rtl">
      {/* Full-bleed chat shell */}
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-1 overflow-hidden border-y border-border/50">

        {/* ═══ LEFT: Conversation list ═══ */}
        <aside
          className={`${mobilePane === 'list' ? 'flex' : 'hidden'} w-full flex-col border-l border-border/50 bg-card/60 sm:flex sm:w-[320px] lg:w-[360px] sm:shrink-0`}
        >
          {/* Brand + search header */}
          <div className="border-b border-border/50 px-4 pt-5 pb-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-700 text-black shadow-lg shadow-amber-500/20">
                  <Crown className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h1 className="bg-gradient-to-l from-amber-600 to-yellow-600 bg-clip-text text-sm font-black tracking-wide text-transparent dark:from-amber-400 dark:to-yellow-500">استایل چت</h1>
                  <p className="mt-0.5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">Luxe · Style · Talk</p>
                </div>
              </div>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-500/15 px-2 text-[11px] font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {conversations.length}
              </span>
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="جستجوی نام کاربری..."
                className="w-full rounded-xl border border-border/60 bg-secondary/40 py-2.5 pe-3 ps-10 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/15"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); setSearchResults([]); }} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl bg-secondary/30 p-1">
              {[
                { id: 'all', label: 'همه' },
                { id: 'friends', label: 'دوستان' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilter(t.id)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                    filter === t.id
                      ? 'bg-gradient-to-r from-amber-500/20 to-yellow-600/10 text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-amber-500/30'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search results */}
          {query.trim() && (
            <div className="border-b border-border/50 px-3 py-2 max-h-56 overflow-y-auto">
              {searching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-600 dark:text-amber-500" />
                </div>
              )}
              {!searching && searchResults.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">کاربری یافت نشد</p>
              )}
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleStartRequest(r)}
                  className="flex w-full items-center gap-3 rounded-xl p-2.5 text-start transition hover:bg-amber-500/10"
                >
                  <Avatar user={r} size={40} online />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{r.display_name}</p>
                    <p className="truncate text-[11px] text-muted-foreground" dir="ltr">@{r.username}</p>
                  </div>
                  <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    {r.conversation_status === 'accepted' ? 'گفتگو' : r.conversation_status === 'pending' ? 'در انتظار' : 'شروع گفتگو'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-2 scrollbar-hide">
            {loading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl p-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-24 rounded" />
                      <Skeleton className="h-2.5 w-36 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <p className="text-sm font-extrabold text-foreground">هنوز گفتگویی ندارید</p>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  نام کاربری دوستتان را جستجو کنید یا محصولی را برایشان بفرستید.
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c.id === Number(activeId);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectConversation(c.id)}
                    className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl p-3 text-start transition-all duration-200 active:scale-[0.98] ${
                      isActive
                        ? 'bg-gradient-to-l from-amber-500/15 to-amber-500/5 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/25'
                        : 'hover:bg-muted/40'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-gradient-to-b from-amber-500 to-yellow-600" />
                    )}
                    <Avatar user={c.other_user} size={50} online={isActive && c.status === 'accepted'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm font-bold ${isActive ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'}`}>
                          {c.other_user?.display_name || c.other_user?.username}
                        </p>
                        {c.last_message && (
                          <span className="shrink-0 text-[10px] font-medium text-muted-foreground" dir="ltr">
                            {formatRelativeDate(c.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className={`truncate text-xs ${c.unread_count > 0 && c.status === 'accepted' ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                          {c.status === 'pending'
                            ? (c.is_requester ? '⏳ در انتظار تایید کاربر' : '📩 درخواست گفتگو جدید!')
                            : c.status === 'declined'
                            ? '🚫 درخواست رد شده'
                            : c.last_message?.has_product
                            ? '📦 ارسال یک محصول'
                            : c.last_message?.text || 'شروع گفتگو...'}
                        </p>
                        {c.status === 'pending' && !c.is_requester && (
                          <span className="flex h-5 items-center justify-center rounded-full bg-emerald-500/20 px-2 text-[10px] font-black text-emerald-600 dark:text-emerald-400 animate-pulse">
                            درخواست
                          </span>
                        )}
                        {c.unread_count > 0 && c.status === 'accepted' && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 px-1.5 text-[10px] font-black text-black shadow-sm shadow-amber-500/30">
                            {c.unread_count > 99 ? '۹۹+' : c.unread_count.toLocaleString('fa-IR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ═══ CENTER: Chat window ═══ */}
        <section
          className={`${mobilePane === 'chat' ? 'flex' : 'hidden'} relative flex-1 flex-col sm:flex bg-background min-w-0`}
        >
          {active ? (
            <>
              {/* Chat header */}
              <div className="relative z-20 flex items-center justify-between gap-3 border-b border-border/50 bg-card px-3 py-3 sm:px-4 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobilePane('list')}
                    className="sm:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 text-foreground transition active:scale-95"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(true);
                      if (window.innerWidth < 1024) setMobilePane('profile');
                    }}
                    className="flex min-w-0 items-center gap-3 text-start"
                  >
                    <Avatar user={active.other_user} size={44} online ring />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-foreground transition group-hover:text-amber-600 dark:group-hover:text-amber-400">
                          {active.other_user?.display_name || active.other_user?.username}
                        </p>
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600/85 dark:text-emerald-400/85">
                        <span>{active.status === 'accepted' ? 'آنلاین' : 'در انتظار پاسخ'}</span>
                        {sharedProducts.length > 0 && (
                          <span className="truncate text-muted-foreground">• {sharedProducts.length.toLocaleString('fa-IR')} محصول مشترک</span>
                        )}
                      </p>
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {sharedProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSharedOpen(true)}
                      title="محصولات اشتراک‌گذاری‌شده"
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/5 px-2.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/15 active:scale-95"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span className="hidden xl:inline">محصولات</span>
                      <span className="tabular-nums">({sharedProducts.length.toLocaleString('fa-IR')})</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen((v) => !v);
                      if (window.innerWidth < 1024) setMobilePane('profile');
                    }}
                    className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition ${
                      profileOpen
                        ? 'border-border/60 bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                        : 'border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                    }`}
                  >
                    {profileOpen ? 'بستن پروفایل' : 'مشاهده پروفایل'}
                  </button>

                  {/* ═══ Three-dot menu: clear chat / block ═══ */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                        <div className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-2xl">
                          <button
                            type="button"
                            onClick={() =>
                              askConfirm({
                                title: 'پاک کردن گفتگو',
                                message: 'همه پیام‌های این گفتگو فقط برای شما پاک شوند؟',
                                confirm: 'پاک کردن',
                                danger: true,
                                onConfirm: handleClearChat,
                              })
                            }
                            className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted/60"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                            پاک کردن گفتگو
                          </button>
                          {active.blocked_by_me ? (
                            <button
                              type="button"
                              onClick={handleUnblock}
                              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-500/10"
                            >
                              <UserCheck className="h-4 w-4" />
                              رفع بلاک
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                askConfirm({
                                  title: 'بلاک کاربر',
                                  message: `«${active.other_user?.display_name || active.other_user?.username}» بلاک شود؟ پس از بلاک، امکان ارسال و دریافت پیام از این کاربر وجود نخواهد داشت.`,
                                  confirm: 'بلاک',
                                  danger: true,
                                  onConfirm: handleBlock,
                                })
                              }
                              className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-semibold text-rose-600 dark:text-rose-400 transition hover:bg-rose-500/10"
                            >
                              <Ban className="h-4 w-4" />
                              بلاک کاربر
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-5 pb-[calc(12rem+env(safe-area-inset-bottom))] lg:pb-32 space-y-4 scrollbar-hide">
                {convLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-600 dark:text-amber-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center p-6 animate-fade-in-up">
                    <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-700/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25 shadow-2xl shadow-amber-500/10">
                      <Heart className="h-9 w-9" />
                      <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black ring-2 ring-background">
                        <Check className="h-3 w-3" />
                      </span>
                    </div>
                    <p className="text-lg font-black text-foreground">شروع گفتگو با {active.other_user?.display_name || active.other_user?.username || 'هم‌گفتگو'}</p>
                    <p className="mt-2 max-w-xs text-xs text-muted-foreground leading-relaxed">
                      اولین پیام را بفرستید یا محصول موردعلاقه‌تان را به اشتراک بگذارید. برای شروع سریع، یکی از پیشنهادها را انتخاب کنید:
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      {[
                        'سلام! چطورید؟ 👋',
                        'این استایل برات چطوره؟ ✨',
                        'یه محصول جدید دیدم، بفرستم؟ 🛍️',
                      ].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSend(null, s)}
                          disabled={sending}
                          className="rounded-full border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/15 hover:-translate-y-0.5 disabled:opacity-50"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setSendProductOpen(true)}
                      className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/20 transition hover:brightness-110 active:scale-95"
                    >
                      <Gift className="h-4 w-4" />
                      ارسال محصول به گفتگو
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((m) => (
                      <MessageBubble
                        key={m.id}
                        message={m}
                        isMine={m.sender_id === currentUserId}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Composer or Pending Request Banner */}
              {active && active.status === 'pending' && !active.is_requester ? (
                <div className="absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 border-t border-border/50 bg-card/80 p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg lg:bottom-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">درخواست گفتگو جدید</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {active.other_user?.display_name || active.other_user?.username} مایل است با شما گفتگو کند.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleAcceptRequest}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 px-4 py-2.5 text-xs font-bold text-black shadow-md transition hover:brightness-110"
                    >
                      <Check className="h-4 w-4" />
                      پذیرفتن
                    </button>
                    <button
                      type="button"
                      onClick={handleDeclineRequest}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-muted/50 px-4 py-2.5 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                      رد کردن
                    </button>
                  </div>
                </div>
              ) : active && active.status === 'pending' && active.is_requester ? (
                <div className="absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 border-t border-border/50 bg-card/80 p-4 backdrop-blur-xl shadow-lg lg:bottom-0">
                  <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs sm:text-sm">
                      <Clock className="h-4 w-4 animate-pulse" />
                      <span>درخواست گفتگو ارسال شده است. پس از تایید کاربر می‌توانید پیام بفرستید.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        askConfirm({
                          title: 'لغو درخواست گفتگو',
                          message: `درخواست ارسال‌شده به ${active.other_user?.display_name || active.other_user?.username} لغو شود؟`,
                          confirm: 'لغو درخواست',
                          danger: true,
                          onConfirm: handleCancelRequest,
                        })
                      }
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-muted/50 px-3.5 py-2 text-[11px] font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                      لغو درخواست
                    </button>
                  </div>
                </div>
              ) : active && active.status === 'declined' ? (
                <div className="absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 border-t border-border/50 bg-card/80 p-4 sm:p-5 backdrop-blur-xl shadow-lg lg:bottom-0">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 dark:text-rose-400">
                        <X className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">این درخواست گفتگو رد شده است</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {active.is_requester
                            ? 'اگر تمایل دارید، می‌توانید دوباره درخواست بدهید.'
                            : 'اگر تمایل دارید، می‌توانید با این کاربر گفتگو را شروع کنید.'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleReopenRequest}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-yellow-600/5 px-4 py-2.5 text-xs font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/20"
                    >
                      {active.is_requester ? (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          ارسال مجدد درخواست
                        </>
                      ) : (
                        <>
                          <MessageCircle className="h-4 w-4" />
                          شروع گفتگو
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : active && active.is_blocked ? (
                <div className="absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 border-t border-border/50 bg-card/80 p-4 backdrop-blur-xl text-center shadow-lg lg:bottom-0">
                  <div className="flex items-center justify-center gap-2 text-rose-500 dark:text-rose-400 font-bold text-xs sm:text-sm">
                    <Ban className="h-4 w-4" />
                    <span>
                      {active.blocked_by_me
                        ? 'شما این کاربر را بلاک کرده‌اید. برای گفتگو از منو «رفع بلاک» را انتخاب کنید.'
                        : 'این کاربر شما را بلاک کرده است.'}
                    </span>
                  </div>
                </div>
              ) : active ? (
                <div className="absolute inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 border-t border-border/50 bg-card/95 p-3 sm:p-4 backdrop-blur-xl shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)] lg:bottom-0">
                  {showEmoji && (
                    <div className="absolute right-4 bottom-full mb-2 flex flex-wrap gap-1 rounded-2xl border border-border/60 bg-popover p-2 shadow-2xl w-64 animate-scale-in">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => insertEmoji(e)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition hover:bg-muted active:scale-90"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSend} className="flex items-end gap-2">
                    <div className="flex items-center gap-2 shrink-0 pb-1">
                      <button
                        type="button"
                        onClick={() => setShowEmoji((v) => !v)}
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90 ${showEmoji ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
                      >
                        <Smile className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSendProductOpen(true)}
                        title="ارسال محصول"
                        className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/60 hover:text-amber-600 active:scale-90 sm:hidden"
                      >
                        <Gift className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex-1">
                      <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="پیام خود را بنویسید..."
                        rows={1}
                        maxLength={2000}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        className="peer w-full max-h-32 resize-none rounded-2xl border border-border/60 bg-secondary/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15"
                      />
                    </div>

                    {/* Send button — Telegram-style accent, on the leading side */}
                    <button
                      type="submit"
                      disabled={sending || !text.trim()}
                      aria-label="ارسال پیام"
                      className="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 text-black shadow-md shadow-amber-500/30 transition hover:brightness-110 active:scale-90 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:hover:brightness-100"
                    >
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 -rotate-45" />}
                    </button>
                  </form>

                  <div className="mt-1 hidden sm:flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setSendProductOpen(true)}
                      className="flex h-8 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 px-3 text-[11px] font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/15 active:scale-95"
                    >
                      <Gift className="h-3.5 w-3.5" />
                      ارسال محصول
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center animate-fade-in-up">
              <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-700/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25 shadow-2xl shadow-amber-500/10">
                <Crown className="h-12 w-12" />
              </div>
              <h3 className="text-2xl font-black text-foreground tracking-tight">به استایل چت خوش آمدید</h3>
              <p className="mt-2.5 max-w-md text-sm text-muted-foreground leading-relaxed">
                با دوستان گفتگو کنید، ایده‌های استایل را رد و بدل کنید و محصولات موردعلاقه‌تان را به اشتراک بگذارید.
              </p>

              <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <span className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-4 py-2.5 text-xs font-bold text-muted-foreground">
                  <Search className="h-4 w-4 text-amber-500" />
                  نام کاربری دوست‌تان را جستجو کنید
                </span>
                <Link
                  to="/products"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-600 px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/20 transition hover:brightness-110"
                >
                  <ShoppingBag className="h-4 w-4" />
                  کاوش محصولات
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* ═══ RIGHT: Profile panel ═══ */}
        <aside
          className={`${
            mobilePane === 'profile' ? 'flex' : 'hidden'
          } ${profileOpen ? 'lg:flex' : 'lg:hidden'} w-full flex-col border-r border-border/50 bg-card/60 sm:w-[280px] lg:w-[300px] shrink-0`}
        >
          {active ? (
            <>
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-foreground leading-tight">
                      پروفایل {active.other_user?.display_name || active.other_user?.username}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground leading-tight">
                      کاربر مقابل — طرف گفتگو
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    if (window.innerWidth < 1024) setMobilePane('chat');
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground lg:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 scrollbar-hide">
                {/* Avatar hero */}
                <div className="relative flex flex-col items-center px-6 pt-8 pb-6">
                  <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
                  <Avatar user={active.other_user} size={96} online ring />
                  <h2 className="mt-4 text-lg font-black text-foreground">
                    {active.other_user?.display_name || active.other_user?.username}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">@{active.other_user?.username}</p>
                  <p className="mt-1 text-[11px] font-medium text-amber-600/80 dark:text-amber-400/80">علاقه‌مند به مد و استایل</p>

                  <div className="mt-5 grid w-full grid-cols-3 gap-2">
                    {[
                      { label: 'گفتگو', value: '۱', Icon: MessageSquare },
                      { label: 'محصولات', value: messages.filter((m) => m.product).length.toLocaleString('fa-IR') || '۰', Icon: ShoppingBag },
                      { label: 'پیام‌ها', value: messages.length.toLocaleString('fa-IR') || '۰', Icon: Send },
                    ].map((s) => (
                      <div key={s.label} className="flex flex-col items-center gap-1 rounded-2xl border border-border/50 bg-secondary/30 py-3 transition hover:border-amber-500/30 hover:bg-amber-500/5">
                        <s.Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <p className="text-sm font-black text-foreground tabular-nums">{s.value}</p>
                        <p className="text-[9px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Style tags */}
                <div className="px-5 pb-4">
                  <h3 className="mb-2.5 text-xs font-bold text-muted-foreground">ترجیحات استایل</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(active.other_user?.style_preferences?.length ? active.other_user.style_preferences : []).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[10px] font-bold text-amber-600/90 dark:text-amber-400/90"
                      >
                        {tag}
                      </span>
                    ))}
                    {(!active.other_user?.style_preferences?.length) && (
                      <span className="text-[11px] text-muted-foreground">سبک موردعلاقه‌ای مشخص نشده است.</span>
                    )}
                  </div>
                </div>

                {/* Categories */}
                <div className="px-5 pb-4">
                  <h3 className="mb-2.5 text-xs font-bold text-muted-foreground">دسته‌های محبوب</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(active.other_user?.popular_categories?.length ? active.other_user.popular_categories : []).map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-1 text-[10px] font-bold text-emerald-600/90 dark:text-emerald-400/90"
                      >
                        {cat}
                      </span>
                    ))}
                    {(!active.other_user?.popular_categories?.length) && (
                      <span className="text-[11px] text-muted-foreground">دسته‌بندی از علاقه‌مندی‌ها محاسبه نشده است.</span>
                    )}
                  </div>
                </div>

                {/* Shared products in this chat */}
                {messages.some((m) => m.product) && (
                  <div className="px-5 pb-6">
                    <div className="mb-2.5 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-muted-foreground">محصولات اشتراک‌گذاری‌شده</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {messages
                        .filter((m) => m.product)
                        .slice(-6)
                        .reverse()
                        .map((m) => {
                          const img = m.product?.primary_image || PLACEHOLDER_IMG;
                          return (
                            <Link
                              key={m.id}
                              to={`/product/${m.product.slug}`}
                              className="aspect-square overflow-hidden rounded-xl border border-border/50 bg-muted/30 transition hover:border-amber-500/40"
                            >
                              <img src={img} alt={m.product.name} className="h-full w-full object-cover" loading="lazy" />
                            </Link>
                          );
                        })}
                    </div>
                  </div>
                )}

                <div className="px-5 pb-8">
                  <Link
                    to="/products"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-yellow-600/5 py-3 text-xs font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/15"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    کاوش محصولات
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <Users className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">برای مشاهده پروفایل یک گفتگو انتخاب کنید</p>
            </div>
          )}
        </aside>
      </div>

      <SendProductModal
        open={sendProductOpen}
        onClose={() => setSendProductOpen(false)}
        conversationId={activeId}
        onSent={() => activeId && loadMessages(activeId)}
      />

      {/* ═══ Shared products modal ═══ */}
      {sharedOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setSharedOpen(false)} />
          <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-border/60 bg-card shadow-2xl animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <ShoppingBag className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-foreground">محصولات اشتراک‌گذاری‌شده</h3>
                  <p className="text-[11px] text-muted-foreground">
                    گفتگو با {active?.other_user?.display_name || active?.other_user?.username} — {sharedProducts.length.toLocaleString('fa-IR')} محصول
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSharedOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
              {sharedProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Gift className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-foreground">هنوز محصولی به اشتراک گذاشته نشده</p>
                  <p className="mt-1 text-xs text-muted-foreground">از گزینه «ارسال محصول» اولین پیشنهاد را بفرستید.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {sharedProducts.map((p, idx) => {
                    const img = p?.primary_image || p?.image || PLACEHOLDER_IMG;
                    const hasDiscount = p?.discount_percentage > 0;
                    const compare = p?.original_price || p?.compare_price;
                    return (
                      <Link
                        key={`${p?.id}-${idx}`}
                        to={`/product/${p?.slug}`}
                        onClick={() => setSharedOpen(false)}
                        className="group animate-scale-in overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-sm transition hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-lg"
                        style={{ animationDelay: `${Math.min(idx * 60, 360)}ms` }}
                      >
                        <div className="relative aspect-square overflow-hidden bg-muted/30">
                          <img src={img} alt={p?.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                          {hasDiscount && (
                            <span className="absolute top-2 left-2 rounded-lg bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-black shadow-lg">
                              {p.discount_percentage}٪-
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-xs font-bold text-foreground">{p?.name}</p>
                          <p className="mt-1 text-sm font-black text-amber-600 dark:text-amber-400 tabular-nums">
                            {formatPrice(p?.price)}
                            {compare && Number(compare) > Number(p?.price) && (
                              <span className="mr-1.5 text-[10px] text-muted-foreground line-through">{formatPrice(compare)}</span>
                            )}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeConfirm} />
          <div className="relative w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 shadow-2xl">
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
                confirmDialog.danger
                  ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}
            >
              {confirmDialog.danger ? <Ban className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
            </div>
            <h3 className="text-center text-base font-black text-foreground">{confirmDialog.title}</h3>
            <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">{confirmDialog.message}</p>
            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={closeConfirm}
                className="flex-1 rounded-xl border border-border/60 bg-muted/50 px-4 py-2.5 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  closeConfirm();
                  confirmDialog.onConfirm && confirmDialog.onConfirm();
                }}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 ${
                  confirmDialog.danger
                    ? 'bg-gradient-to-r from-rose-600 to-red-500'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black'
                }`}
              >
                {confirmDialog.confirm || 'تایید'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
