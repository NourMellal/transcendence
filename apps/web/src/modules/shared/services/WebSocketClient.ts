import { appState } from '@/state';
import {
  createGameSocket,
  type GameSocket,
  type SocketEventHandler,
} from './game-socket.factory';
import type { WSConnectionState, WSEventHandler } from '../types/websocket.types';

type QueuedMessage = { event: string; payload: unknown };

export class WebSocketClient {
  private socket: GameSocket | null = null;
  private token: string | null = null;
  private handlers = new Map<string, Set<WSEventHandler>>();
  private socketListeners = new Map<string, SocketEventHandler>();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private messageQueue: QueuedMessage[] = [];
  private connectionState: WSConnectionState = 'disconnected';
  private reconnectTimeout: number | null = null;
  private connectPromise: { resolve: () => void; reject: (error: Error) => void } | null = null;

  constructor(private url: string) {
    appState.auth.subscribe((auth) => {
      this.token = auth.token ?? null;
      if (this.socket) {
        this.socket.updateToken(this.token);
      }
    });
  }

  async connect(url?: string): Promise<void> {
    if (url) {
      this.url = url;
    }

    if (!this.url) {
      throw new Error('[WS] No WebSocket URL provided');
    }

    if (this.socket?.connected) {
      console.warn('[WS] Already connected');
      return;
    }

    if (!this.socket) {
      this.socket = createGameSocket(this.url, this.token);
      this.registerLifecycleEvents();
    }

    this.connectionState = 'connecting';

    return new Promise((resolve, reject) => {
      this.connectPromise = {
        resolve: () => {
          this.connectPromise = null;
          resolve();
        },
        reject: (error: Error) => {
          this.connectPromise = null;
          reject(error);
        },
      };
      this.socket?.connect();
    });
  }

  on<T>(eventType: string, handler: WSEventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
      this.attachSocketHandler(eventType);
    }

    this.handlers.get(eventType)?.add(handler as WSEventHandler);

    return () => {
      const set = this.handlers.get(eventType);
      set?.delete(handler as WSEventHandler);
      if (set && set.size === 0) {
        this.handlers.delete(eventType);
        this.detachSocketHandler(eventType);
      }
    };
  }

  send<T>(eventType: string, payload: T): void {
    if (!this.socket || !this.socket.connected) {
      console.warn(`[WS] Not connected, queuing message: ${eventType}`);
      this.messageQueue.push({ event: eventType, payload });
      return;
    }

    try {
      this.socket.emit(eventType, payload);
    } catch (error) {
      console.error(`[WS] Failed to send message '${eventType}':`, error);
    }
  }

  disconnect(): void {
    console.log('[WS] Disconnecting...');
    this.handlers.forEach((_value, key) => this.detachSocketHandler(key));
    this.handlers.clear();
    this.messageQueue = [];
    this.clearReconnectTimer();

    if (this.socket) {
      this.socket.disconnect('client disconnect');
      this.socket = null;
    }

    this.connectionState = 'disconnected';
  }

  getState(): WSConnectionState {
    return this.connectionState;
  }

  private registerLifecycleEvents(): void {
    if (!this.socket) {
      return;
    }

    this.socket.on('connect', () => {
      console.log('[WS] ✅ Connected');
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      this.flushMessageQueue();
      this.connectPromise?.resolve();
    });

    this.socket.on('disconnect', (reason?: string) => {
      console.warn('[WS] 🔌 Disconnected', reason);
      this.connectionState = 'disconnected';
      if (this.connectPromise) {
        this.connectPromise.reject(new Error(reason || 'socket disconnected'));
        this.connectPromise = null;
      } else {
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[WS] ❌ Connection error:', error);
      this.connectionState = 'error';
      if (this.connectPromise) {
        this.connectPromise.reject(error);
        this.connectPromise = null;
      }
      this.attemptReconnect();
    });
  }

  private attachSocketHandler(eventType: string): void {
    if (!this.socket || this.socketListeners.has(eventType)) {
      return;
    }

    const handler: SocketEventHandler = (payload: unknown) => {
      const listeners = this.handlers.get(eventType);
      if (!listeners || listeners.size === 0) {
        return;
      }
      listeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          console.error(`[WS] Handler error for event '${eventType}':`, error);
        }
      });
    };

    this.socket.on(eventType, handler);
    this.socketListeners.set(eventType, handler);
  }

  private detachSocketHandler(eventType: string): void {
    const socketHandler = this.socketListeners.get(eventType);
    if (!socketHandler || !this.socket) {
      return;
    }
    this.socket.off(eventType, socketHandler);
    this.socketListeners.delete(eventType);
  }

  private attemptReconnect(): void {
    if (this.reconnectTimeout || !this.url) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] ❌ Max reconnect attempts reached');
      this.connectionState = 'failed';
      return;
    }

    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 30000);

    console.log(
      `[WS] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect(this.url).catch((error) => {
        console.error('[WS] Reconnect failed:', error);
      });
    }, delay);
  }

  private flushMessageQueue(): void {
    if (!this.socket || !this.socket.connected || this.messageQueue.length === 0) {
      return;
    }

    console.log(`[WS] Flushing ${this.messageQueue.length} queued messages`);

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (!message) {
        break;
      }
      this.socket.emit(message.event, message.payload);
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

export const gameWS = new WebSocketClient(
  import.meta.env.VITE_WS_GAME_URL || 'http://localhost:3001'
);
