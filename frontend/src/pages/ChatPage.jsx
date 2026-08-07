import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  MessageCircle, Send, Search, ArrowRight, ShoppingBag, Check, CheckCheck,
  Plus, MessageSquare, Loader2, X, Heart, Smile, Paperclip, Gift,
  MoreVertical, Eye, ShoppingCart, Star, Users, Crown, Filter,
  Shirt, Footprints, Watch, Briefcase, UserCheck, Clock, User
} from 'lucide-react';
import { chatAPI, productsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../components/ui/use-toast';
import { formatRelativeDate, formatDateTime } from '../lib/formatDate';
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
    <div className="mt-1 w-[260px] sm:w-[280px] overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
        <img src={img} alt={product?.name} className="h-full w-full object-cover" loading="lazy" />
        {hasDiscount && (
          <span className="absolute top-2 left-2 rounded-lg bg-amber-500 px-2 py-0.5 text-[10px] font-black text-black shadow-lg">
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

      <div className={`max-w-[85%] sm:max-w-[70%]`}>
        {!isMine && (
          <p className="mb-1 px-1 text-[11px] font-semibold text-muted-foreground">{message.sender_name}</p>
        )}
        <div className="group relative">
          <div
            className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed transition-all ${
              isMine
                ? 'bg-gradient-to-br from-amber-500/90 to-yellow-700/80 text-black rounded-tr-md shadow-lg shadow-amber-500/10'
                : 'bg-card/90 border border-border/60 text-foreground rounded-tl-md backdrop-blur-md'
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

            <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] font-semibold ${isMine ? 'text-black/60' : 'text-muted-foreground'}`}>
              <span dir="ltr">{timeStr}</span>
              {isMine && (
                message.is_read
                  ? <CheckCheck className="h-3.5 w-3.5 text-sky-600" />
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
        const target = data.find((c) => c.id === Number(conversationId)) || data[0];
        if (target) {
          setActiveId(target.id);
          if (conversationId || window.innerWidth >= 640) setMobilePane('chat');
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currentUserId, conversationId]);

  const loadMessages = useCallback(async (id) => {
    setConvLoading(true);
    try {
      const res = await chatAPI.getMessages(id);
      setMessages(Array.isArray(res.data) ? res.data : []);
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

  /* Polling */
  useEffect(() => {
    if (!currentUserId) return undefined;
    pollingRef.current = setInterval(async () => {
      try {
        const [cRes, uRes] = await Promise.all([chatAPI.getConversations(), chatAPI.getUnreadCount()]);
        const data = Array.isArray(cRes.data) ? cRes.data : (cRes.data?.results || []);
        setConversations(data);
        if (activeId) {
          const stillActive = data.some((c) => c.id === Number(activeId));
          if (stillActive) {
            const mRes = await chatAPI.getMessages(activeId);
            setMessages(Array.isArray(mRes.data) ? mRes.data : []);
            const otherUnread = (mRes.data || []).some((m) => !m.is_read && m.sender_id !== currentUserId);
            if (otherUnread) {
              await chatAPI.markRead(activeId);
            }
          }
        }
        window.dispatchEvent(new CustomEvent('chat:unread', { detail: uRes.data?.count || 0 }));
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(pollingRef.current);
  }, [activeId, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, convLoading]);

  const selectConversation = (id) => {
    setActiveId(id);
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

  const handleAcceptRequest = async () => {
    if (!activeId) return;
    try {
      const res = await chatAPI.acceptConversation(activeId);
      setConversations((prev) => prev.map((c) => (c.id === activeId ? res.data : c)));
      toast({ title: 'تایید شد', description: 'درخواست گفتگو پذیرفته شد. می‌توانید پیام ارسال کنید.' });
      loadMessages(activeId);
    } catch {
      toast({ title: 'خطا', description: 'تایید درخواست انجام نشد.', variant: 'destructive' });
    }
  };

  const handleDeclineRequest = async () => {
    if (!activeId) return;
    try {
      const res = await chatAPI.declineConversation(activeId);
      setConversations((prev) => prev.map((c) => (c.id === activeId ? res.data : c)));
      toast({ title: 'رد شد', description: 'درخواست گفتگو رد شد.' });
    } catch {
      toast({ title: 'خطا', description: 'رد درخواست انجام نشد.', variant: 'destructive' });
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!activeId || !text.trim() || sending) return;
    setSending(true);
    const optimistic = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      sender_username: user?.username,
      sender_name: user?.username,
      text: text.trim(),
      product: null,
      is_read: false,
      reaction: '',
      is_favorite: false,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    const payload = text.trim();
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
    if (filter === 'all') return conversations;
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
    <div className="luxe-chat bg-background text-foreground -mt-0" dir="rtl">
      {/* Full-bleed chat shell */}
      <div className="mx-auto flex h-[calc(100vh-4.5rem)] max-w-[1600px] overflow-hidden border-y border-border/50 sm:h-[calc(100vh-5rem)]">

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
                  <h1 className="text-sm font-black tracking-wide text-foreground">استایل چت</h1>
                  <p className="text-[10px] font-medium text-amber-600/80 dark:text-amber-400/80">Luxe Fashion Messages</p>
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
                  onClick={() => startConversation(r)}
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
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-hide">
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
                    className={`group flex w-full items-center gap-3 rounded-2xl p-3 text-start transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-l from-amber-500/15 to-transparent border border-amber-500/25 shadow-sm'
                        : 'hover:bg-muted/40 border border-transparent'
                    }`}
                  >
                    <Avatar user={c.other_user} size={48} online={isActive} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-sm font-bold ${isActive ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                          {c.other_user?.display_name || c.other_user?.username}
                        </p>
                        {c.last_message && (
                          <span className="shrink-0 text-[10px] font-medium text-muted-foreground" dir="ltr">
                            {formatRelativeDate(c.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-muted-foreground">
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
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 px-1.5 text-[10px] font-black text-black shadow-sm">
                            {c.unread_count.toLocaleString('fa-IR')}
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
          className={`${mobilePane === 'chat' ? 'flex' : 'hidden'} flex-1 flex-col sm:flex bg-background min-w-0`}
        >
          {active ? (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between border-b border-border/50 bg-card/80 px-4 py-3 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMobilePane('list')}
                    className="sm:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-foreground"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <Avatar user={active.other_user} size={42} online />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-foreground">
                        {active.other_user?.display_name || active.other_user?.username}
                      </p>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <p className="text-[11px] font-medium text-emerald-600/80 dark:text-emerald-400/80">آنلاین</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen((v) => !v);
                      if (window.innerWidth < 1024) setMobilePane('profile');
                    }}
                    className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-amber-500/40 px-3.5 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/10"
                  >
                    مشاهده پروفایل
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobilePane('profile')}
                    className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 scrollbar-hide">
                {convLoading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-amber-600 dark:text-amber-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center p-6">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                      <Heart className="h-7 w-7" />
                    </div>
                    <p className="text-base font-extrabold text-foreground">شروع گفتگو</p>
                    <p className="mt-1.5 max-w-xs text-xs text-muted-foreground leading-relaxed">
                      اولین پیام را بفرستید یا محصول مورد علاقه‌تان را به اشتراک بگذارید.
                    </p>
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
                <div className="border-t border-border/50 bg-card/80 p-4 sm:p-5 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
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
                <div className="border-t border-border/50 bg-card/80 p-4 backdrop-blur-xl text-center shadow-lg">
                  <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs sm:text-sm">
                    <Clock className="h-4 w-4 animate-pulse" />
                    <span>درخواست گفتگو ارسال شده است. پس از تایید کاربر می‌توانید پیام بفرستید.</span>
                  </div>
                </div>
              ) : active && active.status === 'declined' ? (
                <div className="border-t border-border/50 bg-card/80 p-4 backdrop-blur-xl text-center shadow-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                    این درخواست گفتگو رد شده است.
                  </p>
                </div>
              ) : active ? (
                <div className="relative border-t border-border/50 bg-card/80 p-3 sm:p-4">
                  {showEmoji && (
                    <div className="absolute bottom-full right-4 mb-2 flex flex-wrap gap-1 rounded-2xl border border-border/60 bg-popover p-2 shadow-2xl w-64">
                      {EMOJIS.map((e) => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => insertEmoji(e)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition hover:bg-muted"
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleSend} className="flex items-end gap-2">
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowEmoji((v) => !v)}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${showEmoji ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}
                      >
                        <Smile className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSendProductOpen(true)}
                        className="hidden sm:flex h-10 items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-bold text-amber-600 dark:text-amber-400 transition hover:bg-amber-500/20"
                      >
                        <Gift className="h-3.5 w-3.5" />
                        ارسال محصول
                      </button>
                      <button
                        type="button"
                        onClick={() => setSendProductOpen(true)}
                        className="sm:hidden flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        className="w-full max-h-28 resize-none rounded-2xl border border-border/60 bg-secondary/40 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/15"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sending || !text.trim()}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-700 text-black shadow-lg shadow-amber-500/25 transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
                    >
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 rotate-180" />}
                    </button>
                  </form>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-8">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-700/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30 shadow-2xl shadow-amber-500/10">
                <Crown className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-black text-foreground tracking-tight">به استایل چت خوش آمدید</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
                یک گفتگو از لیست سمت راست انتخاب کنید یا نام کاربری دوستتان را جستجو کنید.
              </p>
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

              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {/* Avatar hero */}
                <div className="relative flex flex-col items-center px-6 pt-8 pb-6">
                  <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
                  <Avatar user={active.other_user} size={96} online ring />
                  <h2 className="mt-4 text-lg font-black text-foreground">
                    {active.other_user?.display_name || active.other_user?.username}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">@{active.other_user?.username}</p>
                  <p className="mt-1 text-[11px] font-medium text-amber-600/80 dark:text-amber-400/80">علاقه‌مند به مد و استایل</p>

                  <div className="mt-5 flex w-full items-center justify-around rounded-2xl border border-border/50 bg-secondary/30 py-3">
                    {[
                      { label: 'گفتگو', value: '۱' },
                      { label: 'محصولات', value: messages.filter((m) => m.product).length.toLocaleString('fa-IR') || '۰' },
                      { label: 'پیام‌ها', value: messages.length.toLocaleString('fa-IR') || '۰' },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <p className="text-sm font-black text-foreground tabular-nums">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Style tags */}
                <div className="px-5 pb-4">
                  <h3 className="mb-2.5 text-xs font-bold text-muted-foreground">ترجیحات استایل</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {['مینیمال', 'لوکس', 'مونوکروم', 'استریت', 'کلاسیک', 'مدرن'].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-amber-500/20 bg-amber-500/5 px-2.5 py-1 text-[10px] font-bold text-amber-600/90 dark:text-amber-400/90"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div className="px-5 pb-4">
                  <h3 className="mb-2.5 text-xs font-bold text-muted-foreground">دسته‌های محبوب</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { icon: Shirt, label: 'لباس' },
                      { icon: Footprints, label: 'کفش' },
                      { icon: Watch, label: 'اکسسوری' },
                      { icon: Briefcase, label: 'کیف' },
                    ].map(({ icon: Icon, label }) => (
                      <div
                        key={label}
                        className="flex flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-secondary/30 py-3 text-amber-600/80 dark:text-amber-400/80"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-[9px] font-bold text-muted-foreground">{label}</span>
                      </div>
                    ))}
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
    </div>
  );
}
