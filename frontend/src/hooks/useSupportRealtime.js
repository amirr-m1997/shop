import { useEffect } from 'react';
import { supportConversationSocketPath, supportDepartmentSocketPath } from '../lib/realtimePaths';
import { mergeMessages } from '../lib/messages';
import { getRealtimeSocket, releaseRealtimeSocket } from '../services/realtime';

/**
 * Live support-chat integration.
 *
 * Incoming frames are merged into the thread. They never auto-mark seen.
 */
export const useSupportRealtime = ({
  currentUserId,
  activeId,
  setMessages,
  onQueueUpdated,
  onUnread,
  departments = [],
}) => {
  const departmentKey = (departments || []).join('|');

  useEffect(() => {
    if (!currentUserId || !activeId) return undefined;
    const path = supportConversationSocketPath(activeId);
    const socket = getRealtimeSocket(path);
    const listener = (message) => {
      switch (message.type) {
        case 'chat.message':
          setMessages?.((previous) => mergeMessages(previous, [message.message]));
          break;
        case 'read_receipt': {
          const markedIds = new Set((message.message_ids || []).map(Number));
          setMessages?.((previous) => previous.map((item) => {
            const senderId = item.sender?.id ?? item.sender_id;
            if (senderId !== currentUserId) return item;
            if (markedIds.size && !markedIds.has(Number(item.id))) return item;
            if (!markedIds.size && !message.mark_all) return item;
            return { ...item, is_read: true, status: 'seen' };
          }));
          break;
        }
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
    const rooms = departmentKey ? departmentKey.split('|') : [];
    if (!rooms.length) return undefined;
    const paths = rooms.map((department) => supportDepartmentSocketPath(department));
    const sockets = paths.map((path) => getRealtimeSocket(path));
    const listener = (message) => {
      if (message.type === 'queue.updated') {
        onQueueUpdated?.(message);
      } else if (message.type === 'support.unread' || message.type === 'support.updated') {
        onUnread?.(message);
      }
    };
    sockets.forEach((socket) => {
      socket.addListener(listener);
      socket.connect();
    });
    return () => {
      sockets.forEach((socket, index) => {
        socket.removeListener(listener);
        if (socket.listenerCount === 0) releaseRealtimeSocket(paths[index]);
      });
    };
  }, [currentUserId, onQueueUpdated, onUnread, departments]);
};
