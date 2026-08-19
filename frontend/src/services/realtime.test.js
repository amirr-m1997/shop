// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RealtimeSocket,
  getRealtimeSocket,
  releaseRealtimeSocket,
  wsUrl,
} from './realtime';

const OPEN = 1;
const CONNECTING = 0;

class MockWebSocket {
  static instances = [];
  static OPEN = OPEN;
  static CONNECTING = CONNECTING;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = CONNECTING;
    this.sent = [];
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    MockWebSocket.instances.push(this);
  }

  send(data) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ code: 1000, reason: '' });
  }
}

const lastInstance = () => MockWebSocket.instances[MockWebSocket.instances.length - 1];

const openLast = () => {
  const ws = lastInstance();
  ws.readyState = OPEN;
  if (ws.onopen) ws.onopen();
  return ws;
};

const messageLast = (payload) => {
  if (lastInstance().onmessage) lastInstance().onmessage({ data: JSON.stringify(payload) });
};

const closeLast = () => lastInstance().close();

beforeEach(() => {
  globalThis.WebSocket = MockWebSocket;
  MockWebSocket.instances.length = 0;
});

afterEach(() => {
  delete globalThis.WebSocket;
  vi.useRealTimers();
});

describe('wsUrl', () => {
  it('builds a ws:// URL for an http origin', () => {
    expect(wsUrl('/ws/chat')).toBe('ws://localhost:3000/ws/chat');
  });

  it('builds a wss:// URL for an https origin', () => {
    vi.stubGlobal('window', { location: { protocol: 'https:', host: 'shop.example.com' } });
    expect(wsUrl('/ws/chat')).toBe('wss://shop.example.com/ws/chat');
    vi.unstubAllGlobals();
  });
});

describe('RealtimeSocket lifecycle', () => {
  it('emits connecting then open and starts the heartbeat ping', () => {
    vi.useFakeTimers();
    const socket = new RealtimeSocket('/ws/chat');
    const statuses = [];
    socket.onStatus((status) => statuses.push(status));
    socket.connect();
    expect(statuses).toEqual(['connecting']);
    openLast();
    expect(statuses).toEqual(['connecting', 'open']);
    vi.advanceTimersByTime(30000);
    expect(lastInstance().sent).toEqual([JSON.stringify({ type: 'ping' })]);
  });

  it('does not open a second socket while one is open', () => {
    const socket = new RealtimeSocket('/ws/chat');
    socket.connect();
    openLast();
    socket.connect();
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('emits closed without opening a socket when WebSocket is unavailable', () => {
    delete globalThis.WebSocket;
    const socket = new RealtimeSocket('/ws/chat');
    const statuses = [];
    socket.onStatus((status) => statuses.push(status));
    socket.connect();
    expect(statuses).toEqual(['closed']);
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('schedules a reconnect when the WebSocket constructor throws', () => {
    vi.useFakeTimers();
    const attempts = vi.fn();
    globalThis.WebSocket = class {
      constructor() {
        attempts();
        throw new Error('connection refused');
      }
    };
    const socket = new RealtimeSocket('/ws/chat');
    socket.connect();
    expect(attempts).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(attempts).toHaveBeenCalledTimes(2);
  });
});

describe('RealtimeSocket messages', () => {
  it('parses incoming frames, skips pong, and dispatches to listeners', () => {
    const socket = new RealtimeSocket('/ws/chat');
    socket.connect();
    openLast();
    const received = [];
    socket.addListener((message) => received.push(message));
    messageLast({ type: 'chat.message', message: { id: 1 } });
    messageLast({ type: 'pong' });
    expect(received).toEqual([{ type: 'chat.message', message: { id: 1 } }]);
  });

  it('ignores malformed frames without dispatching', () => {
    const socket = new RealtimeSocket('/ws/chat');
    socket.connect();
    openLast();
    const received = [];
    socket.addListener((message) => received.push(message));
    if (lastInstance().onmessage) lastInstance().onmessage({ data: 'not-json' });
    expect(received).toEqual([]);
  });

  it('isolates listener errors', () => {
    const socket = new RealtimeSocket('/ws/chat');
    socket.connect();
    openLast();
    const received = [];
    socket.addListener(() => {
      throw new Error('listener boom');
    });
    socket.addListener((message) => received.push(message));
    expect(() => messageLast({ type: 'x' })).not.toThrow();
    expect(received).toEqual([{ type: 'x' }]);
  });

  it('send returns false when not open and true when open', () => {
    const socket = new RealtimeSocket('/ws/chat');
    expect(socket.send({ type: 'read.mark' })).toBe(false);
    socket.connect();
    expect(socket.send({ type: 'read.mark' })).toBe(false);
    openLast();
    expect(socket.send({ type: 'read.mark' })).toBe(true);
    expect(lastInstance().sent).toEqual([JSON.stringify({ type: 'read.mark' })]);
  });
});

describe('RealtimeSocket reconnect and close', () => {
  it('backs off exponentially for connections that never open', () => {
    vi.useFakeTimers();
    const socket = new RealtimeSocket('/ws/chat');
    socket.connect();
    [1000, 2000, 4000, 8000, 16000, 30000].forEach((delay) => {
      closeLast();
      vi.advanceTimersByTime(delay);
    });
    expect(MockWebSocket.instances).toHaveLength(7);
    closeLast();
    vi.advanceTimersByTime(29999);
    expect(MockWebSocket.instances).toHaveLength(7);
    vi.advanceTimersByTime(1);
    expect(MockWebSocket.instances).toHaveLength(8);
  });

  it('resets the backoff after a successful open', () => {
    vi.useFakeTimers();
    const socket = new RealtimeSocket('/ws/chat');
    socket.connect();
    closeLast();
    vi.advanceTimersByTime(1000);
    expect(MockWebSocket.instances).toHaveLength(2);
    openLast();
    closeLast();
    vi.advanceTimersByTime(1000);
    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it('close() stops heartbeat and prevents further reconnects', () => {
    vi.useFakeTimers();
    const socket = new RealtimeSocket('/ws/chat');
    socket.connect();
    openLast();
    socket.close();
    vi.advanceTimersByTime(60000);
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(lastInstance().sent).toEqual([]);
  });
});

describe('getRealtimeSocket / releaseRealtimeSocket', () => {
  it('returns a singleton socket per path', () => {
    const socket = getRealtimeSocket('/ws/chat');
    expect(getRealtimeSocket('/ws/chat')).toBe(socket);
    expect(getRealtimeSocket('/ws/other')).not.toBe(socket);
  });

  it('releaseRealtimeSocket closes and evicts the socket', () => {
    const socket = getRealtimeSocket('/ws/chat');
    releaseRealtimeSocket('/ws/chat');
    expect(socket.closedByUser).toBe(true);
    expect(getRealtimeSocket('/ws/chat')).not.toBe(socket);
  });
});