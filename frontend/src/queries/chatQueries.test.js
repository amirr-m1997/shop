import { describe, expect, it } from 'vitest';
import { chatKeys, chatUnreadQueryOptions } from './chatQueries';

describe('chat unread polling', () => {
  it.each([
    [{ userId: null, isAuthenticated: false }, 'anonymous'],
    [{ userId: 7, isAuthenticated: false }, 'stale user'],
    [{ userId: 7, isAuthenticated: true, authLoading: true }, 'auth loading'],
    [{ userId: 7, isAuthenticated: true, pollingAvailable: false }, 'hidden or offline'],
  ])('disables polling for %s', (input) => {
    const options = chatUnreadQueryOptions(input);
    expect(options.enabled).toBe(false);
    expect(options.refetchInterval).toBe(false);
  });

  it('enables a user-scoped 15 second poll only for an authenticated available user', () => {
    const options = chatUnreadQueryOptions({ userId: 7, isAuthenticated: true });
    expect(options.queryKey).toEqual(chatKeys.unreadCount(7));
    expect(options.enabled).toBe(true);
    expect(options.refetchInterval).toBe(15_000);
    expect(options.refetchIntervalInBackground).toBe(false);
  });
});
