import { io } from 'socket.io-client';

/**
 * 🚨 TEMPORARY AUTH BYPASS FOR TESTING 🚨
 *
 * A hardcoded JWT token is currently used in createGameSocket() to test the real
 * game service without implementing the full login flow first.
 *
 * TODO: Remove the hardcodedToken once the login flow is complete and tokens are
 * properly stored in the auth state.
 *
 * Search for: "TEMPORARY HARDCODED JWT" to find and remove the hack.
 */

export type SocketEventHandler = (...args: any[]) => void;

export interface GameSocket {
  readonly connected: boolean;
  connect(): void;
  disconnect(reason?: string): void;
  emit(event: string, payload?: any): void;
  on(event: string, handler: SocketEventHandler): void;
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

  emit(event: string, payload?: any): void {
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

export function createGameSocket(url: string, token: string | null): GameSocket {
  // 🚨 TEMPORARY HARDCODED JWT FOR TESTING - REMOVE AFTER LOGIN IS IMPLEMENTED 🚨
  // Generated with: jwt.sign({ sub: 'demo-player-123', userId: 'demo-player-123', username: 'Demo Player' }, 'fallback-jwt-secret-for-development', { issuer: 'transcendence', expiresIn: '24h' })
  const hardcodedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vLXBsYXllci0xMjMiLCJ1c2VySWQiOiJkZW1vLXBsYXllci0xMjMiLCJ1c2VybmFtZSI6IkRlbW8gUGxheWVyIiwiaWF0IjoxNzY0MDc1NTIzLCJleHAiOjE3NjQxNjE5MjMsImlzcyI6InRyYW5zY2VuZGVuY2UifQ.k5Dd2mg0R-KQd3gYmyKZGBDz9vQsXuCC6g-AM-R0LR0';
  const effectiveToken = token || hardcodedToken;

  const socket = io(url, {
    transports: ['websocket'],
    autoConnect: false,
    forceNew: true,
    reconnection: false,
    query: { token: effectiveToken },
  });

  return new SocketIOGameSocket(socket, effectiveToken);
}
