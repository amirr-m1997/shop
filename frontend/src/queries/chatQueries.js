import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatAPI } from '../services/api';

const UNREAD_POLL_INTERVAL = 15_000;

export const chatKeys = {
  all: ['chat'],
  unreadCount: (userId) => [...chatKeys.all, 'unread-count', userId],
};

export const chatUnreadQueryOptions = ({
  userId,
  isAuthenticated,
  authLoading = false,
  pollingAvailable = true,
}) => {
  const pollingEnabled = Boolean(userId) && isAuthenticated && !authLoading && pollingAvailable;
  return {
    queryKey: chatKeys.unreadCount(userId),
    queryFn: ({ signal }) => chatAPI.getUnreadCount({ signal }).then((response) => (
      response.data?.count || 0
    )),
    enabled: pollingEnabled,
    staleTime: 10_000,
    refetchInterval: pollingEnabled ? UNREAD_POLL_INTERVAL : false,
    refetchIntervalInBackground: false,
  };
};

const canPollNow = () => (
  typeof document !== 'undefined'
  && !document.hidden
  && typeof navigator !== 'undefined'
  && navigator.onLine
);

const usePollingAvailability = () => {
  const [available, setAvailable] = useState(canPollNow);

  useEffect(() => {
    const updateAvailability = () => setAvailable(canPollNow());
    document.addEventListener('visibilitychange', updateAvailability);
    window.addEventListener('online', updateAvailability);
    window.addEventListener('offline', updateAvailability);
    return () => {
      document.removeEventListener('visibilitychange', updateAvailability);
      window.removeEventListener('online', updateAvailability);
      window.removeEventListener('offline', updateAvailability);
    };
  }, []);

  return available;
};

export const useChatUnreadCount = (userId, isAuthenticated, authLoading = false) => {
  const pollingAvailable = usePollingAvailability();
  return useQuery(chatUnreadQueryOptions({
    userId,
    isAuthenticated,
    authLoading,
    pollingAvailable,
  }));
};
