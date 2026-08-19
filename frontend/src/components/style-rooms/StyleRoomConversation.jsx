import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, Gift, Loader2, MessageCircle, RefreshCw, Send, Smile } from 'lucide-react';
import { useToast } from '../ui/use-toast';
import { Avatar, EMOJIS, ProductMessageCard } from '../chat/ChatDomainComponents';
import { useMarkStyleRoomMessagesRead, useSendStyleRoomMessage, useStyleRoomMessagesQuery } from '../../queries/styleRoomQueries';
import { useStyleRoomRealtime } from '../../hooks/useStyleRoomRealtime';
import { formatTime } from '../../lib/formatDate';
import { mergeMessages } from '../../lib/messages';
import StyleRoomProductPicker from './StyleRoomProductPicker';

const RoomMessageBubble = ({ message, isMine }) => (
  <div className={`flex items-end gap-2.5 ${isMine ? 'flex-row-reverse' : ''}`}>
    {!isMine && <Avatar user={message.sender} size={32} ring={false} />}
    <div className="max-w-[88%] sm:max-w-[76%]">
      {!isMine && <p className="mb-1 px-1 text-[11px] font-semibold text-muted-foreground">{message.sender?.display_name || message.sender?.username}</p>}
      <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${isMine ? 'rounded-tr-md bg-[#effdde] text-foreground dark:bg-[#2b5278]' : 'rounded-tl-md border border-border/60 bg-card text-foreground'}`}>
        {message.product && <ProductMessageCard product={message.product} />}
        {message.text && <p className={`${message.product ? 'mt-2.5' : ''} whitespace-pre-wrap break-words font-medium`}>{message.text}</p>}
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] font-semibold text-muted-foreground">
          <span dir="ltr">{formatTime(message.created_at)}</span>
          {isMine && (message.read_by_all
            ? <CheckCheck className="h-3.5 w-3.5 text-sky-500" title="همه خوانده‌اند" />
            : message.read_count > 0
              ? <CheckCheck className="h-3.5 w-3.5 text-sky-500/70" title={`${message.read_count} نفر خوانده‌اند`} />
              : <Check className="h-3.5 w-3.5 opacity-70" />)}
        </div>
      </div>
    </div>
  </div>
);

const StyleRoomConversation = ({ roomId, currentUserId }) => {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const messagesViewportRef = useRef(null);
  const endRef = useRef(null);
  const initialScrollDoneRef = useRef(false);
  const previousScrollRef = useRef(null);
  const shouldScrollToBottomRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const query = useStyleRoomMessagesQuery(roomId, page);
  const sendMessage = useSendStyleRoomMessage(roomId);
  const markRead = useMarkStyleRoomMessagesRead(roomId);

  useStyleRoomRealtime({ roomId, currentUserId, setMessages });

  useEffect(() => {
    setPage(1);
    setMessages([]);
    initialScrollDoneRef.current = false;
    previousScrollRef.current = null;
  }, [roomId]);

  useEffect(() => {
    if (!query.data) return;
    setMessages((previous) => mergeMessages(page === 1 ? [] : previous, query.data.items));
  }, [query.data, page]);

  useLayoutEffect(() => {
    if (!messages.length) return;
    const viewport = messagesViewportRef.current;
    if (loadingMoreRef.current && previousScrollRef.current && viewport) {
      const { scrollHeight, scrollTop } = previousScrollRef.current;
      viewport.scrollTop = viewport.scrollHeight - scrollHeight + scrollTop;
      loadingMoreRef.current = false;
      previousScrollRef.current = null;
    } else if (!initialScrollDoneRef.current && page === 1) {
      endRef.current?.scrollIntoView({ behavior: 'auto' });
      initialScrollDoneRef.current = true;
    } else if (shouldScrollToBottomRef.current) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      shouldScrollToBottomRef.current = false;
    }
  }, [messages.length, page]);

  useEffect(() => {
    if (messages.length) {
      const unreadIds = messages.filter((message) => !message.is_read && message.sender?.id !== currentUserId).map((message) => message.id);
      if (unreadIds.length) markRead.mutate({ message_ids: unreadIds });
    }
  // Marking read is intentionally tied to loaded messages, not private chat state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, currentUserId]);

  const isSending = sendMessage.isPending;
  const hasMore = Boolean(query.data?.next);
  const loadOlderMessages = () => {
    if (!hasMore || query.isFetching) return;
    const viewport = messagesViewportRef.current;
    if (viewport) {
      previousScrollRef.current = { scrollHeight: viewport.scrollHeight, scrollTop: viewport.scrollTop };
    }
    loadingMoreRef.current = true;
    setPage((value) => value + 1);
  };
  const handleMessagesScroll = (event) => {
    if (event.currentTarget.scrollTop <= 48) loadOlderMessages();
  };
  const send = (payload) => {
    const nextPayload = { text: payload.text?.trim() || '', ...(payload.product_id ? { product_id: payload.product_id } : {}) };
    if (!nextPayload.text && !nextPayload.product_id) return;
    sendMessage.mutate(nextPayload, {
      onSuccess: (response) => {
        shouldScrollToBottomRef.current = true;
        setMessages((previous) => mergeMessages(previous, [response.data]));
        setText('');
        setPickerOpen(false);
      },
      onError: (error) => toast({ title: 'Unable to send', description: error?.response?.data?.detail || 'Please try again.', variant: 'destructive' }),
    });
  };

  const insertEmoji = (emoji) => setText((value) => `${value}${emoji}`);
  const empty = !query.isLoading && !query.isError && messages.length === 0;
  const groupedMessages = useMemo(() => messages, [messages]);

  return (
    <section dir="rtl" className="flex min-h-[calc(100vh-12rem)] flex-1 flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-xl shadow-black/5 lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:min-h-0">
      <div className="flex items-center gap-3 border-b border-border/50 bg-card/80 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/25 to-yellow-700/10 text-amber-600 dark:text-amber-400"><MessageCircle className="h-5 w-5" /></div>
        <div><h2 className="text-sm font-black text-foreground">گفت‌وگوی اتاق</h2><p className="text-[11px] text-muted-foreground">ایده‌ها، استایل‌ها و محصولات را با هم به اشتراک بگذارید</p></div>
      </div>
      <div ref={messagesViewportRef} onScroll={handleMessagesScroll} className="relative min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-6">
        {query.isLoading && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>}
        {query.isError && <div className="flex flex-col items-center justify-center gap-3 py-16 text-center"><p className="text-sm font-bold text-foreground">گفت‌وگو بارگذاری نشد.</p><button type="button" onClick={() => query.refetch()} className="inline-flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted"><RefreshCw className="h-3.5 w-3.5" />تلاش دوباره</button></div>}
        {empty && <div className="flex flex-col items-center justify-center py-20 text-center"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><MessageCircle className="h-7 w-7" /></div><p className="text-base font-black text-foreground">گفت‌وگوی اتاق را آغاز کنید</p><p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">برای دریافت نظر، پیام بفرستید یا محصولی را از بخش پایین به اشتراک بگذارید.</p></div>}
        {!query.isLoading && !query.isError && messages.length > 0 && (
          <>
            {hasMore && <div className="sticky top-0 z-10 mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-border/60 bg-card/90 px-3 py-1.5 text-[11px] font-bold text-muted-foreground shadow-sm backdrop-blur">{query.isFetching ? <Loader2 className="h-3 w-3 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}پیام‌های قدیمی‌تر با اسکرول به بالا بارگذاری می‌شوند</div>}
            <div className="space-y-4">{groupedMessages.map((message) => <RoomMessageBubble key={message.id} message={message} isMine={message.sender?.id === currentUserId} />)}</div>
            <div ref={endRef} />
          </>
        )}
      </div>
      <div className="relative border-t border-border/50 bg-card/90 p-3 backdrop-blur-xl sm:p-4">
        {showEmoji && <div className="absolute bottom-full left-4 mb-2 flex max-w-xs flex-wrap gap-1 rounded-2xl border border-border/60 bg-popover p-2 shadow-2xl">{EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => insertEmoji(emoji)} className="flex h-8 w-8 items-center justify-center rounded-xl text-lg hover:bg-muted">{emoji}</button>)}</div>}
        <form onSubmit={(event) => { event.preventDefault(); send({ text }); }} className="flex items-end gap-2">
          <button type="button" onClick={() => setShowEmoji((value) => !value)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 hover:text-foreground"><Smile className="h-5 w-5" /></button>
          <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send({ text }); } }} rows={1} maxLength={2000} placeholder="پیام خود را بنویسید..." className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-border/60 bg-secondary/50 px-4 py-2.5 text-sm text-foreground outline-none focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15" />
          <button type="button" onClick={() => setPickerOpen(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600" title="اشتراک‌گذاری محصول"><Gift className="h-5 w-5" /></button>
          <button type="submit" disabled={isSending || !text.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 text-black shadow-md shadow-amber-500/25 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"><Send className="h-4.5 w-4.5 -rotate-45" /></button>
        </form>
      </div>
      <StyleRoomProductPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(product, note) => send({ product_id: product.id, text: note })} busy={isSending} />
    </section>
  );
};

export default StyleRoomConversation;
