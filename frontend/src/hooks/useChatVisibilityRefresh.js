import { useEffect } from 'react';
import { chatAPI } from '../services/api';

export const useChatVisibilityRefresh = ({
  currentUserId, activeId, setConversations, refreshMessages,
}) => {
  useEffect(() => {
    if (!currentUserId) return undefined;
    let cancelled = false;

    const refresh = async () => {
      if (document.hidden || !navigator.onLine) return;
      try {
        const conversationResponse = await chatAPI.getConversations();
        if (cancelled) return;
        const conversations = Array.isArray(conversationResponse.data)
          ? conversationResponse.data
          : (conversationResponse.data?.results || []);
        setConversations(conversations);
        if (activeId && conversations.some((item) => item.id === Number(activeId))) {
          await refreshMessages(activeId);
        }
      } catch {
        // Visibility refresh is best-effort; dedicated loaders surface errors.
      }
    };

    const onVisibility = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeId, currentUserId, setConversations, refreshMessages]);
};
