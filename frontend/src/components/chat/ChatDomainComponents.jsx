import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check, CheckCheck, Eye, Gift, Loader2, Search, Send, ShoppingCart, Star, X,
} from 'lucide-react';
import { chatAPI, productsAPI } from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../ui/use-toast';
import { formatTime } from '../../lib/formatDate';
import { formatPrice } from '../../lib/formatPrice';
import { PLACEHOLDER_IMG } from '../../lib/placeholders';

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
const tickForStatus = (status, isRead) => {
  const resolved = status || (isRead ? 'seen' : 'sent');
  if (resolved === 'seen') {
    return <CheckCheck className="h-3.5 w-3.5 text-sky-500 dark:text-sky-300" aria-label="دیده‌شده" />;
  }
  if (resolved === 'delivered') {
    return <CheckCheck className="h-3.5 w-3.5 opacity-70" aria-label="تحویل‌شده" />;
  }
  return <Check className="h-3.5 w-3.5 opacity-70" aria-label="ارسال‌شده" />;
};

const MessageBubble = ({ message, isMine, onReply, onForward, onDelete, onReport }) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { toast } = useToast();

  const react = async (emoji) => {
    try {
      await chatAPI.react(message.id, message.reaction === emoji ? '' : emoji);
      setShowReactions(false);
    } catch {
      toast({ title: 'خطا', description: 'ارسال واکنش ممکن نشد.', variant: 'destructive' });
    }
  };

  const isProduct = Boolean(message.product) && !message.deleted_for_everyone;
  const timeStr = formatTime(message.created_at);

  return (
    <div
      className={`flex items-end gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}
      data-message-id={typeof message.id === 'number' ? message.id : undefined}
      data-message-receipt={!isMine && typeof message.id === 'number' && !message.deleted_for_everyone ? '1' : undefined}
    >
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
            onDoubleClick={() => typeof message.id === 'number' && !message.deleted_for_everyone && setShowReactions(true)}
          >
            {message.is_forwarded && !message.deleted_for_everyone && (
              <p className="mb-1 text-[10px] font-bold text-muted-foreground">هدایت‌شده</p>
            )}
            {message.reply_to && !message.deleted_for_everyone && (
              <div className="mb-2 rounded-xl border border-border/50 bg-background/50 px-2.5 py-1.5 text-[11px]">
                <p className="font-bold text-amber-600 dark:text-amber-400">{message.reply_to.deleted ? 'پیام حذف شده' : (message.reply_to.sender_name || 'پاسخ')}</p>
                {!message.reply_to.deleted && <p className="mt-0.5 line-clamp-2 text-muted-foreground">{message.reply_to.text}</p>}
              </div>
            )}
            {message.deleted_for_everyone ? (
              <p className="text-xs italic text-muted-foreground">این پیام حذف شده است</p>
            ) : (
              <>
            {isProduct && <ProductMessageCard product={message.product} />}
            {message.text && (
              <p className={`${isProduct ? 'mt-2.5' : ''} whitespace-pre-wrap break-words font-medium ${isMine ? 'text-black/90' : 'text-foreground'}`}>
                {message.text}
              </p>
            )}
              </>
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
              {isMine && tickForStatus(message.status, message.is_read)}
            </div>
          </div>

          {typeof message.id === 'number' && !message.deleted_for_everyone && (
            <button
              type="button"
              onClick={() => setShowMenu((value) => !value)}
              className={`absolute top-1 ${isMine ? 'right-full mr-1' : 'left-full ml-1'} hidden rounded-lg bg-muted/80 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground group-hover:block`}
            >
              بیشتر
            </button>
          )}
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className={`absolute z-50 w-40 overflow-hidden rounded-xl border border-border/60 bg-popover text-xs shadow-xl ${isMine ? 'left-0' : 'right-0'} top-8`}>
                <button type="button" className="block w-full px-3 py-2 text-start hover:bg-muted" onClick={() => { setShowMenu(false); onReply?.(message); }}>پاسخ</button>
                <button type="button" className="block w-full px-3 py-2 text-start hover:bg-muted" onClick={() => { setShowMenu(false); onForward?.(message); }}>هدایت</button>
                <button type="button" className="block w-full px-3 py-2 text-start hover:bg-muted" onClick={() => { setShowMenu(false); onDelete?.(message, 'me'); }}>حذف برای من</button>
                {isMine && <button type="button" className="block w-full px-3 py-2 text-start text-rose-600 hover:bg-rose-500/10" onClick={() => { setShowMenu(false); onDelete?.(message, 'everyone'); }}>حذف برای همه</button>}
                {!isMine && <button type="button" className="block w-full px-3 py-2 text-start text-rose-600 hover:bg-rose-500/10" onClick={() => { setShowMenu(false); onReport?.(message); }}>گزارش</button>}
              </div>
            </>
          )}
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
  const [shareWithReferral, setShareWithReferral] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setNote('');
    setShareWithReferral(false);
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
      let messageText = note.trim();
      if (shareWithReferral) {
        const referral = await chatAPI.createReferral({ product_id: product.id });
        const referralUrl = referral.data?.referral_url;
        if (!referralUrl) throw new Error('Referral URL was not returned.');
        messageText = [messageText, `Referral link: ${referralUrl}`].filter(Boolean).join('\n');
      }
      await chatAPI.sendProduct(conversationId, {
        product_id: product.id,
        text: messageText,
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
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs font-semibold text-foreground">
            <input
              type="checkbox"
              checked={shareWithReferral}
              onChange={(e) => setShareWithReferral(e.target.checked)}
              className="h-4 w-4 accent-amber-500"
            />
            Include a referral link with this product share
          </label>
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

export { Avatar, EMOJIS, MessageBubble, ProductMessageCard, SendProductModal };
