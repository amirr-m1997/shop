// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useSupportRealtime } from './useSupportRealtime';

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
  setMessages: vi.fn(),
  onQueueUpdated: vi.fn(),
  onUnread: vi.fn(),
};

const Harness = ({ userId = 9, activeId = null }) => {
  useSupportRealtime({
    currentUserId: userId,
    activeId,
    setMessages: callbacks.setMessages,
    onQueueUpdated: callbacks.onQueueUpdated,
    onUnread: callbacks.onUnread,
  });
  return null;
};

const NoQueueHarness = () => {
  useSupportRealtime({
    currentUserId: 9,
    activeId: 5,
    setMessages: callbacks.setMessages,
    onQueueUpdated: undefined,
    onUnread: undefined,
  });
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

describe('useSupportRealtime', () => {
  it('opens the conversation socket and the queue socket', () => {
    render(<Harness userId={9} activeId={5} />);
    expect(mocks.getRealtimeSocket).toHaveBeenCalledWith('/support/conversations/5/');
    expect(mocks.getRealtimeSocket).toHaveBeenCalledWith('/support/departments/all/');
    const sockets = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    expect(sockets.every((socket) => socket.connected)).toBe(true);
  });

  it('merges incoming support messages and sends read.mark for others', () => {
    render(<Harness userId={9} activeId={5} />);
    const [socket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() =>
      socket.dispatch({
        type: 'chat.message',
        message: { id: 31, sender: { id: 3 }, text: 'how can I help?', created_at: '2026-08-19T08:00:00Z' },
      }),
    );
    const updater = callbacks.setMessages.mock.calls[0][0];
    expect(applyUpdater(updater, [])).toEqual([
      { id: 31, sender: { id: 3 }, text: 'how can I help?', created_at: '2026-08-19T08:00:00Z' },
    ]);
    expect(socket.sent).toEqual([{ type: 'read.mark' }]);
  });

  it('does not send read.mark for the current user own message', () => {
    render(<Harness userId={9} activeId={5} />);
    const [socket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() =>
      socket.dispatch({
        type: 'chat.message',
        message: { id: 32, sender: { id: 9 }, text: 'thanks', created_at: '2026-08-19T08:01:00Z' },
      }),
    );
    expect(socket.sent).toEqual([]);
  });

  it('marks messages read when the read receipt matches the sender', () => {
    render(<Harness userId={9} activeId={5} />);
    const [socket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() => socket.dispatch({ type: 'read_receipt', user_id: 3 }));
    const updater = callbacks.setMessages.mock.calls[0][0];
    expect(
      applyUpdater(updater, [
        { id: 31, sender: { id: 3 }, is_read: false },
        { id: 32, sender: { id: 9 }, is_read: false },
      ]),
    ).toEqual([
      { id: 31, sender: { id: 3 }, is_read: true },
      { id: 32, sender: { id: 9 }, is_read: false },
    ]);
  });

  it('forwards queue.updated events from the queue socket', () => {
    render(<Harness userId={9} activeId={5} />);
    const [, queueSocket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() => queueSocket.dispatch({ type: 'queue.updated', department_id: 1 }));
    expect(callbacks.onQueueUpdated).toHaveBeenCalledWith({ type: 'queue.updated', department_id: 1 });
  });

  it('forwards support.unread and support.updated to onUnread', () => {
    render(<Harness userId={9} activeId={5} />);
    const [, queueSocket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() => queueSocket.dispatch({ type: 'support.unread', conversation_id: 5 }));
    act(() => queueSocket.dispatch({ type: 'support.updated', conversation_id: 5 }));
    expect(callbacks.onUnread).toHaveBeenCalledTimes(2);
    expect(callbacks.onUnread).toHaveBeenCalledWith({ type: 'support.unread', conversation_id: 5 });
    expect(callbacks.onUnread).toHaveBeenCalledWith({ type: 'support.updated', conversation_id: 5 });
  });

  it('opens no queue socket when no queue callbacks are provided', () => {
    render(<NoQueueHarness />);
    expect(mocks.getRealtimeSocket).toHaveBeenCalledWith('/support/conversations/5/');
    expect(mocks.getRealtimeSocket).not.toHaveBeenCalledWith('/support/departments/all/');
  });

  it('does nothing without a current user', () => {
    render(<Harness userId={null} activeId={5} />);
    expect(mocks.getRealtimeSocket).not.toHaveBeenCalled();
  });

  it('releases both sockets on unmount', () => {
    const { unmount } = render(<Harness userId={9} activeId={5} />);
    act(() => unmount());
    expect(mocks.releaseRealtimeSocket).toHaveBeenCalledWith('/support/conversations/5/');
    expect(mocks.releaseRealtimeSocket).toHaveBeenCalledWith('/support/departments/all/');
  });
});