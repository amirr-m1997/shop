import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Crown, Loader2, MessageCircle, RotateCcw, Send, ShoppingBag, XCircle } from 'lucide-react';
import { productsAPI, supportAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/use-toast';
import { ProductMessageCard } from '../components/chat/ChatDomainComponents';
import { useChatRealtime } from '../hooks/useChatRealtime';
import { useSupportRealtime } from '../hooks/useSupportRealtime';
import { formatDateShort, formatRelativeDate, formatTime } from '../lib/formatDate';

const DEPARTMENTS = [
  { value: 'fashion_stylist', label: 'استایلیست مد', action: 'مشاوره با استایلیست', description: 'راهنمایی برای استایل، سایز و انتخاب لباس' },
  { value: 'support', label: 'پشتیبانی مشتری', action: 'پشتیبانی مشتری', description: 'پیگیری سفارش، ارسال و پرداخت' },
];

const statusLabel = (value) => ({ queued: 'در صف انتظار', assigned: 'در حال پیگیری', closed: 'بسته شده' }[value] || value);
const normalize = (response) => Array.isArray(response.data) ? response.data : (response.data?.results || []);
const counterpartName = (conversation, user) => {
  const person = conversation.assigned_agent || conversation.customer;
  if (person?.id === user?.id) return 'پشتیبانی مشتری';
  return person?.display_name || person?.username || DEPARTMENTS.find((item) => item.value === conversation.department)?.label;
};

export default function SupportChatPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [products, setProducts] = useState([]);
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState('list');
  const endRef = useRef(null);
  const initialConversationIdRef = useRef(Number(searchParams.get('conversation')) || null);
  const active = useMemo(() => conversations.find((item) => item.id === activeId) || selectedConversation, [activeId, conversations, selectedConversation]);

  const refresh = useCallback(async () => {
    const response = await supportAPI.listConversations();
    const data = normalize(response);
    setConversations(data);
    return data;
  }, []);

  const selectConversation = useCallback(async (id, { updateUrl = true, conversation = null } = {}) => {
    setActiveId(id);
    setSelectedConversation(conversation);
    setMobilePane('chat');
    if (updateUrl) setSearchParams({ conversation: String(id) }, { replace: true });
    setMessagesLoading(true);
    try {
      const response = await supportAPI.getMessages(id);
      setMessages(normalize(response));
      await supportAPI.markRead(id);
      setConversations((items) => items.map((item) => item.id === id ? { ...item, unread_count: 0 } : item));
    } catch {
      toast({ title: 'بارگذاری پیام‌ها ممکن نبود.', variant: 'destructive' });
    } finally {
      setMessagesLoading(false);
    }
  }, [setSearchParams, toast]);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return undefined; }
    let cancelled = false;
    refresh().then((items) => {
      if (cancelled) return;
      const requestedId = initialConversationIdRef.current;
      if (requestedId && items.some((item) => item.id === requestedId)) selectConversation(requestedId, { updateUrl: false });
    }).catch(() => {
      if (!cancelled) toast({ title: 'بارگذاری گفت‌وگوهای پشتیبانی ممکن نبود.', variant: 'destructive' });
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refresh, selectConversation, toast, user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    productsAPI.getProducts({ page_size: 8, is_active: true }).then((response) => {
      if (!cancelled) setProducts(response.data?.results || response.data || []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);

  const refreshTimer = useRef(null);
  const refreshSoon = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => { refresh(); }, 400);
  }, [refresh]);
  useEffect(() => () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
  }, []);

  useChatRealtime({
    currentUserId: user?.id,
    setConversations,
    onSupportUpdated: refreshSoon,
    onSupportUnread: refreshSoon,
  });
  useSupportRealtime({ currentUserId: user?.id, activeId, setMessages });

  const openDepartment = async (department) => {
    if (busy || loading) return;
    const existing = conversations.find((item) => item.department === department);
    if (existing) {
      if (existing.status === 'closed') {
        setBusy(true);
        try {
          const response = await supportAPI.reopen(existing.id);
          setConversations((items) => items.map((item) => item.id === existing.id ? response.data : item));
          await selectConversation(existing.id, { conversation: response.data });
        } catch {
          toast({ title: 'بازگشایی گفت‌وگو ممکن نبود.', variant: 'destructive' });
        } finally {
          setBusy(false);
        }
      } else {
        await selectConversation(existing.id);
      }
      return;
    }
    setBusy(true);
    try {
      const response = await supportAPI.createConversation(department);
      const conversation = response.data;
      setConversations((items) => [conversation, ...items.filter((item) => item.id !== conversation.id)]);
      await selectConversation(conversation.id, { conversation });
    } catch {
      toast({ title: 'شروع گفت‌وگو ممکن نبود.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!active || !text || busy || active.status === 'closed') return;
    setBusy(true);
    try {
      const response = await supportAPI.sendMessage(active.id, { text });
      setMessages((items) => [...items, response.data]);
      setDraft('');
      await refresh();
    } catch {
      toast({ title: 'ارسال پیام ممکن نبود.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const sendProduct = async (product) => {
    if (!active || busy || active.status === 'closed') return;
    setBusy(true);
    try {
      const response = await supportAPI.sendMessage(active.id, { product_id: product.id });
      setMessages((items) => [...items, response.data]);
      setProductsOpen(false);
      await refresh();
    } catch {
      toast({ title: 'اشتراک‌گذاری محصول ممکن نبود.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (action) => {
    if (!active || busy) return;
    setBusy(true);
    try {
      const response = await supportAPI[action](active.id);
      setConversations((items) => items.map((item) => item.id === active.id ? response.data : item));
    } catch {
      toast({ title: 'به‌روزرسانی گفت‌وگو ممکن نبود.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length]);

  if (!user?.id) {
    return <div className="flex min-h-[70vh] flex-col items-center justify-center bg-background p-6 text-center" dir="rtl"><MessageCircle className="mb-4 h-12 w-12 text-amber-600" /><h1 className="text-2xl font-black">پشتیبانی و استایلیست</h1><p className="mt-2 text-sm text-muted-foreground">برای شروع گفت‌وگو وارد حساب کاربری شوید.</p><Link to="/login" className="mt-6 rounded-xl bg-amber-500 px-5 py-3 font-bold text-black">ورود به حساب</Link></div>;
  }

  return (
    <div className="flex h-full w-full flex-col bg-background" dir="rtl" data-testid="support-chat-workspace">
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col overflow-hidden border-x border-border/50">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className={`${mobilePane === 'list' ? 'flex' : 'hidden'} w-full flex-col border-l border-border/50 bg-card/60 sm:flex sm:w-[320px] lg:w-[360px] sm:shrink-0`}>
            <header className="border-b border-border/50 p-4"><h1 className="font-black">پشتیبانی و استایلیست</h1><p className="mt-1 text-xs text-muted-foreground">گفت‌وگو با کارشناس انسانی</p></header>
            <div className="space-y-2 border-b border-border/50 p-3" aria-label="شروع گفت‌وگوی پشتیبانی">
              {DEPARTMENTS.map((department) => <button key={department.value} type="button" disabled={busy || loading} onClick={() => openDepartment(department.value)} className="flex w-full items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-right transition hover:bg-amber-500/10 disabled:opacity-60"><Crown className="h-5 w-5 shrink-0 text-amber-600" /><span><strong className="block text-sm">{department.action}</strong><small className="text-xs text-muted-foreground">{department.description}</small></span></button>)}
            </div>
            <div className="flex-1 overflow-y-auto p-2" aria-label="فهرست گفت‌وگوهای پشتیبانی">
              {loading ? <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-amber-600" /> : conversations.length === 0 ? <p className="p-4 text-center text-xs text-muted-foreground">برای شروع، یکی از گزینه‌های بالا را انتخاب کنید.</p> : conversations.map((conversation) => <button key={conversation.id} type="button" onClick={() => selectConversation(conversation.id)} className={`mb-1 w-full rounded-xl p-3 text-right transition ${activeId === conversation.id ? 'bg-amber-500/15 ring-1 ring-amber-500/25' : 'hover:bg-muted/50'}`}><div className="flex justify-between gap-2"><strong className="truncate text-sm">{counterpartName(conversation, user)}</strong><span className="shrink-0 text-[11px] text-muted-foreground">{formatRelativeDate(conversation.updated_at || conversation.created_at)}</span></div><div className="mt-1 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{DEPARTMENTS.find((item) => item.value === conversation.department)?.label} · {statusLabel(conversation.status)}</span>{conversation.unread_count > 0 && <span className="rounded-full bg-amber-500 px-2 text-[10px] font-bold text-black">{conversation.unread_count}</span>}</div><p className="mt-1 truncate text-xs text-muted-foreground">{conversation.last_message?.text || 'گفت‌وگو را شروع کنید'}</p></button>)}
            </div>
          </aside>
          <section className={`${mobilePane === 'chat' ? 'flex' : 'hidden'} min-w-0 flex-1 flex-col sm:flex`} data-testid="support-message-pane">
            {active ? <><header className="flex min-h-[72px] items-center justify-between gap-3 border-b border-border/50 bg-card px-3 py-3 sm:px-4"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobilePane('list')} className="rounded-xl p-2 hover:bg-muted sm:hidden" aria-label="بازگشت به فهرست گفت‌وگوها"><ArrowRight className="h-5 w-5" /></button><div className="min-w-0"><h2 className="truncate font-black">{DEPARTMENTS.find((item) => item.value === active.department)?.label}</h2><p className="text-xs text-muted-foreground">{active.assigned_agent ? `کارشناس: ${counterpartName(active, user)} · ` : ''}{statusLabel(active.status)}</p></div></div>{active.status === 'closed' ? <button type="button" onClick={() => changeStatus('reopen')} disabled={busy} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold"><RotateCcw className="h-4 w-4" /> بازگشایی</button> : <button type="button" onClick={() => changeStatus('close')} disabled={busy} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold"><XCircle className="h-4 w-4" /> بستن</button>}</header><div className="flex-1 overflow-y-auto p-4">{messagesLoading ? <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-amber-600" /> : messages.map((message, index) => { const mine = message.sender?.id === user.id || message.sender_id === user.id; const previous = messages[index - 1]; const showDate = !previous || formatDateShort(previous.created_at) !== formatDateShort(message.created_at); const senderName = mine ? 'شما' : (message.sender?.display_name || message.sender?.username || active.assigned_agent?.display_name || active.assigned_agent?.username || 'کارشناس'); return <div key={message.id}>{showDate && <div className="my-3 text-center"><span className="rounded-full bg-muted px-3 py-1 text-[10px] font-bold text-muted-foreground">{formatDateShort(message.created_at)}</span></div>}<div className={`mb-3 flex flex-col ${mine ? 'items-start' : 'items-end'}`}><span className="mb-1 px-2 text-[10px] font-bold text-muted-foreground">{senderName}</span><div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-right ${mine ? 'bg-amber-500 text-black' : 'bg-card ring-1 ring-border/50'}`}>{message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}{message.product && <ProductMessageCard product={message.product} />}<p className="mt-1 text-[10px] opacity-70">{formatTime(message.created_at)}</p></div></div></div>; })}<div ref={endRef} /></div>{productsOpen && <div className="max-h-64 overflow-y-auto border-t border-border/50 bg-card p-3"><div className="grid grid-cols-2 gap-2">{products.map((product) => <button key={product.id} type="button" onClick={() => sendProduct(product)} disabled={busy} className="rounded-xl border border-border/50 p-1 text-right disabled:opacity-50"><ProductMessageCard product={product} /></button>)}</div></div>}<form onSubmit={sendMessage} className="flex gap-2 border-t border-border/50 bg-card p-3"><button type="button" onClick={() => setProductsOpen((value) => !value)} disabled={busy || active.status === 'closed'} className="rounded-xl border border-amber-500/30 px-3 text-amber-600 disabled:opacity-50" aria-label="اشتراک‌گذاری محصول"><ShoppingBag className="h-5 w-5" /></button><input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={busy || active.status === 'closed'} placeholder="پیام خود را بنویسید..." className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-right text-sm outline-none focus:border-amber-500" /><button type="submit" disabled={busy || active.status === 'closed' || !draft.trim()} className="rounded-xl bg-amber-500 px-4 text-black disabled:opacity-50" aria-label="ارسال پیام"><Send className="h-5 w-5" /></button></form></> : <div className="flex h-full flex-col items-center justify-center p-6 text-center"><Crown className="mb-4 h-12 w-12 text-amber-600" /><h2 className="text-xl font-black">یک بخش پشتیبانی را انتخاب کنید</h2><p className="mt-2 max-w-sm text-sm text-muted-foreground">گفت‌وگو در همین فضای چت باز می‌شود.</p></div>}
          </section>
        </div>
      </div>
    </div>
  );
}
