import { describe, expect, it } from 'vitest';
import { chatKeys, chatUnreadQueryOptions } from './chatQueries';

describe('chat unread polling', () => {
  it('disables query when not authenticated', () => {
    const options = chatUnreadQueryOptions({ userId: null, isAuthenticated: false });
    expect(options.enabled).toBe(false);
  });

  it('disables query when auth is loading', () => {
    const options = chatUnreadQueryOptions({ userId: 7, isAuthenticated: true, authLoading: true });
    expect(options.enabled).toBe(false);
  });

  it('enables query but disables polling when wsConnected is true', () => {
    const options = chatUnreadQueryOptions({ userId: 7, isAuthenticated: true, wsConnected: true });
    expect(options.queryKey).toEqual(chatKeys.unreadCount(7));
    expect(options.enabled).toBe(true);
    expect(options.refetchInterval).toBe(false);
    expect(options.refetchIntervalInBackground).toBe(false);
  });

  it('enables fallback polling when wsConnected is false', () => {
    const options = chatUnreadQueryOptions({ userId: 7, isAuthenticated: true, wsConnected: false });
    expect(options.enabled).toBe(true);
    expect(options.refetchInterval).toBeGreaterThanOrEqual(60_000);
    expect(options.refetchInterval).toBeLessThan(60_000 * 1.21);
  });
});
