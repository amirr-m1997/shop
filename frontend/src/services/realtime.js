const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const HEARTBEAT_MS = 30000;

export const wsUrl = (path) => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}${path}`;
};

const hasWebSocket = () => typeof WebSocket !== 'undefined';

export class RealtimeSocket {
  constructor(path) {
    this.path = path;
    this.ws = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.attempt = 0;
    this.closedByUser = false;
    this.heartbeat = null;
    this.reconnectTimer = null;
  }

  get listenerCount() {
    return this.listeners.size;
  }

  addListener(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  removeListener(fn) {
    this.listeners.delete(fn);
  }

  onStatus(fn) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  connect() {
    if (this.closedByUser) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    if (!hasWebSocket()) {
      this._emitStatus('closed');
      return;
    }
    this._emitStatus('connecting');
    let ws;
    try {
      ws = new WebSocket(wsUrl(this.path));
    } catch {
      this._scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.attempt = 0;
      this._emitStatus('open');
      this._startHeartbeat();
    };
    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (data.type === 'pong') return;
      this.listeners.forEach((fn) => {
        try {
          fn(data);
        } catch {
          // A listener error must never break the socket.
        }
      });
    };
    ws.onclose = () => {
      this._stopHeartbeat();
      this._emitStatus('closed');
      this._scheduleReconnect();
    };
    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        // The close handler schedules the reconnect.
      }
    };
  }

  _scheduleReconnect() {
    if (this.closedByUser || !hasWebSocket()) return;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.attempt, RECONNECT_MAX_MS);
    this.attempt += 1;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeat = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } catch {
          // The socket will reconnect on close.
        }
      }
    }, HEARTBEAT_MS);
  }

  _stopHeartbeat() {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  _emitStatus(status) {
    this.statusListeners.forEach((fn) => {
      try {
        fn(status);
      } catch {
        // Ignore listener errors.
      }
    });
  }

  send(obj) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify(obj));
      return true;
    } catch {
      return false;
    }
  }

  close() {
    this.closedByUser = true;
    clearTimeout(this.reconnectTimer);
    this._stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Already closing/closed.
      }
      this.ws = null;
    }
  }
}

const sockets = new Map();

export const getRealtimeSocket = (path) => {
  if (!sockets.has(path)) sockets.set(path, new RealtimeSocket(path));
  return sockets.get(path);
};

export const releaseRealtimeSocket = (path) => {
  const socket = sockets.get(path);
  if (socket) {
    socket.close();
    sockets.delete(path);
  }
};
