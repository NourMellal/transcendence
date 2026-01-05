import { io } from 'socket.io-client';

export type SocketEventHandler = (...args: unknown[]) => void;

export interface GameSocket {
  readonly connected: boolean;
  connect(): void;
  disconnect(reason?: string): void;
  on(event: string, handler: SocketEventHandler): void;
  emit(event: string, payload?: unknown): void;
  off(event: string, handler: SocketEventHandler): void;
  updateToken(token: string | null): void;
}

class SocketIOGameSocket implements GameSocket {
  private token: string | null = null;

  constructor(private readonly socket: ReturnType<typeof io>, token: string | null) {
    this.token = token;
    this.applyToken();
  }

  get connected(): boolean {
    return this.socket.connected;
  }

  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(reason?: string): void {
    this.socket.disconnect();
    if (reason) {
      try {
        this.socket.emit('client_disconnect', { reason });
      } catch {
        // ignore
      }
    }
  }

  emit(event: string, payload?: unknown): void {
    this.socket.emit(event, payload);
  }

  on(event: string, handler: SocketEventHandler): void {
    this.socket.on(event, handler);
  }

  off(event: string, handler: SocketEventHandler): void {
    this.socket.off(event, handler);
  }

  updateToken(token: string | null): void {
    this.token = token;
    this.applyToken();
  }

  private applyToken(): void {
    if (!this.socket?.io?.opts) {
      return;
    }
    const query = { ...(this.socket.io.opts.query ?? {}) };
    if (this.token) {
      query.token = this.token;
    } else {
      delete query.token;
    }
    this.socket.io.opts.query = query;
  }
}

export function createGameSocket(
  url: string,
  token: string | null,
  path?: string
): GameSocket {
  const socket = io(url, {
    transports: ['websocket'], // WebSocket only - faster, no polling overhead
    autoConnect: false,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 500,
    timeout: 5000,
    query: token ? { token } : undefined,
    ...(path ? { path } : {}),
  });

  return new SocketIOGameSocket(socket, token ?? null);
}
