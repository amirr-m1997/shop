// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useChatRealtime } from './useChatRealtime';

const { mocks, MockSocket } = vi.hoisted(() => {
  class MockSocket {
    constructor(path) {
      this.path = path;
      this.listeners = new Set();
      this.sent = [];
      this.connected = false;
      this.closed = false;
    }

    addListener(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }

    removeListener(fn) {
      this.listeners.delete(fn);
    }

    get listenerCount() {
      return this.listeners.size;
    }

    connect() {
      this.connected = true;
    }

    send(obj) {
      this.sent.push(obj);
      return true;
    }

    close() {
      this.closed = true;
    }

    dispatch(message) {
      this.listeners.forEach((fn) => fn(message));
    }
  }

  return {
    mocks: {
      getRealtimeSocket: vi.fn(),
      releaseRealtimeSocket: vi.fn(),
    },
    MockSocket,
  };
});

vi.mock('../services/realtime', () => ({
  getRealtimeSocket: mocks.getRealtimeSocket,
  releaseRealtimeSocket: mocks.releaseRealtimeSocket,
}));

const callbacks = {
  setConversations: vi.fn(),
  setMessages: vi.fn(),
  onNotification: vi.fn(),
  onSupportUnread: vi.fn(),
  onSupportUpdated: vi.fn(),
  onTyping: vi.fn(),
  onPresence: vi.fn(),
};

const Harness = ({ userId = 9, activeId = null }) => {
  useChatRealtime({ currentUserId: userId, activeId, ...callbacks });
  return null;
};

const applyUpdater = (fn, previous) => (typeof fn === 'function' ? fn(previous) : fn);

