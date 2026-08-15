import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCheck, Headphones, Loader2, RotateCcw, Send, ShoppingBag, UserCheck, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { productsAPI, supportAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/use-toast';
import { ProductMessageCard } from '../components/chat/ChatDomainComponents';
import { formatTime } from '../lib/formatDate';

const labels = { support: 'Customer Support', fashion_stylist: 'Fashion Stylist' };
const statuses = { queued: 'Queued', assigned: 'Assigned', closed: 'Closed' };
const normalize = (response) => Array.isArray(response.data) ? response.data : (response.data?.results || []);

const displayName = (person) => person?.display_name || person?.username || 'Unknown customer';

export default function SupportInboxPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [products, setProducts] = useState([]);
  const [productsOpen, setProductsOpen] = useState(false);
  const [tab, setTab] = useState('queue');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [departments, setDepartments] = useState([]);
  const endRef = useRef(null);
  const isStaff = departments.length > 0;
  const conversations = tab === 'queue' ? queue : assigned;
  const active = useMemo(() => [...queue, ...assigned].find((item) => item.id === activeId) || null, [activeId, assigned, queue]);

  const refresh = useCallback(async () => {
    const [queueResponse, assignedResponse, unreadResponse] = await Promise.all([
      supportAPI.queue(), supportAPI.assigned(), supportAPI.unreadCount(),
    ]);
    setQueue(normalize(queueResponse));
    setAssigned(normalize(assignedResponse));
    const count = unreadResponse.data?.unread_count || 0;
    setUnreadCount(count);
    return count;
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return undefined; }
    let cancelled = false;
    supportAPI.myDepartments().then(async (response) => {
      const available = response.data?.departments || [];
      if (cancelled) return;
      setDepartments(available);
      if (!available.length) return;
      await Promise.all([
        refresh(),
        supportAPI.agents().then((result) => { if (!cancelled) setAgents(normalize(result)); }),
        productsAPI.getProducts({ page_size: 12, is_active: true }).then((result) => { if (!cancelled) setProducts(result.data?.results || result.data || []); }),
      ]);
    }).catch(() => { if (!cancelled) toast({ title: 'Unable to load the support inbox.', variant: 'destructive' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, refresh, toast]);

  const openConversation = async (conversation) => {
    setActiveId(conversation.id);
    setMessagesLoading(true);
    try {
      const response = await supportAPI.getMessages(conversation.id);
      setMessages(normalize(response));
      await supportAPI.markRead(conversation.id);
      await refresh();
    } catch { toast({ title: 'Unable to load this conversation.', variant: 'destructive' }); }
    finally { setMessagesLoading(false); }
  };

  const updateConversation = async (action, ...args) => {
    if (!active || busy) return;
    setBusy(true);
    try {
      const response = await supportAPI[action](active.id, ...args);
      setQueue((items) => items.map((item) => item.id === active.id ? response.data : item));
      setAssigned((items) => items.map((item) => item.id === active.id ? response.data : item));
      await refresh();
    } catch (error) { toast({ title: error.response?.data?.detail || 'Unable to update the conversation.', variant: 'destructive' }); }
    finally { setBusy(false); }
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
    } catch { toast({ title: 'Unable to send the reply.', variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  const sendProduct = async (product) => {
    if (!active || busy || active.status === 'closed') return;
    setBusy(true);
    try {
      const response = await supportAPI.sendMessage(active.id, { product_id: product.id });
      setMessages((items) => [...items, response.data]);
      setProductsOpen(false);
      await refresh();
    } catch { toast({ title: 'Unable to share the product.', variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  if (!isStaff) return <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 p-6 text-center"><Headphones className="h-12 w-12 text-amber-600" /><h1 className="text-2xl font-black">Staff access required</h1><p className="text-sm text-muted-foreground">This inbox is available only to authorized support staff.</p><button type="button" onClick={() => navigate('/support')} className="rounded-xl bg-amber-500 px-5 py-3 font-bold text-black">Go to support</button></div>;

  return (
    <div className="flex h-full w-full flex-col bg-background" dir="ltr" data-testid="support-staff-workspace">
      <div className="mx-auto flex h-full w-full max-w-[1500px] flex-col overflow-hidden border-x border-border/50">
        <div className="flex min-h-0 flex-1">
          <aside className={`${active ? 'hidden sm:flex' : 'flex'} w-full sm:w-[360px] shrink-0 flex-col border-r border-border/50 bg-card/60`}>
            <header className="flex items-center gap-3 border-b border-border/50 p-4"><button type="button" onClick={() => navigate('/chat')} className="rounded-xl p-2 hover:bg-muted" aria-label="Back to chat"><ArrowLeft className="h-5 w-5" /></button><div className="min-w-0 flex-1"><h1 className="font-black">Support Inbox</h1><p className="text-xs text-muted-foreground">{departments.map((item) => labels[item]).join(' / ')} · {user.username}</p></div><span className="rounded-full bg-amber-500 px-2.5 py-1 text-xs font-black text-black" aria-label={`${unreadCount} unread support conversations`}>{unreadCount} unread</span></header>
            <div className="flex gap-1 border-b border-border/50 p-2"><button type="button" onClick={() => setTab('queue')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${tab === 'queue' ? 'bg-amber-500 text-black' : 'hover:bg-muted'}`}>Queue ({queue.length})</button><button type="button" onClick={() => setTab('assigned')} className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold ${tab === 'assigned' ? 'bg-amber-500 text-black' : 'hover:bg-muted'}`}>Assigned ({assigned.length})</button></div>
            <div className="flex-1 overflow-y-auto p-2">{loading ? <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-amber-600" /> : conversations.map((conversation) => <button key={conversation.id} type="button" onClick={() => openConversation(conversation)} className={`mb-1 w-full rounded-xl p-3 text-left ${activeId === conversation.id ? 'bg-amber-500/15' : 'hover:bg-muted/50'}`}><div className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{displayName(conversation.customer)}</strong><span className="text-[11px] text-muted-foreground">{statuses[conversation.status]}</span></div><div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{labels[conversation.department]}</span>{conversation.unread_count > 0 && <span className="rounded-full bg-amber-500 px-2 font-bold text-black">{conversation.unread_count}</span>}</div></button>)}</div>
          </aside>
          <section className={`${active ? 'flex' : 'hidden sm:flex'} min-w-0 flex-1 flex-col`}>
            {active ? <><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-card p-4"><div><div className="flex items-center gap-2"><button type="button" onClick={() => setActiveId(null)} className="rounded-xl p-2 hover:bg-muted sm:hidden" aria-label="Back to inbox"><ArrowLeft className="h-5 w-5" /></button><h2 className="font-black">{displayName(active.customer)}</h2></div><p className="text-xs text-muted-foreground">{labels[active.department]} · {statuses[active.status]}</p></div><div className="flex flex-wrap items-center justify-end gap-2">{active.status !== 'closed' && agents.length > 0 && <><select aria-label="Assign staff member" value={selectedAgentId} onChange={(event) => setSelectedAgentId(event.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-xs"><option value="">Assign to...</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{displayName(agent)}</option>)}</select>{selectedAgentId && <button type="button" onClick={() => updateConversation('assign', Number(selectedAgentId))} disabled={busy} className="rounded-lg border border-border px-3 py-2 text-xs font-bold">Assign</button>}</>}{active.status === 'queued' && <button type="button" onClick={() => updateConversation('claim')} disabled={busy} className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-black"><UserCheck className="h-4 w-4" /> Claim</button>}{active.status === 'closed' ? <button type="button" onClick={() => updateConversation('reopen')} disabled={busy} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold"><RotateCcw className="h-4 w-4" /> Reopen</button> : <button type="button" onClick={() => updateConversation('close')} disabled={busy} className="flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-bold"><XCircle className="h-4 w-4" /> Close</button>}</div></header><div className="flex-1 overflow-y-auto p-4">{messagesLoading ? <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-amber-600" /> : messages.map((message) => { const mine = message.sender?.id === user.id; return <div key={message.id} className={`mb-3 flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-amber-500 text-black' : 'bg-card ring-1 ring-border/50'}`}>{message.product && <ProductMessageCard product={message.product} />}{message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}<div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70"><span>{formatTime(message.created_at)}</span>{mine && (message.is_read ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />)}</div></div></div>; })}<div ref={endRef} /></div>{productsOpen && <div className="max-h-64 overflow-y-auto border-t border-border/50 bg-card p-3"><div className="grid grid-cols-2 gap-2">{products.map((product) => <button key={product.id} type="button" onClick={() => sendProduct(product)} disabled={busy} className="rounded-xl border border-border/50 p-1 text-left"><ProductMessageCard product={product} /></button>)}</div></div>}<form onSubmit={sendMessage} className="flex gap-2 border-t border-border/50 bg-card p-3"><button type="button" onClick={() => setProductsOpen((value) => !value)} disabled={busy || active.status === 'closed'} className="rounded-xl border border-amber-500/30 px-3 text-amber-600" aria-label="Share a product"><ShoppingBag className="h-5 w-5" /></button><input value={draft} onChange={(event) => setDraft(event.target.value)} disabled={busy || active.status === 'closed'} placeholder="Write a reply..." className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-amber-500" /><button type="submit" disabled={busy || active.status === 'closed' || !draft.trim()} className="rounded-xl bg-amber-500 px-4 text-black disabled:opacity-50"><Send className="h-5 w-5" /></button></form></> : <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground"><Headphones className="mr-3 h-8 w-8 text-amber-600" />Select a conversation from the {tab}.</div>}
          </section>
        </div>
      </div>
    </div>
  );
}
