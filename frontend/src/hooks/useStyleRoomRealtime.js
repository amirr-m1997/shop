import { useEffect } from 'react';
import { styleRoomSocketPath } from '../lib/realtimePaths';
import { mergeMessages } from '../lib/messages';
import { getRealtimeSocket, releaseRealtimeSocket } from '../services/realtime';

const mapRoomMessage = (dto) => ({
  id: dto.id,
  sender: {
    id: dto.sender_id ?? dto.sender?.id,
    username: dto.sender_username ?? dto.sender?.username,
    display_name: dto.sender_name ?? dto.sender?.display_name,
  },
  text: dto.text || '',
  product: dto.product,
  created_at: dto.created_at,
  is_read: Boolean(dto.is_read),
  read_count: dto.read_count || 0,
  read_by_all: Boolean(dto.read_by_all),
});

/**
 * Live style-room integration. Receiving a frame is not a read.
 */
export const useStyleRoomRealtime = ({ roomId, currentUserId, setMessages, onTyping, onPresence }) => {
  useEffect(() => {
    if (!roomId || !currentUserId) return undefined;
    const path = styleRoomSocketPath(roomId);
    const socket = getRealtimeSocket(path);
    const listener = (message) => {
      switch (message.type) {
        case 'chat.message': {
          if (!message.message) break;
          setMessages?.((previous) => mergeMessages(previous, [mapRoomMessage(message.message)]));
          break;
        }
        case 'read': {
          const ids = new Set(message.message_ids || []);
          if (!ids.size) break;
          const memberCount = message.member_count || 1;
          setMessages?.((previous) => previous.map((item) => (
            ids.has(item.id)
              ? item.sender?.id === currentUserId
                ? { ...item, read_count: Math.max(1, memberCount - 1), read_by_all: true }
                : { ...item, is_read: true }
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
  }, [roomId, currentUserId, setMessages, onTyping, onPresence]);
};
