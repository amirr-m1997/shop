import { useEffect } from 'react';
import { getRealtimeSocket, releaseRealtimeSocket } from '../services/realtime';
import { mergeMessages } from '../lib/messages';

/**
 * Live support-chat integration for SupportChatPage / SupportInboxPage.
 *
 * - Conversation socket per active support conversation (receives messages +
 *   read receipts, pushes read-marking).
 * - Queue socket for staff (receives lightweight queue.updated events and
 *   lets the page refetch the authoritative queue via REST).
 */
export const useSupportRealtime = ({
  currentUserId,
  activeId,
  setMessages,
  onQueueUpdated,
  onUnread,
}) => {
  useEffect(() => {
    if (!currentUserId || !activeId) return undefined;
    const path = `/support/conversations/${activeId}/`;
    const socket = getRealtimeSocket(path);
    const listener = (message) => {
      switch (message.type) {
        case 'chat.message':
          setMessages?.((previous) => mergeMessages(previous, [message.message]));
          if (message.message?.sender?.id !== currentUserId) {
            socket.send({ type: 'read.mark' });
          }
          break;
        case 'read_receipt':
          setMessages?.((previous) => previous.map((item) => (
            item.sender?.id === message.user_id ? { ...item, is_read: true } : item
          )));
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
  }, [currentUserId, activeId, setMessages]);

  useEffect(() => {
    if (!currentUserId || (!onQueueUpdated && !onUnread)) return undefined;
    const path = '/support/departments/all/';
    const socket = getRealtimeSocket(path);
    const listener = (message) => {
      if (message.type === 'queue.updated') {
        onQueueUpdated?.(message);
      } else if (message.type === 'support.unread') {
        onUnread?.(message);
      } else if (message.type === 'support.updated') {
        onUnread?.(message);
      }
    };
    socket.addListener(listener);
    socket.connect();
    return () => {
      socket.removeListener(listener);
      if (socket.listenerCount === 0) releaseRealtimeSocket(path);
    };
  }, [currentUserId, onQueueUpdated, onUnread]);
};
