import { appState } from '@/state';
import {
  createGameSocket,
  type GameSocket,
  type SocketEventHandler,
} from './game-socket.factory';
import type { WSConnectionState, WSEventHandler } from '../types/websocket.types';

type QueuedMessage = { event: string; payload: unknown };
type DeferredConnect = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
};

const wsLogsEnabled = Boolean(import.meta.env?.DEV && import.meta.env?.VITE_DEBUG_WS === 'true');
const wsLog = (...args: Parameters<typeof console.log>): void => {
  if (wsLogsEnabled) {
    console.log(...args);
  }
};
const wsWarn = (...args: Parameters<typeof console.warn>): void => {
  if (wsLogsEnabled) {
    console.warn(...args);
  }
};
const wsError = (...args: Parameters<typeof console.error>): void => {
  if (wsLogsEnabled) {
    console.error(...args);
  }
};

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
  private connectDeferred: DeferredConnect | null = null;
  private manualDisconnect = false;

  constructor(
    private url: string,
    private readonly wsPath?: string
  ) {
    // Initialize token from current auth state immediately
    this.token = appState.auth.get().token ?? null;
    
    // Subscribe to auth changes for future updates
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

    // Reset manual disconnect flag so reconnects are allowed on explicit connect()
    this.manualDisconnect = false;

    if (!this.url) {
      throw new Error('[WS] No WebSocket URL provided');
    }

    if (this.socket?.connected) {
      wsWarn('[WS] Already connected');
      return;
    }

    if (this.connectDeferred) {
      return this.connectDeferred.promise;
    }

    if (!this.socket) {
      this.socket = createGameSocket(this.url, this.token, this.wsPath);
      this.registerLifecycleEvents();
      // Attach any handlers that were registered before the socket existed
      this.handlers.forEach((_set, eventType) => this.attachSocketHandler(eventType));
    }

    this.connectionState = 'connecting';

    this.connectDeferred = this.createDeferredConnect();
    this.socket?.connect();
    return this.connectDeferred.promise;
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
      wsWarn(`[WS] Not connected, queuing message: ${eventType}`);
      this.messageQueue.push({ event: eventType, payload });
      return;
    }

    try {
      this.socket.emit(eventType, payload);
    } catch (error) {
      wsError(`[WS] Failed to send message '${eventType}':`, error);
    }
  }

  disconnect(): void {
    wsLog('[WS] Disconnecting...');
    this.manualDisconnect = true;
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
      wsLog('[WS] ✅ Connected');
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      this.flushMessageQueue();
      this.connectDeferred?.resolve();
      this.connectDeferred = null;
    });

    this.socket.on('disconnect', (...args: unknown[]) => {
      const [reasonArg] = args;
      const reason = typeof reasonArg === 'string' ? reasonArg : undefined;
      wsWarn('[WS] 🔌 Disconnected', reason);
      this.connectionState = 'disconnected';
      if (this.connectDeferred) {
        this.connectDeferred.reject(new Error(reason || 'socket disconnected'));
        this.connectDeferred = null;
      } else {
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (...args: unknown[]) => {
      const [errorArg] = args;
      const error = errorArg instanceof Error ? errorArg : new Error(String(errorArg ?? 'UNKNOWN_ERROR'));
      wsError('[WS] ❌ Connection error:', error);
      this.connectionState = 'error';
      if (this.connectDeferred) {
        this.connectDeferred.reject(error);
        this.connectDeferred = null;
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
          wsError(`[WS] Handler error for event '${eventType}':`, error);
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
    if (this.manualDisconnect) {
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      return;
    }
    if (this.reconnectTimeout || !this.url) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      wsError('[WS] ❌ Max reconnect attempts reached');
      this.connectionState = 'failed';
      return;
    }

    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * 2 ** (this.reconnectAttempts - 1), 30000);

    wsLog(
      `[WS] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect(this.url).catch((error) => {
        wsError('[WS] Reconnect failed:', error);
      });
    }, delay);
  }

  private flushMessageQueue(): void {
    if (!this.socket || !this.socket.connected || this.messageQueue.length === 0) {
      return;
    }

    wsLog(`[WS] Flushing ${this.messageQueue.length} queued messages`);

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

  private createDeferredConnect(): DeferredConnect {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }
}

const wsUrlFromEnv =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_GAME_URL?.trim()) || '';
const tournamentWsUrlFromEnv =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_TOURNAMENT_URL?.trim()) || '';
const apiBaseFromEnv =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL?.trim()) || '';
const browserOrigin =
  typeof window !== 'undefined' && typeof window.location?.origin === 'string'
    ? window.location.origin
    : '';

const defaultWsHost =
  wsUrlFromEnv ||
  browserOrigin ||
  (/^https?:\/\//i.test(apiBaseFromEnv)
    ? apiBaseFromEnv.replace(/\/?api$/, '')
    : 'http://api-gateway:3000');
const defaultWsPath =
  import.meta.env.VITE_WS_GAME_PATH || '/api/games/ws/socket.io';
const defaultTournamentWsPath =
  import.meta.env.VITE_WS_TOURNAMENT_PATH || '/api/tournaments/ws/socket.io';

export function createGameWebSocketClient(
  url: string = defaultWsHost,
  path: string = defaultWsPath
): WebSocketClient {
  return new WebSocketClient(url, path);
}

export const gameWS = new WebSocketClient(defaultWsHost, defaultWsPath);

export function createTournamentWebSocketClient(
  url: string = tournamentWsUrlFromEnv || defaultWsHost,
  path: string = defaultTournamentWsPath
): WebSocketClient {
  return new WebSocketClient(url, path);
}

export const tournamentWS = new WebSocketClient(
  tournamentWsUrlFromEnv || defaultWsHost,
  defaultTournamentWsPath
);
