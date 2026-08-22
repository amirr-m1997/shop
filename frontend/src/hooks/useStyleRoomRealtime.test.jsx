// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useStyleRoomRealtime } from './useStyleRoomRealtime';

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
  onTyping: vi.fn(),
  onPresence: vi.fn(),
};

const Harness = ({ userId = 9, roomId = null }) => {
  useStyleRoomRealtime({ currentUserId: userId, roomId, ...callbacks });
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

describe('useStyleRoomRealtime', () => {
  it('opens the room socket and connects', () => {
    render(<Harness userId={9} roomId={77} />);
    expect(mocks.getRealtimeSocket).toHaveBeenCalledWith('/ws/style-rooms/77/');
    const [socket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    expect(socket.connected).toBe(true);
  });

  it('maps room message DTOs and merges them into the list', () => {
    render(<Harness userId={9} roomId={77} />);
    const [socket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() =>
      socket.dispatch({
        type: 'chat.message',
        message: {
          id: 22,
          sender_id: 3,
          sender_username: 'alice',
          sender_name: 'Alice',
          text: 'look at this',
          product: { id: 5 },
          created_at: '2026-08-19T08:00:00Z',
        },
      }),
    );
    const updater = callbacks.setMessages.mock.calls[0][0];
    expect(applyUpdater(updater, [])).toEqual([
      {
        id: 22,
        sender: { id: 3, username: 'alice', display_name: 'Alice' },
        text: 'look at this',
        product: { id: 5 },
        created_at: '2026-08-19T08:00:00Z',
        is_read: false,
        read_count: 0,
        read_by_all: false,
      },
    ]);
  });

  it('does not send read.mark when a room message arrives', () => {
    render(<Harness userId={9} roomId={77} />);
    const [socket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() =>
      socket.dispatch({
        type: 'chat.message',
        message: { id: 22, sender_id: 3, created_at: '2026-08-19T08:00:00Z' },
      }),
    );
    expect(socket.sent).toEqual([]);
  });

  it('does not send read.mark for the current user own message', () => {
    render(<Harness userId={9} roomId={77} />);
    const [socket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() =>
      socket.dispatch({
        type: 'chat.message',
        message: { id: 23, sender_id: 9, created_at: '2026-08-19T08:00:00Z' },
      }),
    );
    expect(socket.sent).toEqual([]);
  });

  it('marks own messages read_by_all with a read count and others as read', () => {
    render(<Harness userId={9} roomId={77} />);
    const [socket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() => socket.dispatch({ type: 'read', message_ids: [10, 20], member_count: 4 }));
    const updater = callbacks.setMessages.mock.calls[0][0];
    expect(
      applyUpdater(updater, [
        { id: 10, sender: { id: 9 }, is_read: false, read_count: 0, read_by_all: false },
        { id: 20, sender: { id: 3 }, is_read: false, read_count: 0, read_by_all: false },
      ]),
    ).toEqual([
      { id: 10, sender: { id: 9 }, is_read: false, read_count: 3, read_by_all: true },
      { id: 20, sender: { id: 3 }, is_read: true, read_count: 0, read_by_all: false },
    ]);
  });

  it('uses a read count of 1 when member_count is missing', () => {
    render(<Harness userId={9} roomId={77} />);
    const [socket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() => socket.dispatch({ type: 'read', message_ids: [10] }));
    const updater = callbacks.setMessages.mock.calls[0][0];
    expect(
      applyUpdater(updater, [{ id: 10, sender: { id: 9 }, read_count: 0, read_by_all: false }]),
    ).toEqual([{ id: 10, sender: { id: 9 }, read_count: 1, read_by_all: true }]);
  });

  it('ignores empty read event sets', () => {
    render(<Harness userId={9} roomId={77} />);
    const [socket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() => socket.dispatch({ type: 'read' }));
    expect(callbacks.setMessages).not.toHaveBeenCalled();
  });

  it('applies message.updated reaction and favorite patches', () => {
    render(<Harness userId={9} roomId={77} />);
    const [socket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() => socket.dispatch({ type: 'message.updated', message_id: 22, reaction: '🔥' }));
    const updater = callbacks.setMessages.mock.calls[0][0];
    const result = applyUpdater(updater, [{ id: 22, reaction: null, is_favorite: false }]);
    expect(result[0].reaction).toBe('🔥');
    expect(result[0].my_reaction).toBe('🔥');
    expect(result[0].is_favorite).toBe(false);
  });

  it('forwards typing and presence events', () => {
    render(<Harness userId={9} roomId={77} />);
    const [socket] = mocks.getRealtimeSocket.mock.results.map((r) => r.value);
    act(() => socket.dispatch({ type: 'typing', user_id: 3 }));
    act(() => socket.dispatch({ type: 'presence', user_id: 3, online: true }));
    expect(callbacks.onTyping).toHaveBeenCalledWith({ type: 'typing', user_id: 3 });
    expect(callbacks.onPresence).toHaveBeenCalledWith({ type: 'presence', user_id: 3, online: true });
  });

  it('does nothing without a room or current user', () => {
    render(<Harness userId={null} roomId={77} />);
    render(<Harness userId={9} roomId={null} />);
    expect(mocks.getRealtimeSocket).not.toHaveBeenCalled();
  });

  it('releases the socket on unmount when the last listener is removed', () => {
    const { unmount } = render(<Harness userId={9} roomId={77} />);
    act(() => unmount());
    expect(mocks.releaseRealtimeSocket).toHaveBeenCalledWith('/ws/style-rooms/77/');
  });
});