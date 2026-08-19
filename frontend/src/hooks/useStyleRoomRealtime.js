import { useEffect } from 'react';
import { getRealtimeSocket, releaseRealtimeSocket } from '../services/realtime';
import { mergeMessages } from '../lib/messages';

const mapRoomMessage = (dto) => ({
  id: dto.id,
  sender: {
    id: dto.sender_id,
    username: dto.sender_username,
    display_name: dto.sender_name,
  },
  text: dto.text || '',
  product: dto.product,
  created_at: dto.created_at,
  is_read: false,
  read_count: 0,
  read_by_all: false,
});

/**
 * Live style-room integration for StyleRoomConversation. Receives room events
 * (messages, read receipts, reactions) and pushes read-marking over the
 * socket; REST remains the authoritative fallback.
 */
export const useStyleRoomRealtime = ({ roomId, currentUserId, setMessages, onTyping, onPresence }) => {
  useEffect(() => {
    if (!roomId || !currentUserId) return undefined;
    const path = `/style-rooms/${roomId}/`;
    const socket = getRealtimeSocket(path);
    const listener = (message) => {
      switch (message.type) {
        case 'chat.message': {
          if (!message.message) break;
          setMessages?.((previous) => mergeMessages(previous, [mapRoomMessage(message.message)]));
          if (message.message.sender_id !== currentUserId) {
            socket.send({ type: 'read.mark' });
          }
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
