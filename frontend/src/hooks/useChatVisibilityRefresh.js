import { useEffect } from 'react';
import { chatAPI } from '../services/api';

export const useChatVisibilityRefresh = ({
  currentUserId, activeId, setConversations, setMessages,
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
          const messageResponse = await chatAPI.getMessages(activeId);
          if (cancelled) return;
          const messages = messageResponse.data?.results
            ?? (Array.isArray(messageResponse.data) ? messageResponse.data : []);
          setMessages(messages);
          if (messages.some((message) => !message.is_read && message.sender_id !== currentUserId)) {
            await chatAPI.markRead(activeId);
          }
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
  }, [activeId, currentUserId, setConversations, setMessages]);
};
