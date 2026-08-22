import { useEffect, useRef } from 'react';
import { chatAPI } from '../services/api';

const SEEN_DWELL_MS = 700;

const otherUnreadIds = (messages, currentUserId) => (
  (messages || [])
    .filter((message) => (
      typeof message.id === 'number'
      && message.sender_id !== currentUserId
      && message.sender?.id !== currentUserId
      && !message.is_read
    ))
    .map((message) => message.id)
);

/**
 * Delivered as soon as the client has the message. Seen only after the
 * bubble stays in view while the tab is visible and focused.
 */
export const useMessageViewportReceipts = ({
  conversationId,
  currentUserId,
  messages,
  enabled = true,
  rootRef,
}) => {
  const seenSent = useRef(new Set());
  const deliveredSent = useRef(new Set());
  const timers = useRef(new Map());
  const seenQueue = useRef(new Set());
  const seenQueueConversationId = useRef(null);
  const observedNodes = useRef(new WeakSet());
  const observerRef = useRef(null);

  useEffect(() => {
    seenSent.current = new Set();
    deliveredSent.current = new Set();
    seenQueue.current.clear();
    seenQueueConversationId.current = null;
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    observedNodes.current = new WeakSet();
  }, [conversationId]);

  useEffect(() => {
    if (!enabled || !conversationId || !currentUserId) return undefined;
    const ids = otherUnreadIds(messages, currentUserId).filter((id) => !deliveredSent.current.has(id));
    if (!ids.length) return undefined;
    ids.forEach((id) => deliveredSent.current.add(id));
    if (typeof chatAPI.markDelivered === 'function') {
      chatAPI.markDelivered(conversationId, { message_ids: ids }).catch(() => {
        ids.forEach((id) => deliveredSent.current.delete(id));
      });
    }
    return undefined;
  }, [conversationId, currentUserId, enabled, messages]);

  useEffect(() => {
    if (!enabled || !conversationId || !currentUserId || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const root = rootRef?.current || null;
    const flushQueuedSeen = () => {
      const queuedConversationId = seenQueueConversationId.current;
      const ids = [...seenQueue.current];
      seenQueue.current.clear();
      seenQueueConversationId.current = null;
      if (queuedConversationId !== conversationId || !ids.length) return;
      chatAPI.markRead(conversationId, { message_ids: ids }).catch(() => {
        ids.forEach((id) => seenSent.current.delete(id));
      });
    };
    const queueSeen = (id) => {
      seenQueue.current.add(id);
      seenQueueConversationId.current = conversationId;
      Promise.resolve().then(flushQueuedSeen);
    };

    const flushSeen = (id) => {
      if (seenSent.current.has(id)) return;
      if (document.hidden || (typeof document.hasFocus === 'function' && !document.hasFocus())) return;
      seenSent.current.add(id);
      queueSeen(id);
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = Number(entry.target.getAttribute('data-message-id'));
        if (!id || seenSent.current.has(id)) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          if (timers.current.has(id)) return;
          timers.current.set(id, setTimeout(() => {
            timers.current.delete(id);
            flushSeen(id);
          }, SEEN_DWELL_MS));
        } else {
          const timer = timers.current.get(id);
          if (timer) {
            clearTimeout(timer);
            timers.current.delete(id);
          }
        }
      });
    }, { root, threshold: 0.6 });

    observerRef.current = observer;

    const observeNew = () => {
      const nodes = (root || document).querySelectorAll('[data-message-receipt="1"]');
      nodes.forEach((node) => {
        if (!observedNodes.current.has(node)) {
          observedNodes.current.add(node);
          observer.observe(node);
        }
      });
    };

    observeNew();

    const activeTimers = timers.current;
    const handleVisibility = () => {
      if (document.hidden) {
        activeTimers.forEach((timer) => clearTimeout(timer));
        activeTimers.clear();
        return;
      }
      // Tab became visible — re-trigger intersection checks for currently
      // visible nodes. Elements that stayed intersecting while hidden never
      // get a new observer callback, so we unobserve + re-observe them.
      const nodes = (root || document).querySelectorAll('[data-message-receipt="1"]');
      nodes.forEach((node) => {
        const id = Number(node.getAttribute('data-message-id'));
        if (!id || seenSent.current.has(id) || activeTimers.has(id)) return;
        if (observedNodes.current.has(node)) {
          observer.unobserve(node);
          observer.observe(node);
        }
      });
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      observer.disconnect();
      observerRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, [conversationId, currentUserId, enabled, rootRef]);

  // Lightweight scan for new nodes after every messages change.
  // Does NOT recreate the observer — only discovers unobserved DOM nodes.
  useEffect(() => {
    if (!observerRef.current || !enabled || !conversationId || !currentUserId) return;
    const root = rootRef?.current || null;
    const nodes = (root || document).querySelectorAll('[data-message-receipt="1"]');
    nodes.forEach((node) => {
      if (!observedNodes.current.has(node)) {
        observedNodes.current.add(node);
        observerRef.current.observe(node);
      }
    });
  }, [messages, conversationId, currentUserId, enabled, rootRef]);
};
