import { useEffect } from 'react';
import { getRealtimeSocket, releaseRealtimeSocket } from '../services/realtime';
import { mergeMessages } from '../lib/messages';

/**
 * Live private-chat integration for ChatPage.
 *
 * Opens the personal inbox channel (per-user) and a private socket per active
 * conversation. Writes stay on REST (authoritative); this hook only receives
 * realtime events and pushes lightweight read-marking over the socket.
 */
export const useChatRealtime = ({
  currentUserId,
  activeId,
  setMessages,
  setConversations,
  onNotification,
  onSupportUnread,
  onSupportUpdated,
  onTyping,
  onPresence,
}) => {
  useEffect(() => {
    if (!currentUserId) return undefined;
    const path = `/chat/user/${currentUserId}`;
    const socket = getRealtimeSocket(path);
    const listener = (message) => {
      switch (message.type) {
        case 'conversation.updated':
        case 'unread':
          if (!message.conversation) break;
          setConversations?.((previous) => previous.map((conversation) => (
            conversation.id === message.conversation.id
              ? { ...conversation, ...message.conversation }
              : conversation
          )));
          break;
        case 'notification':
          onNotification?.(message.notification);
          break;
        case 'support.unread':
          onSupportUnread?.(message);
          break;
        case 'support.updated':
          onSupportUpdated?.(message);
          break;
        default:
          break;
      }
    };
    socket.addListener(listener);
    socket.connect();
    return () => {
      socket.removeListener(listener);
      if (socket.listenerCount === 0) releaseRealtimeSocket(path);
    };
  }, [currentUserId, setConversations, onNotification, onSupportUnread, onSupportUpdated]);

  useEffect(() => {
    if (!currentUserId || !activeId) return undefined;
    const path = `/chat/private/${activeId}`;
    const socket = getRealtimeSocket(path);
    const listener = (message) => {
      switch (message.type) {
        case 'chat.message':
          setMessages?.((previous) => mergeMessages(previous, [message.message]));
          if (message.message?.sender_id !== currentUserId) {
            socket.send({ type: 'read.mark' });
          }
          break;
        case 'read_receipt': {
          const upTo = message.up_to_message_id;
          if (upTo == null) break;
          setMessages?.((previous) => previous.map((item) => (
            item.sender_id === message.user_id && Number(item.id) <= Number(upTo)
              ? { ...item, is_read: true }
              : item
          )));
          break;
        }
        case 'message.updated':
          setMessages?.((previous) => previous.map((item) => (
            item.id === message.message_id
              ? {
                  ...item,
                  reaction: message.reaction ?? item.reaction,
                  is_favorite: message.is_favorite ?? item.is_favorite,
                }
              : item
          )));
          break;
        case 'typing':
          onTyping?.(message);
          break;
        case 'presence':
          onPresence?.(message);
          break;
        default:
          break;
      }
    };
    socket.addListener(listener);
    socket.connect();
    return () => {
      socket.removeListener(listener);
      if (socket.listenerCount === 0) releaseRealtimeSocket(path);
    };
  }, [currentUserId, activeId, setMessages, onTyping, onPresence]);
};
