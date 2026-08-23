import { useEffect, useRef } from 'react';
import { chatAPI } from '../services/api';

export const useChatVisibilityRefresh = ({
  currentUserId, activeId, setConversations, refreshMessages, realtimeConnected = true,
}) => {
  const callbacksRef = useRef({ setConversations, refreshMessages });
  callbacksRef.current = { setConversations, refreshMessages };
  const lastRefreshRef = useRef(0);

  useEffect(() => {
    if (!currentUserId) return undefined;
    let cancelled = false;

    const refresh = async () => {
      if (document.hidden || !navigator.onLine) return;
      const now = Date.now();
      if (now - lastRefreshRef.current < 10000) return;
      lastRefreshRef.current = now;
      try {
        const conversationResponse = await chatAPI.getConversations();
        if (cancelled) return;
        const conversations = Array.isArray(conversationResponse.data)
          ? conversationResponse.data
          : (conversationResponse.data?.results || []);
        callbacksRef.current.setConversations(conversations);
        if (activeId && conversations.some((item) => item.id === Number(activeId))) {
          await callbacksRef.current.refreshMessages(activeId);
        }
      } catch {
        // Visibility refresh is best-effort; dedicated loaders surface errors.
      }
    };

    const onVisibility = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisibility);
    const onOnline = () => refresh();
    window.addEventListener('online', onOnline);
    const fallbackInterval = realtimeConnected ? null : window.setInterval(refresh, 15000);
    if (!realtimeConnected) refresh();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      if (fallbackInterval) window.clearInterval(fallbackInterval);
    };
  }, [activeId, currentUserId, realtimeConnected]);
};
