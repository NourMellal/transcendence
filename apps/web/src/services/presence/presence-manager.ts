import { appState, type AuthStateData } from '@/state';
import type { PresenceStatus } from '@/models/presence';
import { authEvents } from '@/modules/shared/utils/AuthEventEmitter';
import { WebSocketClient } from '@/modules/shared/services/WebSocketClient';

const DEFAULT_WS_PATH = '/api/presence/ws/socket.io';
const PRESENCE_SOCKET_KEY = '__transcendence_presence_socket';
const PRESENCE_MANAGER_KEY = '__transcendence_presence_manager';
const debugPresenceLogs = Boolean(import.meta.env?.DEV && import.meta.env?.VITE_DEBUG_WS === 'true');
const logPresenceWarning = (...args: Parameters<typeof console.warn>) => {
  if (debugPresenceLogs) {
    console.warn(...args);
  }
};

function getGlobalPresenceSocket(): WebSocketClient | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const scope = globalThis as Record<string, unknown>;
  const existing = scope[PRESENCE_SOCKET_KEY];
  if (existing instanceof WebSocketClient) {
    return existing;
  }

  const socket = new WebSocketClient(resolveWebSocketHost(), resolveWebSocketPath());
  scope[PRESENCE_SOCKET_KEY] = socket;
  return socket;
}

function resolveWebSocketHost(): string {
  const explicit = import.meta.env.VITE_WS_PRESENCE_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
  if (apiBase && /^https?:\/\//i.test(apiBase)) {
    return apiBase.replace(/\/?api\/?$/, '') || apiBase;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://api-gateway:3000';
}

function resolveWebSocketPath(): string {
  return import.meta.env.VITE_WS_PRESENCE_PATH?.trim() || DEFAULT_WS_PATH;
}

export class PresenceManager {
  private initialized = false;
  private lifecycleBound = false;
  private socket: WebSocketClient | null = null;
  private handlersRegistered = false;
  private connectPromise: Promise<void> | null = null;

  initialize(): void {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    this.initialized = true;
    appState.auth.subscribe((authState) => this.handleAuthChange(authState));
    authEvents.on('logout', () => {
      this.disconnect();
      appState.presence.set({});
    });
    this.handleAuthChange(appState.auth.get());
    this.bindLifecycleListeners();
  }

  private async handleAuthChange(authState: AuthStateData): Promise<void> {
    if (authState.isAuthenticated && authState.token && authState.user?.id) {
      await this.ensureSocket();
    } else {
      this.disconnect();
      appState.presence.set({});
    }
  }

  private async ensureSocket(): Promise<void> {
    if (!this.socket) {
      this.socket = getGlobalPresenceSocket();
      this.handlersRegistered = false;
    }

    if (!this.socket) {
      return;
    }

    if (!this.handlersRegistered) {
      this.registerSocketHandlers(this.socket);
      this.handlersRegistered = true;
    }

    const state = this.socket.getState();
    if (state === 'connected' || state === 'connecting') {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.socket
      .connect()
      .catch((error) => {
        logPresenceWarning('[PresenceManager] Failed to connect presence socket', error);
      })
      .finally(() => {
        this.connectPromise = null;
      });

    return this.connectPromise;
  }

  private registerSocketHandlers(client: WebSocketClient): void {
    client.on<{ userId: string }>('user_online', (payload) => {
      if (payload && typeof payload === 'object' && typeof payload.userId === 'string') {
        this.updatePresence(payload.userId, 'ONLINE');
      }
    });

    client.on<{ userId: string }>('user_offline', (payload) => {
      if (payload && typeof payload === 'object' && typeof payload.userId === 'string') {
        this.updatePresence(payload.userId, 'OFFLINE');
      }
    });
  }

  private updatePresence(userId: string, status: PresenceStatus): void {
    if (!userId) return;

    const currentMap = appState.presence.get();
    if (currentMap[userId] === status) {
      return;
    }

    appState.presence.set({
      ...currentMap,
      [userId]: status,
    });

    const auth = appState.auth.get();
    if (auth.user?.id === userId && auth.user.status !== status) {
      appState.auth.set({
        ...auth,
        user: {
          ...auth.user,
          status,
        },
      });
    }
  }

  private disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.handlersRegistered = false;
    }
  }

  private bindLifecycleListeners(): void {
    if (this.lifecycleBound || typeof window === 'undefined') {
      return;
    }

    window.addEventListener('pagehide', this.handleUnload);
    window.addEventListener('beforeunload', this.handleUnload);
    this.lifecycleBound = true;
  }

  private handleUnload = (): void => {
    this.disconnect();
  };

}

const scope = globalThis as Record<string, unknown>;
const existingManager = scope[PRESENCE_MANAGER_KEY];
const sharedManager = existingManager instanceof PresenceManager ? existingManager : new PresenceManager();
scope[PRESENCE_MANAGER_KEY] = sharedManager;

export const presenceManager = sharedManager;