beforeEach(() => {
  mocks.getRealtimeSocket.mockImplementation((path) => new MockSocket(path));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useChatRealtime', () => {
  it('opens the per-user inbox socket and listens for conversation.updated', () => {
    render(<Harness activeId={7} />);
    const [userSocket, privateSocket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    expect(mocks.getRealtimeSocket).toHaveBeenCalledWith('/ws/chat/user/9/');
    expect(mocks.getRealtimeSocket).toHaveBeenCalledWith('/ws/chat/private/7/');
    expect(userSocket.connected).toBe(true);
    expect(privateSocket.connected).toBe(true);

    act(() => userSocket.dispatch({ type: 'conversation.updated', conversation: { id: 7, status: 'closed' } }));
    const updater = callbacks.setConversations.mock.calls[0][0];
    expect(applyUpdater(updater, [{ id: 7, status: 'open' }, { id: 8, status: 'open' }])).toEqual([
      { id: 7, status: 'closed' },
      { id: 8, status: 'open' },
    ]);
  });

  it('treats unread events as conversation updates', () => {
    render(<Harness activeId={7} />);
    const [userSocket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() => userSocket.dispatch({ type: 'unread', conversation: { id: 7, unread_count: 3 } }));
    const updater = callbacks.setConversations.mock.calls[0][0];
    expect(applyUpdater(updater, [{ id: 7, unread_count: 0 }])).toEqual([{ id: 7, unread_count: 3 }]);
  });

  it('forwards notification, support.unread and support.updated events', () => {
    render(<Harness activeId={7} />);
    const [userSocket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() => userSocket.dispatch({ type: 'notification', notification: { id: 1 } }));
    act(() => userSocket.dispatch({ type: 'support.unread', conversation_id: 5 }));
    act(() => userSocket.dispatch({ type: 'support.updated', conversation_id: 5 }));
    expect(callbacks.onNotification).toHaveBeenCalledWith({ id: 1 });
    expect(callbacks.onSupportUnread).toHaveBeenCalledWith({ type: 'support.unread', conversation_id: 5 });
    expect(callbacks.onSupportUpdated).toHaveBeenCalledWith({ type: 'support.updated', conversation_id: 5 });
  });

  it('merges incoming chat messages without marking them seen', () => {
    render(<Harness userId={9} activeId={7} />);
    const [, privateSocket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() =>
      privateSocket.dispatch({
        type: 'chat.message',
        message: { id: 11, sender_id: 3, text: 'hi', created_at: '2026-08-19T08:00:00Z' },
      }),
    );
    const updater = callbacks.setMessages.mock.calls[0][0];
    expect(applyUpdater(updater, [])).toEqual([
      { id: 11, sender_id: 3, text: 'hi', created_at: '2026-08-19T08:00:00Z' },
    ]);
    expect(privateSocket.sent).toEqual([]);
  });

  it('does not send read.mark for the current user own message', () => {
    render(<Harness userId={9} activeId={7} />);
    const [, privateSocket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() =>
      privateSocket.dispatch({
        type: 'chat.message',
        message: { id: 12, sender_id: 9, text: 'mine', created_at: '2026-08-19T08:01:00Z' },
      }),
    );
    expect(callbacks.setMessages).toHaveBeenCalled();
    expect(privateSocket.sent).toEqual([]);
  });

  it('deduplicates messages that already exist locally', () => {
    render(<Harness userId={9} activeId={7} />);
    const [, privateSocket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() =>
      privateSocket.dispatch({
        type: 'chat.message',
        message: { id: 11, sender_id: 3, text: 'newer', created_at: '2026-08-19T08:00:00Z' },
      }),
    );
    const updater = callbacks.setMessages.mock.calls[0][0];
    expect(
      applyUpdater(updater, [{ id: 11, sender_id: 3, text: 'older', created_at: '2026-08-19T08:00:00Z' }]),
    ).toHaveLength(1);
  });

  it('marks the current user outgoing messages as seen from a receipt', () => {
    render(<Harness userId={9} activeId={7} />);
    const [, privateSocket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() => privateSocket.dispatch({ type: 'read_receipt', user_id: 3, message_ids: [10], up_to_message_id: 10 }));
    const updater = callbacks.setMessages.mock.calls[0][0];
    expect(
      applyUpdater(updater, [
        { id: 10, sender_id: 9, is_read: false },
        { id: 21, sender_id: 9, is_read: false },
        { id: 15, sender_id: 3, is_read: false },
      ]),
    ).toEqual([
      { id: 10, sender_id: 9, is_read: true, status: 'seen' },
      { id: 21, sender_id: 9, is_read: false },
      { id: 15, sender_id: 3, is_read: false },
    ]);
  });

  it('tombstones a message deleted for everyone and removes one deleted for me', () => {
    render(<Harness userId={9} activeId={7} />);
    const [, privateSocket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() => privateSocket.dispatch({ type: 'message.deleted', message_id: 11, for_everyone: true, user_id: 3 }));
    const tombstone = callbacks.setMessages.mock.calls[0][0];
    expect(applyUpdater(tombstone, [{ id: 11, text: 'hi', product: { id: 1 } }])).toEqual([
      { id: 11, text: '', product: null, deleted_for_everyone: true },
    ]);
    act(() => privateSocket.dispatch({ type: 'message.deleted', message_id: 12, for_everyone: false, user_id: 9 }));
    const removed = callbacks.setMessages.mock.calls[1][0];
    expect(applyUpdater(removed, [{ id: 12, text: 'mine' }, { id: 13, text: 'keep' }])).toEqual([
      { id: 13, text: 'keep' },
    ]);
  });

  it('applies message.updated reaction and favorite patches', () => {
    render(<Harness userId={9} activeId={7} />);
    const [, privateSocket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() =>
      privateSocket.dispatch({ type: 'message.updated', message_id: 11, reaction: '❤️', is_favorite: true }),
    );
    const updater = callbacks.setMessages.mock.calls[0][0];
    expect(
      applyUpdater(updater, [{ id: 11, reaction: null, is_favorite: false }]),
    ).toEqual([{ id: 11, reaction: '❤️', is_favorite: true }]);
  });

  it('forwards typing and presence events from the private socket', () => {
    render(<Harness userId={9} activeId={7} />);
    const [, privateSocket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() => privateSocket.dispatch({ type: 'typing', user_id: 3 }));
    act(() => privateSocket.dispatch({ type: 'presence', user_id: 3, online: true }));
    expect(callbacks.onTyping).toHaveBeenCalledWith({ type: 'typing', user_id: 3 });
    expect(callbacks.onPresence).toHaveBeenCalledWith({ type: 'presence', user_id: 3, online: true });
  });

  it('ignores unknown event types', () => {
    render(<Harness userId={9} activeId={7} />);
    const [userSocket, privateSocket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() => userSocket.dispatch({ type: 'unknown' }));
    act(() => privateSocket.dispatch({ type: 'unknown' }));
    expect(callbacks.setConversations).not.toHaveBeenCalled();
    expect(callbacks.setMessages).not.toHaveBeenCalled();
  });

  it('does nothing without a current user', () => {
    render(<Harness userId={null} activeId={7} />);
    expect(mocks.getRealtimeSocket).not.toHaveBeenCalled();
  });

  it('releases both sockets on unmount when the last listener is removed', () => {
    const { unmount } = render(<Harness userId={9} activeId={7} />);
    act(() => unmount());
    expect(mocks.releaseRealtimeSocket).toHaveBeenCalledWith('/ws/chat/user/9/');
    expect(mocks.releaseRealtimeSocket).toHaveBeenCalledWith('/ws/chat/private/7/');
  });
});