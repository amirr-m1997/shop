import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatAPI } from '../services/api';

const FALLBACK_POLL_INTERVAL = 60_000;
const RECONCILE_COOLDOWN = 10_000;

export const fallbackPollInterval = (wsConnected, attempt = 0) => {
  if (wsConnected) return false;
  const exp = Math.min(FALLBACK_POLL_INTERVAL * (2 ** Math.max(0, attempt)), 5 * 60_000);
  const jitter = Math.floor(exp * 0.2 * Math.random());
  return exp + jitter;
};

export const chatKeys = {
  all: ['chat'],
  unreadCount: (userId) => [...chatKeys.all, 'unread-count', userId],
};

export const chatUnreadQueryOptions = ({
  userId,
  isAuthenticated,
  authLoading = false,
  wsConnected = true,
}) => {
  const enabled = Boolean(userId) && isAuthenticated && !authLoading;
  return {
    queryKey: chatKeys.unreadCount(userId),
    queryFn: ({ signal }) => chatAPI.getUnreadCount({ signal }).then((response) => (
      response.data?.count || 0
    )),
    enabled,
    staleTime: 10_000,
    refetchInterval: enabled ? fallbackPollInterval(wsConnected) : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  };
};

const usePollingAvailability = () => {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return online;
};

export const useChatUnreadCount = (userId, isAuthenticated, authLoading = false) => {
  const online = usePollingAvailability();
  const query = useQuery(chatUnreadQueryOptions({
    userId,
    isAuthenticated,
    authLoading,
    wsConnected: online,
  }));

  const lastReconcileRef = useRef(0);

  useEffect(() => {
    if (!userId || !isAuthenticated) return;
    const handleVisibility = () => {
      if (document.hidden) return;
      const now = Date.now();
      if (now - lastReconcileRef.current < RECONCILE_COOLDOWN) return;
      lastReconcileRef.current = now;
      query.refetch();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [userId, isAuthenticated, query]);

  return query;
};
