import { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { chatAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/use-toast';
import ChatDashboard from '../components/chat/ChatDashboard';
import { useChatVisibilityRefresh } from '../hooks/useChatVisibilityRefresh';
import { useChatUserSearch } from '../hooks/useChatUserSearch';
import { useChatRealtime } from '../hooks/useChatRealtime';
import { useMessageViewportReceipts } from '../hooks/useMessageViewportReceipts';
import { chatPrivateSocketPath } from '../lib/realtimePaths';
import { getRealtimeSocket } from '../services/realtime';
import { mergeMessages, replaceOptimisticMessage, unwrapMessagePage } from '../lib/messages';

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
  const [conversationNext, setConversationNext] = useState(null);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { query, setQuery, searchResults, setSearchResults, searching } = useChatUserSearch();
  const [mobilePane, setMobilePane] = useState('list'); // list | chat | profile
  const [showEmoji, setShowEmoji] = useState(false);
  const [sendProductOpen, setSendProductOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all | friends
  const [profileOpen, setProfileOpen] = useState(true);
  const [sharedOpen, setSharedOpen] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [sharedProducts, setSharedProducts] = useState([]);
  const [sharedProductsCount, setSharedProductsCount] = useState(0);
  const [sharedProductsNextOffset, setSharedProductsNextOffset] = useState(null);
  const [sharedProductsLoading, setSharedProductsLoading] = useState(false);
  const [peerPresence, setPeerPresence] = useState('offline');
  const [replyTo, setReplyTo] = useState(null);
  const [realtimeConnected, setRealtimeConnected] = useState(true);
  const [threadQuery, setThreadQuery] = useState('');
  const [threadHits, setThreadHits] = useState([]);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const typingTimerRef = useRef(null);
  const typingDebounceRef = useRef(null);
  const peerTypingTimerRef = useRef(null);


  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const restoreScrollRef = useRef(null);
  const paginationRef = useRef({ id: null, oldestId: null, hasOlder: false, token: 0 });
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const pendingKeysRef = useRef(new Map()); // tempId -> key
  const keyToTempRef = useRef(new Map()); // key -> tempId

  const currentUserId = user?.id;
  const active = useMemo(
    () => conversations.find((c) => c.id === Number(activeId)) || null,
    [conversations, activeId]
  );
  useEffect(() => {
    if (!activeId) {
      setSharedProducts([]);
      setSharedProductsCount(0);
      setSharedProductsNextOffset(null);
      return;
    }
    let cancelled = false;
    if (typeof chatAPI.getSharedProducts !== 'function') return () => { cancelled = true; };
    setSharedProductsLoading(true);
    chatAPI.getSharedProducts(activeId, { limit: 24 }).then((response) => {
      if (cancelled) return;
      setSharedProducts(response.data?.results || []);
      setSharedProductsCount(response.data?.count || 0);
      setSharedProductsNextOffset(response.data?.next_offset ?? null);
    }).catch(() => {
      if (!cancelled) { setSharedProducts([]); setSharedProductsCount(0); setSharedProductsNextOffset(null); }
    }).finally(() => {
      if (!cancelled) setSharedProductsLoading(false);
    });
    return () => { cancelled = true; };
  }, [activeId]);

  const loadMoreSharedProducts = useCallback(async () => {
    if (!activeId || sharedProductsNextOffset == null || sharedProductsLoading || typeof chatAPI.getSharedProducts !== 'function') return;
    setSharedProductsLoading(true);
    try {
      const response = await chatAPI.getSharedProducts(activeId, { limit: 24, offset: sharedProductsNextOffset });
      const incoming = response.data?.results || [];
      setSharedProducts((current) => {
        const seen = new Set(current.map((product) => product.id));
        return [...current, ...incoming.filter((product) => !seen.has(product.id))];
      });
      setSharedProductsNextOffset(response.data?.next_offset ?? null);
    } catch {
      // Keep the already loaded page available when a subsequent page fails.
    } finally {
      setSharedProductsLoading(false);
    }
  }, [activeId, sharedProductsNextOffset, sharedProductsLoading]);

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
        setConversationNext(res.data?.next || null);
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

  const loadMoreConversations = useCallback(async () => {
    if (!conversationNext || loadingMoreConversations) return;
    setLoadingMoreConversations(true);
    try {
      const page = new URL(conversationNext, window.location.origin).searchParams.get('page');
      const res = await chatAPI.getConversations(page ? { page } : {});
      const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setConversations((previous) => {
        const byId = new Map(previous.map((item) => [item.id, item]));
        data.forEach((item) => byId.set(item.id, { ...byId.get(item.id), ...item }));
        return [...byId.values()];
      });
      setConversationNext(res.data?.next || null);
    } catch {
      toast({ title: 'خطا', description: 'بارگذاری گفتگوهای بیشتر ممکن نشد.', variant: 'destructive' });
    } finally {
      setLoadingMoreConversations(false);
    }
  }, [conversationNext, loadingMoreConversations, toast]);

  const loadMessages = useCallback(async (id) => {
    const token = ++paginationRef.current.token;
    paginationRef.current.id = id;
    setConvLoading(true);
    setMessages([]);
    setHasOlder(false);
    setLoadingOlder(false);
    try {
      const res = await chatAPI.getMessages(id, { limit: 50 });
      if (paginationRef.current.token !== token || paginationRef.current.id !== id) return;
      const page = unwrapMessagePage(res.data);
      setMessages(page.results);
      paginationRef.current.oldestId = page.oldestId;
      paginationRef.current.hasOlder = page.hasOlder;
      setHasOlder(page.hasOlder);
    } catch {
      toast({ title: 'خطا', description: 'بارگذاری پیام‌ها ممکن نشد.', variant: 'destructive' });
    } finally {
      setConvLoading(false);
    }
  }, [toast]);

  const loadOlderMessages = useCallback(async () => {
    const state = paginationRef.current;
    if (!state.id || !state.hasOlder || loadingOlder) return;
    const viewport = messagesScrollRef.current;
    const anchor = viewport ? { scrollHeight: viewport.scrollHeight, scrollTop: viewport.scrollTop } : null;
    const token = state.token;
    setLoadingOlder(true);
    try {
      const res = await chatAPI.getMessages(state.id, { before: state.oldestId, limit: 50 });
      if (paginationRef.current.token !== token || paginationRef.current.id !== state.id) return;
      const page = unwrapMessagePage(res.data);
      setMessages((prev) => mergeMessages(prev, page.results));
      state.oldestId = page.oldestId ?? state.oldestId;
      state.hasOlder = page.hasOlder;
      setHasOlder(page.hasOlder);
      if (anchor) restoreScrollRef.current = anchor;
    } catch {
      toast({ title: 'خطا', description: 'بارگذاری پیام‌های قدیمی‌تر ممکن نشد.', variant: 'destructive' });
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, toast]);

  const handleMessagesScroll = (event) => {
    const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
    shouldStickToBottomRef.current = scrollHeight - scrollTop - clientHeight < 96;
    if (event.currentTarget.scrollTop <= 48) loadOlderMessages();
  };


  const handleSearchHit = useCallback(async (hit) => {
    if (!activeId || !hit?.id) return;
    try {
      const response = await chatAPI.getMessageContext(activeId, hit.id);
      const page = unwrapMessagePage(response.data);
      setMessages(page.results);
      paginationRef.current.oldestId = page.oldestId;
      paginationRef.current.hasOlder = page.hasOlder;
      setHasOlder(page.hasOlder);
      setThreadQuery('');
      setThreadHits([]);
      requestAnimationFrame(() => {
        document.querySelector(`[data-message-id="${hit.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } catch {
      toast({ title: 'خطا', description: 'باز کردن پیام یافت‌شده ممکن نشد.', variant: 'destructive' });
    }
  }, [activeId, toast]);
  useEffect(() => {
    if (activeId) loadMessages(activeId);
    else setMessages([]);
  }, [activeId, loadMessages]);

  useChatVisibilityRefresh({
    currentUserId,
    activeId,
    setConversations,
    refreshMessages: loadMessages,
    realtimeConnected,
  });

  useChatRealtime({
    currentUserId,
    activeId,
    setMessages,
    setConversations,
    onNotification: (notification) => {
      toast({ title: 'اعلان جدید', description: notification.text });
    },
    onTyping: (event) => {
      if (event.user_id === currentUserId) return;
      const isTyping = event.status !== 'stopped';
      setPeerTyping(isTyping);
      clearTimeout(peerTypingTimerRef.current);
      if (isTyping) {
        peerTypingTimerRef.current = setTimeout(() => setPeerTyping(false), 4000);
      }
    },
    onPresence: (event) => {
      if (event.user_id === currentUserId) return;
      setPeerPresence(event.status || (event.online ? 'online' : 'offline'));
    },
    onSocketStatus: (socketStatus) => {
      setRealtimeConnected(socketStatus === 'open');
    },
  });

  useMessageViewportReceipts({
    conversationId: activeId,
    currentUserId,
    messages,
    enabled: Boolean(activeId && active?.status === 'accepted'),
    rootRef: messagesScrollRef,
  });

  useEffect(() => {
    setPeerTyping(false);
    setPeerPresence('offline');
    setReplyTo(null);
    setThreadQuery('');
    setThreadHits([]);
    setForwardingMessage(null);
    clearTimeout(typingTimerRef.current);
    clearTimeout(typingDebounceRef.current);
    clearTimeout(peerTypingTimerRef.current);
  }, [activeId]);

  useEffect(() => {
    if (!activeId || threadQuery.trim().length < 2) {
      setThreadHits([]);
      return undefined;
    }
    const handle = setTimeout(async () => {
      try {
        const response = await chatAPI.searchMessages(activeId, threadQuery.trim());
        setThreadHits(response.data?.results || []);
      } catch {
        setThreadHits([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [activeId, threadQuery]);

  const sendTypingStop = useCallback(() => {
    if (!activeId) return;
    const socket = getRealtimeSocket(chatPrivateSocketPath(activeId));
    socket.send({ type: 'typing', status: 'stopped' });
  }, [activeId]);

  useEffect(() => () => {
    clearTimeout(typingTimerRef.current);
    clearTimeout(typingDebounceRef.current);
    clearTimeout(peerTypingTimerRef.current);
    if (activeId) sendTypingStop();
  }, [activeId, sendTypingStop]);

  const updateDraft = (value) => {
    const next = typeof value === 'function' ? value(text) : value;
    setText(next);
    if (!activeId) return;
    clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => {
      const socket = getRealtimeSocket(chatPrivateSocketPath(activeId));
      if (String(next || '').trim()) {
        socket.send({ type: 'typing', status: 'typing' });
      } else {
        socket.send({ type: 'typing', status: 'stopped' });
      }
    }, 300);
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      sendTypingStop();
    }, 2000);
  };



  useLayoutEffect(() => {
    const anchor = restoreScrollRef.current;
    const viewport = messagesScrollRef.current;
    if (anchor && viewport) {
      viewport.scrollTop = viewport.scrollHeight - anchor.scrollHeight + anchor.scrollTop;
      restoreScrollRef.current = null;
      return;
    }
    if (shouldStickToBottomRef.current || convLoading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length, convLoading]);

  const selectConversation = (id) => {
    shouldStickToBottomRef.current = true;
    setActiveId(id);
    setMenuOpen(false);
    setMobilePane('chat');
    navigate(`/chat/${id}`, { replace: true });
  };


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
    } catch (err) {
      const detail =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        (err?.response?.status === 429
          ? 'تعداد درخواست‌های شما زیاد است. کمی بعد دوباره تلاش کنید.'
          : 'ایجاد گفتگو ممکن نشد.');
      toast({ title: 'خطا', description: detail, variant: 'destructive' });
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

  const handleContactStylist = async () => {
    navigate('/support');
    if (window.location.pathname.startsWith('/chat')) return;
    /* Legacy private-chat stylist flow retained for unknown clients only. */
    try {
      const res = await chatAPI.contactStylist();
      const updated = await chatAPI.getConversations();
      const data = Array.isArray(updated.data) ? updated.data : (updated.data?.results || []);
      setConversations(data);
      selectConversation(res.data.id);
    } catch {
      toast({ title: 'خطا', description: 'ارتباط با استایلیست مد ممکن نشد.', variant: 'destructive' });
    }
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

  const handleReply = (message) => {
    if (!message || typeof message.id !== 'number' || message.deleted_for_everyone) return;
    setReplyTo(message);
    textareaRef.current?.focus();
  };

  const handleForward = (message) => {
    if (!message || typeof message.id !== 'number' || message.deleted_for_everyone) return;
    setForwardingMessage(message);
  };

  const handleConfirmForward = async ({ conversationIds = [], roomIds = [] } = {}) => {
    if (!forwardingMessage || (!conversationIds.length && !roomIds.length)) {
      setForwardingMessage(null);
      return;
    }
    try {
      await chatAPI.forwardMessage(forwardingMessage.id, { conversationIds, roomIds });
      toast({ title: 'هدایت شد', description: 'پیام به گفتگوهای انتخاب‌شده ارسال شد.' });
    } catch (err) {
      toast({
        title: 'خطا',
        description: err?.response?.data?.error || 'هدایت پیام ممکن نشد.',
        variant: 'destructive',
      });
    } finally {
      setForwardingMessage(null);
    }
  };

  const handleDeleteMessage = async (message, mode) => {
    if (!message || typeof message.id !== 'number') return;
    try {
      await chatAPI.deleteMessage(message.id, mode);
      if (mode === 'everyone') {
        setMessages((prev) => prev.map((item) => (
          item.id === message.id
            ? { ...item, deleted_for_everyone: true, text: '', product: null }
            : item
        )));
      } else {
        setMessages((prev) => prev.filter((item) => item.id !== message.id));
      }
    } catch (err) {
      toast({
        title: 'خطا',
        description: err?.response?.data?.error || 'حذف پیام ممکن نشد.',
        variant: 'destructive',
      });
    }
  };

  const handleReportMessage = (message) => {
    if (!message || typeof message.id !== 'number') return;
    askConfirm({
      title: 'گزارش پیام',
      message: 'این پیام به‌خاطر محتوای نامناسب گزارش شود؟',
      confirm: 'گزارش',
      danger: true,
      onConfirm: async () => {
        try {
          await chatAPI.reportMessage(message.id, { reason: 'other' });
          toast({ title: 'ثبت شد', description: 'گزارش شما برای بررسی ارسال شد.' });
        } catch (err) {
          toast({
            title: 'خطا',
            description: err?.response?.data?.error || 'ارسال گزارش ممکن نشد.',
            variant: 'destructive',
          });
        }
      },
    });
  };

  const handleSend = async (e, overrideText, overrideReply, existingKey) => {
    e?.preventDefault();
    const payload = (overrideText ?? text).trim();
    if (!activeId || !payload || sending) return;
    if (active && active.status !== 'accepted') {
      const desc = active.status === 'pending'
        ? (active.is_requester ? 'درخواست گفتگو ارسال شده و در انتظار تایید است. پس از تایید می‌توانید پیام بفرستید.' : 'لطفاً ابتدا درخواست گفتگو را بپذیرید تا امکان ارسال پیام فراهم شود.')
        : active.status === 'declined'
          ? 'این گفتگو رد شده است. برای ارسال پیام دوباره درخواست دهید.'
          : active.is_blocked
            ? 'این گفتگو به دلیل بلاک مسدود است.'
            : 'در حال حاضر امکان ارسال پیام وجود ندارد.';
      toast({ title: 'امکان ارسال پیام وجود ندارد', description: desc, variant: 'destructive' });
      return;
    }
    setSending(true);
    const replySnapshot = overrideReply ?? replyTo;
    const idempotencyKey = existingKey || ((typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `local-${Date.now()}`);
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimistic = {
      id: tempId,
      sender_id: currentUserId,
      sender_username: user?.username,
      sender_name: user?.username,
      text: payload,
      product: null,
      is_read: false,
      reaction: '',
      is_favorite: false,
      status: 'sent',
      idempotency_key: idempotencyKey,
      reply_to: replySnapshot
        ? {
            id: replySnapshot.id,
            text: (replySnapshot.text || '').slice(0, 140),
            sender_name: replySnapshot.sender_name || replySnapshot.sender_username || '',
            deleted: Boolean(replySnapshot.deleted_for_everyone),
          }
        : null,
      created_at: new Date().toISOString(),
    };
    pendingKeysRef.current.set(tempId, idempotencyKey);
    keyToTempRef.current.set(idempotencyKey, tempId);
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    setReplyTo(null);
    setShowEmoji(false);
    clearTimeout(typingTimerRef.current);
    clearTimeout(typingDebounceRef.current);
    sendTypingStop();
    try {
      const res = await chatAPI.sendMessage(activeId, {
        text: payload,
        reply_to_id: replySnapshot?.id,
        idempotency_key: idempotencyKey,
      });
      const serverMsg = { ...res.data, status: 'sent' };
      // If WS already replaced this optimistic, the temp is gone — merge will dedupe by id.
      setMessages((prev) => {
        const hasTemp = prev.some((m) => String(m.id) === String(tempId));
        if (hasTemp) return replaceOptimisticMessage(prev, tempId, serverMsg);
        return mergeMessages(prev, [serverMsg]);
      });
      pendingKeysRef.current.delete(tempId);
      keyToTempRef.current.delete(idempotencyKey);
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? { ...m, status: 'failed' } : m)));
      // Keep pendingKeys for retry with same key
      toast({ title: 'خطا', description: 'ارسال پیام ممکن نشد.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const insertEmoji = (emoji) => {
    setText((t) => t + emoji);
    textareaRef.current?.focus();
  };

  const handleRetryMessage = (message) => {
    if (!message?.text || sending) return;
    const reuseKey = message.idempotency_key || pendingKeysRef.current.get(String(message.id)) || keyToTempRef.current.get(String(message.id));
    // Also check reverse map if message was already replaced but we kept key
    const keyForRetry = reuseKey || pendingKeysRef.current.get(String(message.id)) || message.idempotency_key;
    setMessages((previous) => previous.filter((item) => String(item.id) !== String(message.id)));
    // Clean old temp mapping if it exists
    if (reuseKey) {
      const oldTemp = keyToTempRef.current.get(reuseKey);
      if (oldTemp) {
        pendingKeysRef.current.delete(oldTemp);
        // keyToTemp will be overwritten by new temp
      }
    }
    handleSend(null, message.text, message.reply_to || null, keyForRetry || message.idempotency_key);
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
    <ChatDashboard model={{
      user, conversations, conversationNext, loadingMoreConversations, loadMoreConversations, activeId, messages, loading, convLoading, text, setText: updateDraft, sending,
    query, setQuery, searchResults, setSearchResults, searching, mobilePane, setMobilePane, showEmoji,
    setShowEmoji, sendProductOpen, setSendProductOpen, filter, setFilter, profileOpen,
    setProfileOpen, sharedOpen, setSharedOpen, sharedProducts, sharedProductsCount, sharedProductsNextOffset, sharedProductsLoading, loadMoreSharedProducts, messagesEndRef, textareaRef,
      messagesScrollRef, handleMessagesScroll, hasOlder, loadingOlder, currentUserId, active, loadMessages, selectConversation, handleStartRequest,
    hideModeNavigation: true,
    peerTyping,
    peerPresence,
    handleAcceptRequest, handleDeclineRequest, handleReopenRequest, handleCancelRequest,
    menuOpen, setMenuOpen, confirmDialog, askConfirm, closeConfirm, handleClearChat,
    handleBlock, handleUnblock, handleSend, insertEmoji, filteredConversations, handleContactStylist,
    replyTo, setReplyTo, threadQuery, setThreadQuery, threadHits,
    handleRetryMessage,
    handleSearchHit,
    handleReply, handleForward, handleDeleteMessage, handleReportMessage,
    forwardingMessage, setForwardingMessage, handleConfirmForward,
    }} />
  );
}

