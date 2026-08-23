import { useEffect, useRef } from 'react';
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
  const callbacksRef = useRef({});
  callbacksRef.current = {
    onNotification, onSupportUnread, onSupportUpdated, onTyping, onPresence, onSocketStatus,
    setMessages, setConversations,
  };

  useEffect(() => {
    if (!currentUserId) return undefined;
    const path = chatUserSocketPath(currentUserId);
    const socket = getRealtimeSocket(path);
    const offStatus = callbacksRef.current.onSocketStatus ? socket.onStatus(callbacksRef.current.onSocketStatus) : null;
    const listener = (message) => {
      const cbs = callbacksRef.current;
      switch (message.type) {
        case 'conversation.updated':
        case 'unread':
          if (!message.conversation) break;
          cbs.setConversations?.((previous) => previous.map((conversation) => (
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
              cbs.setConversations?.((previous) => {
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
          cbs.setConversations?.((previous) => previous.filter(
            (conversation) => conversation.id !== Number(message.conversation_id)
          ));
          break;
        case 'notification':
          cbs.onNotification?.(message.notification);
          break;
        case 'support.unread':
          cbs.onSupportUnread?.(message);
          break;
        case 'message.deleted': {
          // delete-for-me is now only sent to the deleter's user channel (all their devices)
          const deletedId = Number(message.message_id);
          if (!message.for_everyone && message.user_id === currentUserId) {
            cbs.setMessages?.((previous) => previous.filter((item) => Number(item.id) !== deletedId));
          }
          break;
        }
        case 'support.updated':
          cbs.onSupportUpdated?.(message);
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
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId || !activeId) return undefined;
    const path = chatPrivateSocketPath(activeId);
    const socket = getRealtimeSocket(path);
    const listener = (message) => {
      const cbs = callbacksRef.current;
      switch (message.type) {
        case 'chat.message':
          cbs.setMessages?.((previous) => mergeMessages(previous, [message.message]));
          break;
        case 'delivery_receipt': {
          const markedIds = new Set((message.message_ids || []).map(Number));
          cbs.setMessages?.((previous) => previous.map((item) => (
            item.sender_id === currentUserId && markedIds.has(Number(item.id)) && item.status !== 'seen'
              ? { ...item, status: 'delivered' }
              : item
          )));
          break;
        }
        case 'read_receipt': {
          const markedIds = new Set((message.message_ids || []).map(Number));
          const upTo = message.up_to_message_id;
          cbs.setMessages?.((previous) => previous.map((item) => {
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
        case 'message.updated': {
          const isOwnFavorite = message.user_id == null || message.user_id === currentUserId;
          cbs.setMessages?.((previous) => previous.map((item) => {
            if (item.id !== message.message_id) return item;
            const next = { ...item };
            if (message.reaction !== undefined) {
              // Per-user: only update own reaction if this event is for current user
              if (message.user_id == null || message.user_id === currentUserId) {
                next.reaction = message.reaction;
                next.my_reaction = message.reaction;
              }
            }
            if (message.reactions !== undefined) {
              next.reactions = message.reactions;
            }
            if (message.is_favorite !== undefined && isOwnFavorite) {
              next.is_favorite = message.is_favorite;
            }
            if (message.favorites_count !== undefined) {
              next.favorites_count = message.favorites_count;
            }
            return next;
          }));
          break;
        }
        case 'message.deleted': {
          const deletedId = Number(message.message_id);
          if (message.for_everyone) {
            cbs.setMessages?.((previous) => previous.map((item) => (
              Number(item.id) === deletedId
                ? { ...item, deleted_for_everyone: true, text: '', product: null }
                : item
            )));
          } else if (message.user_id === currentUserId) {
            cbs.setMessages?.((previous) => previous.filter((item) => Number(item.id) !== deletedId));
          }
          break;
        }
        case 'typing':
          cbs.onTyping?.(message);
          break;
        case 'presence':
          cbs.onPresence?.(message);
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
  }, [currentUserId, activeId]);
};
