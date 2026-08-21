import { useEffect } from 'react';
import { chatPrivateSocketPath, chatUserSocketPath } from '../lib/realtimePaths';
import { mergeMessages } from '../lib/messages';
import { chatAPI } from '../services/api';
import { getRealtimeSocket, releaseRealtimeSocket } from '../services/realtime';

/**
 * Live private-chat integration.
 *
 * Writes stay on REST. This hook only receives events. It never marks
 * messages seen — opening a socket or receiving a frame is not a read.
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
  onSocketStatus,
}) => {
  useEffect(() => {
    if (!currentUserId) return undefined;
    const path = chatUserSocketPath(currentUserId);
    const socket = getRealtimeSocket(path);
    const offStatus = onSocketStatus ? socket.onStatus(onSocketStatus) : null;
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
        case 'conversation.changed':
          chatAPI.getConversation(message.conversation_id)
            .then((response) => {
              const fresh = response.data;
              if (!fresh?.id) return;
              setConversations?.((previous) => {
                const withoutFresh = previous.filter((item) => item.id !== fresh.id);
                return [fresh, ...withoutFresh].sort((first, second) => (
                  new Date(second.updated_at || 0) - new Date(first.updated_at || 0)
                ));
              });
            })
            // A cancelled conversation can disappear between the event and fetch.
            .catch(() => {});
          break;
        case 'conversation.removed':
          setConversations?.((previous) => previous.filter(
            (conversation) => conversation.id !== Number(message.conversation_id)
          ));
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
      offStatus?.();
      socket.removeListener(listener);
      if (socket.listenerCount === 0) releaseRealtimeSocket(path);
    };
  }, [currentUserId, setConversations, onNotification, onSupportUnread, onSupportUpdated, onSocketStatus]);

  useEffect(() => {
    if (!currentUserId || !activeId) return undefined;
    const path = chatPrivateSocketPath(activeId);
    const socket = getRealtimeSocket(path);
    const listener = (message) => {
      switch (message.type) {
        case 'chat.message':
          setMessages?.((previous) => mergeMessages(previous, [message.message]));
          break;
        case 'delivery_receipt': {
          const markedIds = new Set((message.message_ids || []).map(Number));
          setMessages?.((previous) => previous.map((item) => (
            item.sender_id === currentUserId && markedIds.has(Number(item.id)) && item.status !== 'seen'
              ? { ...item, status: 'delivered' }
              : item
          )));
          break;
        }
        case 'read_receipt': {
          const markedIds = new Set((message.message_ids || []).map(Number));
          const upTo = message.up_to_message_id;
          setMessages?.((previous) => previous.map((item) => {
            const isMine = item.sender_id === currentUserId;
            if (!isMine) return item;
            const itemId = Number(item.id);
            const matched = markedIds.size
              ? markedIds.has(itemId)
              : (upTo != null && itemId <= Number(upTo));
            return matched ? { ...item, is_read: true, status: 'seen' } : item;
          }));
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
        case 'message.deleted': {
          const deletedId = Number(message.message_id);
          if (message.for_everyone) {
            setMessages?.((previous) => previous.map((item) => (
              Number(item.id) === deletedId
                ? { ...item, deleted_for_everyone: true, text: '', product: null }
                : item
            )));
          } else if (message.user_id === currentUserId) {
            setMessages?.((previous) => previous.filter((item) => Number(item.id) !== deletedId));
          }
          break;
        }
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
